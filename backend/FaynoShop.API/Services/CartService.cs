using FaynoShop.API.Constants;
using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Cart;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Models;
using FaynoShop.API.Security;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FaynoShop.API.Services;

public sealed class CartService : ICartService
{
    private static readonly CartDto EmptyCart = new([], 0, 0m);

    private readonly AppDbContext _db;

    public CartService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<CartDto> GetCartAsync(
        string sessionId,
        int? userId,
        CancellationToken cancellationToken)
    {
        ValidateSessionId(sessionId);

        var cart = await FindCartAsync(sessionId, userId, cancellationToken);
        if (cart is null)
        {
            return EmptyCart;
        }

        return await BuildCartDtoAsync(cart.Id, cancellationToken);
    }

    public async Task<CartDto> UpdateItemQuantityAsync(
        string sessionId,
        int? userId,
        int cartItemId,
        UpdateCartItemRequest request,
        CancellationToken cancellationToken)
    {
        ValidateSessionId(sessionId);

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var cart = await FindCartAsync(sessionId, userId, cancellationToken)
            ?? throw new NotFoundException("Позицію кошика не знайдено.");

        var line = await _db.CartItems
            .FirstOrDefaultAsync(
                i => i.Id == cartItemId && i.CartId == cart.Id,
                cancellationToken)
            ?? throw new NotFoundException("Позицію кошика не знайдено.");

        // Lock product so concurrent stock changes cannot allow an oversell on quantity update.
        var product = await _db.Products
            .FromSql($"SELECT * FROM products WHERE id = {line.ProductId} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);

        if (product is null)
        {
            throw new NotFoundException("Позицію кошика не знайдено.");
        }

        if (!product.IsActive)
        {
            throw new BadRequestException("Товар недоступний.");
        }

        var maxQuantity = Math.Min(product.StockQuantity, CartLimits.MaxLineQuantity);
        if (maxQuantity < 1 || request.Quantity > maxQuantity)
        {
            throw new BadRequestException("Недостатньо товару на складі.");
        }

        line.Quantity = request.Quantity;
        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await BuildCartDtoAsync(cart.Id, cancellationToken);
    }

    public async Task<CartDto> RemoveItemAsync(
        string sessionId,
        int? userId,
        int cartItemId,
        CancellationToken cancellationToken)
    {
        ValidateSessionId(sessionId);

        var cart = await FindCartAsync(sessionId, userId, cancellationToken)
            ?? throw new NotFoundException("Позицію кошика не знайдено.");

        var deleted = await _db.CartItems
            .Where(i => i.Id == cartItemId && i.CartId == cart.Id)
            .ExecuteDeleteAsync(cancellationToken);

        if (deleted == 0)
        {
            throw new NotFoundException("Позицію кошика не знайдено.");
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return await BuildCartDtoAsync(cart.Id, cancellationToken);
    }

    public async Task<CartDto> ClearCartAsync(
        string sessionId,
        int? userId,
        CancellationToken cancellationToken)
    {
        ValidateSessionId(sessionId);

        var cart = await FindCartAsync(sessionId, userId, cancellationToken);
        if (cart is null)
        {
            return EmptyCart;
        }

        await _db.CartItems
            .Where(i => i.CartId == cart.Id)
            .ExecuteDeleteAsync(cancellationToken);

        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return EmptyCart;
    }

    public async Task<MergeCartResponse> MergeGuestCartAsync(
        int userId,
        string sessionId,
        CancellationToken cancellationToken)
    {
        ValidateSessionId(sessionId);

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var guestCart = await _db.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.SessionId == sessionId, cancellationToken);

        var userCart = await _db.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (guestCart is null)
        {
            var countOnly = userCart is null
                ? 0
                : userCart.Items.Sum(i => i.Quantity);
            await transaction.CommitAsync(cancellationToken);
            return new MergeCartResponse(countOnly);
        }

        // Guest cart already belongs to this user — detach old session id and return.
        if (guestCart.UserId == userId)
        {
            RotateSessionId(guestCart);
            guestCart.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new MergeCartResponse(guestCart.Items.Sum(i => i.Quantity));
        }

        // Never steal a cart already owned by another account (session-id takeover).
        if (guestCart.UserId is not null)
        {
            var countOnly = userCart is null
                ? 0
                : userCart.Items.Sum(i => i.Quantity);
            await transaction.CommitAsync(cancellationToken);
            return new MergeCartResponse(countOnly);
        }

        // No existing user cart: claim the guest cart and rotate session so the
        // pre-login header can no longer address this cart as a guest.
        if (userCart is null || userCart.Id == guestCart.Id)
        {
            guestCart.UserId = userId;
            RotateSessionId(guestCart);
            guestCart.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new MergeCartResponse(guestCart.Items.Sum(i => i.Quantity));
        }

        // Merge guest lines into user cart, then remove guest cart.
        var productIds = guestCart.Items.Select(i => i.ProductId).Distinct().ToList();
        var stocks = await _db.Products
            .AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.StockQuantity, cancellationToken);

        foreach (var guestLine in guestCart.Items.ToList())
        {
            var stock = stocks.GetValueOrDefault(guestLine.ProductId, 0);
            var userLine = userCart.Items.FirstOrDefault(i => i.ProductId == guestLine.ProductId);

            if (userLine is null)
            {
                var qty = CapLineQuantity(guestLine.Quantity, stock);
                if (qty <= 0)
                {
                    continue;
                }

                userCart.Items.Add(new CartItem
                {
                    CartId = userCart.Id,
                    ProductId = guestLine.ProductId,
                    Quantity = qty
                });
            }
            else
            {
                var capped = CapLineQuantity(userLine.Quantity + guestLine.Quantity, stock);
                if (capped <= 0)
                {
                    userCart.Items.Remove(userLine);
                    _db.CartItems.Remove(userLine);
                }
                else
                {
                    userLine.Quantity = capped;
                }
            }
        }

        _db.CartItems.RemoveRange(guestCart.Items);
        _db.Carts.Remove(guestCart);
        userCart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var itemCount = await _db.CartItems
            .Where(i => i.CartId == userCart.Id)
            .SumAsync(i => (int?)i.Quantity, cancellationToken) ?? 0;

        await transaction.CommitAsync(cancellationToken);
        return new MergeCartResponse(itemCount);
    }

    public async Task<AddCartItemResponse> AddItemAsync(
        string sessionId,
        int? userId,
        AddCartItemRequest request,
        CancellationToken cancellationToken)
    {
        ValidateSessionId(sessionId);

        var quantityToAdd = request.Quantity ?? 1;

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        // Lock product row for the transaction so concurrent adds cannot oversell stock.
        var product = await _db.Products
            .FromSql($"SELECT * FROM products WHERE id = {request.ProductId} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);

        // Same client-facing message for missing and inactive — avoid product-ID existence oracle.
        if (product is null || !product.IsActive)
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        if (product.StockQuantity <= 0)
        {
            throw new BadRequestException("Товару немає в наявності.");
        }

        var cart = await GetOrCreateCartAsync(sessionId, userId, cancellationToken);
        var line = await GetOrCreateLineAsync(cart, product, quantityToAdd, cancellationToken);

        var maxQuantity = Math.Min(product.StockQuantity, CartLimits.MaxLineQuantity);
        if (line.Quantity > maxQuantity)
        {
            throw new BadRequestException("Недостатньо товару на складі.");
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var itemCount = await _db.CartItems
            .Where(i => i.CartId == cart.Id)
            .SumAsync(i => i.Quantity, cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return new AddCartItemResponse(line.Id, product.Id, line.Quantity, itemCount);
    }

    /// <summary>
    /// After merge, the authoritative cart is the user cart; guests use session id.
    /// Guests never see carts already claimed by a user (prevents session takeover).
    /// Authenticated buyers never receive another user's cart via a leaked session id.
    /// </summary>
    private async Task<Cart?> FindCartAsync(
        string sessionId,
        int? userId,
        CancellationToken cancellationToken)
    {
        if (userId is int uid)
        {
            var userCart = await _db.Carts
                .FirstOrDefaultAsync(c => c.UserId == uid, cancellationToken);
            if (userCart is not null)
            {
                return userCart;
            }

            // Unclaimed guest cart only — never open another account's cart by session.
            return await _db.Carts
                .FirstOrDefaultAsync(
                    c => c.SessionId == sessionId && c.UserId == null,
                    cancellationToken);
        }

        // Guest: session must still be anonymous. Claimed carts are auth-only.
        return await _db.Carts
            .FirstOrDefaultAsync(
                c => c.SessionId == sessionId && c.UserId == null,
                cancellationToken);
    }

    private async Task<CartDto> BuildCartDtoAsync(int cartId, CancellationToken cancellationToken)
    {
        var rows = await _db.CartItems
            .AsNoTracking()
            .Where(i => i.CartId == cartId)
            .OrderBy(i => i.Id)
            .Select(i => new
            {
                i.Id,
                i.ProductId,
                i.Quantity,
                i.Product.Name,
                i.Product.Slug,
                CategoryName = i.Product.Category.Name,
                i.Product.ImageUrl,
                i.Product.Price,
                i.Product.StockQuantity,
                i.Product.IsActive
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(r =>
            {
                var lineTotal = r.Price * r.Quantity;
                return new CartItemDto(
                    r.Id,
                    r.ProductId,
                    r.Name,
                    r.Slug,
                    r.CategoryName,
                    MediaUrlGuard.Sanitize(r.ImageUrl),
                    r.Price,
                    r.Quantity,
                    lineTotal,
                    r.StockQuantity,
                    r.IsActive);
            })
            .ToList();

        return new CartDto(
            items,
            items.Sum(i => i.Quantity),
            items.Sum(i => i.LineTotal));
    }

    private async Task<CartItem> GetOrCreateLineAsync(
        Cart cart,
        Product product,
        int quantityToAdd,
        CancellationToken cancellationToken)
    {
        var maxQuantity = Math.Min(product.StockQuantity, CartLimits.MaxLineQuantity);

        var line = await _db.CartItems
            .FirstOrDefaultAsync(
                i => i.CartId == cart.Id && i.ProductId == product.Id,
                cancellationToken);

        if (line is not null)
        {
            var remainingCapacity = maxQuantity - line.Quantity;
            if (remainingCapacity <= 0 || quantityToAdd > remainingCapacity)
            {
                throw new BadRequestException("Недостатньо товару на складі.");
            }

            line.Quantity += quantityToAdd;
            return line;
        }

        if (quantityToAdd > maxQuantity)
        {
            throw new BadRequestException("Недостатньо товару на складі.");
        }

        line = new CartItem
        {
            CartId = cart.Id,
            ProductId = product.Id,
            Quantity = quantityToAdd
        };
        _db.CartItems.Add(line);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
            return line;
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Concurrent insert for the same cart+product — reload and increment the winner.
            _db.Entry(line).State = EntityState.Detached;
            line = await _db.CartItems
                .FirstOrDefaultAsync(
                    i => i.CartId == cart.Id && i.ProductId == product.Id,
                    cancellationToken);

            if (line is null)
            {
                throw;
            }

            var remainingCapacity = maxQuantity - line.Quantity;
            if (remainingCapacity <= 0 || quantityToAdd > remainingCapacity)
            {
                throw new BadRequestException("Недостатньо товару на складі.");
            }

            line.Quantity += quantityToAdd;
            return line;
        }
    }

    /// <summary>
    /// Resolves the active cart (user cart after auth/merge, else session), or creates one.
    /// </summary>
    private async Task<Cart> GetOrCreateCartAsync(
        string sessionId,
        int? userId,
        CancellationToken cancellationToken)
    {
        var cart = await FindCartAsync(sessionId, userId, cancellationToken);
        if (cart is not null)
        {
            // Bind ownership on first authenticated use of an unclaimed session cart.
            if (userId is int uid && cart.UserId is null)
            {
                cart.UserId = uid;
            }

            return cart;
        }

        // Guest header reused after claim would hit the unique session index — mint a free id.
        if (userId is null
            && await _db.Carts.AnyAsync(c => c.SessionId == sessionId, cancellationToken))
        {
            throw new BadRequestException(
                "Сесію кошика вже використано. Оновіть сторінку та спробуйте знову.");
        }

        var now = DateTime.UtcNow;
        cart = new Cart
        {
            SessionId = sessionId,
            UserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Carts.Add(cart);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
            return cart;
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Concurrent create for the same session — reload the winner (prefer user cart).
            _db.Entry(cart).State = EntityState.Detached;
            cart = await FindCartAsync(sessionId, userId, cancellationToken);

            if (cart is null)
            {
                throw;
            }

            if (userId is int uid && cart.UserId is null)
            {
                cart.UserId = uid;
            }

            return cart;
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        return ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
    }

    /// <summary>Caps line qty to min(stock, MaxLineQuantity); 0 stock → 0 (drop line).</summary>
    private static int CapLineQuantity(int quantity, int stockQuantity)
    {
        if (quantity <= 0 || stockQuantity <= 0)
        {
            return 0;
        }

        return Math.Min(quantity, Math.Min(stockQuantity, CartLimits.MaxLineQuantity));
    }

    /// <summary>
    /// Detach the pre-auth guest header from a claimed cart so it cannot be reused anonymously.
    /// </summary>
    private static void RotateSessionId(Cart cart)
    {
        cart.SessionId = Guid.NewGuid().ToString("D");
    }

    private static void ValidateSessionId(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            throw new BadRequestException(
                $"Заголовок {CartSessionHeaders.SessionId} є обов'язковим.");
        }

        if (sessionId.Length > CartSessionHeaders.MaxLength)
        {
            throw new BadRequestException(
                $"Заголовок {CartSessionHeaders.SessionId} не може перевищувати {CartSessionHeaders.MaxLength} символів.");
        }

        // Require a UUID so clients cannot use short/guessable session identifiers.
        if (!Guid.TryParseExact(sessionId, "D", out _))
        {
            throw new BadRequestException(
                $"Заголовок {CartSessionHeaders.SessionId} має бути UUID (формат 8-4-4-4-12).");
        }
    }
}

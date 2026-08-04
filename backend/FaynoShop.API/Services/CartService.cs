using FaynoShop.API.Constants;
using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Cart;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Localization;
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
        string locale,
        CancellationToken cancellationToken)
    {
        ValidateSessionId(sessionId);

        var cart = await FindCartAsync(sessionId, userId, cancellationToken);
        if (cart is null)
        {
            return EmptyCart;
        }

        return await BuildCartDtoAsync(cart.Id, locale, cancellationToken);
    }

    public async Task<CartDto> UpdateItemQuantityAsync(
        string sessionId,
        int? userId,
        int cartItemId,
        UpdateCartItemRequest request,
        string locale,
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

        var variant = await _db.ProductVariants
            .FromSql($"SELECT * FROM product_variants WHERE id = {line.VariantId} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);

        if (variant is null)
        {
            throw new NotFoundException("Позицію кошика не знайдено.");
        }

        var product = await _db.Products
            .FromSql($"SELECT * FROM products WHERE id = {variant.ProductId} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);

        if (product is null || !product.IsActive || !product.IsAvailable || !variant.IsActive)
        {
            throw new BadRequestException("Товар недоступний.");
        }

        if (request.Quantity > CartLimits.MaxLineQuantity)
        {
            throw new BadRequestException(
                $"Кількість має бути від 1 до {CartLimits.MaxLineQuantity}.");
        }

        line.Quantity = request.Quantity;
        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await BuildCartDtoAsync(cart.Id, locale, cancellationToken);
    }

    public async Task<CartDto> RemoveItemAsync(
        string sessionId,
        int? userId,
        int cartItemId,
        string locale,
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

        return await BuildCartDtoAsync(cart.Id, locale, cancellationToken);
    }

    public async Task<CartDto> ClearCartAsync(
        string sessionId,
        int? userId,
        string locale,
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

        if (guestCart.UserId == userId)
        {
            RotateSessionId(guestCart);
            guestCart.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new MergeCartResponse(guestCart.Items.Sum(i => i.Quantity));
        }

        if (guestCart.UserId is not null)
        {
            var countOnly = userCart is null
                ? 0
                : userCart.Items.Sum(i => i.Quantity);
            await transaction.CommitAsync(cancellationToken);
            return new MergeCartResponse(countOnly);
        }

        if (userCart is null || userCart.Id == guestCart.Id)
        {
            guestCart.UserId = userId;
            RotateSessionId(guestCart);
            guestCart.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new MergeCartResponse(guestCart.Items.Sum(i => i.Quantity));
        }

        foreach (var guestLine in guestCart.Items.ToList())
        {
            var userLine = userCart.Items.FirstOrDefault(i => i.VariantId == guestLine.VariantId);

            if (userLine is null)
            {
                var qty = CapLineQuantity(guestLine.Quantity);
                if (qty <= 0)
                {
                    continue;
                }

                userCart.Items.Add(new CartItem
                {
                    CartId = userCart.Id,
                    VariantId = guestLine.VariantId,
                    Quantity = qty
                });
            }
            else
            {
                var capped = CapLineQuantity(userLine.Quantity + guestLine.Quantity);
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

        var variant = await _db.ProductVariants
            .FromSql($"SELECT * FROM product_variants WHERE id = {request.VariantId} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);

        // Same client-facing message for missing / inactive — avoid existence oracle.
        if (variant is null || !variant.IsActive)
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        var product = await _db.Products
            .FromSql($"SELECT * FROM products WHERE id = {variant.ProductId} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);

        if (product is null || !product.IsActive || !product.IsAvailable)
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        var cart = await GetOrCreateCartAsync(sessionId, userId, cancellationToken);
        var line = await GetOrCreateLineAsync(cart, variant.Id, quantityToAdd, cancellationToken);

        if (line.Quantity > CartLimits.MaxLineQuantity)
        {
            throw new BadRequestException(
                $"Кількість має бути від 1 до {CartLimits.MaxLineQuantity}.");
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var itemCount = await _db.CartItems
            .Where(i => i.CartId == cart.Id)
            .SumAsync(i => i.Quantity, cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return new AddCartItemResponse(line.Id, variant.Id, product.Id, line.Quantity, itemCount);
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

            return await _db.Carts
                .FirstOrDefaultAsync(
                    c => c.SessionId == sessionId && c.UserId == null,
                    cancellationToken);
        }

        return await _db.Carts
            .FirstOrDefaultAsync(
                c => c.SessionId == sessionId && c.UserId == null,
                cancellationToken);
    }

    private async Task<CartDto> BuildCartDtoAsync(
        int cartId,
        string locale,
        CancellationToken cancellationToken)
    {
        var useEn = LocalizedContent.IsEnglish(locale);

        var rows = await _db.CartItems
            .AsNoTracking()
            .Where(i => i.CartId == cartId)
            .OrderBy(i => i.Id)
            .Select(i => new
            {
                i.Id,
                i.VariantId,
                ProductId = i.Variant.ProductId,
                i.Quantity,
                Name = useEn && i.Variant.Product.NameEn != null && i.Variant.Product.NameEn != ""
                    ? i.Variant.Product.NameEn
                    : i.Variant.Product.NameUk,
                i.Variant.Product.Slug,
                CategoryName = useEn && i.Variant.Product.Category.NameEn != null && i.Variant.Product.Category.NameEn != ""
                    ? i.Variant.Product.Category.NameEn
                    : i.Variant.Product.Category.NameUk,
                i.Variant.Product.ImageUrl,
                i.Variant.Weight,
                i.Variant.WeightUnit,
                i.Variant.Price,
                IsActive = i.Variant.Product.IsActive && i.Variant.IsActive,
                i.Variant.Product.IsAvailable
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(r =>
            {
                var lineTotal = r.Price * r.Quantity;
                return new CartItemDto(
                    r.Id,
                    r.VariantId,
                    r.ProductId,
                    r.Name,
                    r.Slug,
                    r.CategoryName,
                    MediaUrlGuard.Sanitize(r.ImageUrl),
                    r.Weight,
                    r.WeightUnit,
                    r.Price,
                    r.Quantity,
                    lineTotal,
                    r.IsActive,
                    r.IsAvailable);
            })
            .ToList();

        return new CartDto(
            items,
            items.Sum(i => i.Quantity),
            items.Sum(i => i.LineTotal));
    }

    private async Task<CartItem> GetOrCreateLineAsync(
        Cart cart,
        int variantId,
        int quantityToAdd,
        CancellationToken cancellationToken)
    {
        const int maxQuantity = CartLimits.MaxLineQuantity;

        var line = await _db.CartItems
            .FirstOrDefaultAsync(
                i => i.CartId == cart.Id && i.VariantId == variantId,
                cancellationToken);

        if (line is not null)
        {
            var remainingCapacity = maxQuantity - line.Quantity;
            if (remainingCapacity <= 0 || quantityToAdd > remainingCapacity)
            {
                throw new BadRequestException(
                    $"Кількість має бути від 1 до {CartLimits.MaxLineQuantity}.");
            }

            line.Quantity += quantityToAdd;
            return line;
        }

        if (quantityToAdd > maxQuantity)
        {
            throw new BadRequestException(
                $"Кількість має бути від 1 до {CartLimits.MaxLineQuantity}.");
        }

        line = new CartItem
        {
            CartId = cart.Id,
            VariantId = variantId,
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
            _db.Entry(line).State = EntityState.Detached;
            line = await _db.CartItems
                .FirstOrDefaultAsync(
                    i => i.CartId == cart.Id && i.VariantId == variantId,
                    cancellationToken);

            if (line is null)
            {
                throw;
            }

            var remainingCapacity = maxQuantity - line.Quantity;
            if (remainingCapacity <= 0 || quantityToAdd > remainingCapacity)
            {
                throw new BadRequestException(
                    $"Кількість має бути від 1 до {CartLimits.MaxLineQuantity}.");
            }

            line.Quantity += quantityToAdd;
            return line;
        }
    }

    private async Task<Cart> GetOrCreateCartAsync(
        string sessionId,
        int? userId,
        CancellationToken cancellationToken)
    {
        var cart = await FindCartAsync(sessionId, userId, cancellationToken);
        if (cart is not null)
        {
            if (userId is int uid && cart.UserId is null)
            {
                cart.UserId = uid;
            }

            return cart;
        }

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

    private static int CapLineQuantity(int quantity)
    {
        if (quantity <= 0)
        {
            return 0;
        }

        return Math.Min(quantity, CartLimits.MaxLineQuantity);
    }

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

        if (!Guid.TryParseExact(sessionId, "D", out _))
        {
            throw new BadRequestException(
                $"Заголовок {CartSessionHeaders.SessionId} має бути UUID (формат 8-4-4-4-12).");
        }
    }
}

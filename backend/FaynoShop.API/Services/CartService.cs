using FaynoShop.API.Constants;
using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Cart;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FaynoShop.API.Services;

public sealed class CartService : ICartService
{
    private readonly AppDbContext _db;

    public CartService(AppDbContext db)
    {
        _db = db;
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

        // Guest cart already belongs to this user — just ensure link and return.
        if (guestCart.UserId == userId)
        {
            await transaction.CommitAsync(cancellationToken);
            return new MergeCartResponse(guestCart.Items.Sum(i => i.Quantity));
        }

        // No existing user cart: claim the guest cart.
        if (userCart is null || userCart.Id == guestCart.Id)
        {
            guestCart.UserId = userId;
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
                var qty = Math.Min(guestLine.Quantity, Math.Max(stock, 0));
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
                var merged = userLine.Quantity + guestLine.Quantity;
                userLine.Quantity = stock > 0 ? Math.Min(merged, stock) : merged;
            }
        }

        _db.CartItems.RemoveRange(guestCart.Items);
        _db.Carts.Remove(guestCart);
        userCart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var itemCount = await _db.CartItems
            .Where(i => i.CartId == userCart.Id)
            .SumAsync(i => i.Quantity, cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return new MergeCartResponse(itemCount);
    }

    public async Task<AddCartItemResponse> AddItemAsync(
        string sessionId,
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

        var cart = await GetOrCreateCartAsync(sessionId, cancellationToken);
        var line = await GetOrCreateLineAsync(cart, product, quantityToAdd, cancellationToken);

        if (line.Quantity > product.StockQuantity)
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

    private async Task<CartItem> GetOrCreateLineAsync(
        Cart cart,
        Product product,
        int quantityToAdd,
        CancellationToken cancellationToken)
    {
        var line = await _db.CartItems
            .FirstOrDefaultAsync(
                i => i.CartId == cart.Id && i.ProductId == product.Id,
                cancellationToken);

        if (line is not null)
        {
            var remainingCapacity = product.StockQuantity - line.Quantity;
            if (remainingCapacity <= 0)
            {
                throw new BadRequestException("Недостатньо товару на складі.");
            }

            // Cap at remaining capacity so concurrent or oversized requests cannot oversell.
            var maxAddable = Math.Min(product.StockQuantity, remainingCapacity);
            if (quantityToAdd > maxAddable)
            {
                throw new BadRequestException("Недостатньо товару на складі.");
            }

            line.Quantity += quantityToAdd;
            return line;
        }

        if (quantityToAdd > product.StockQuantity)
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

            var remainingCapacity = product.StockQuantity - line.Quantity;
            if (remainingCapacity <= 0)
            {
                throw new BadRequestException("Недостатньо товару на складі.");
            }

            var maxAddable = Math.Min(product.StockQuantity, remainingCapacity);
            if (quantityToAdd > maxAddable)
            {
                throw new BadRequestException("Недостатньо товару на складі.");
            }

            line.Quantity += quantityToAdd;
            return line;
        }
    }

    private async Task<Cart> GetOrCreateCartAsync(string sessionId, CancellationToken cancellationToken)
    {
        var cart = await _db.Carts
            .FirstOrDefaultAsync(c => c.SessionId == sessionId, cancellationToken);

        if (cart is not null)
        {
            return cart;
        }

        var now = DateTime.UtcNow;
        cart = new Cart
        {
            SessionId = sessionId,
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
            // Concurrent create for the same session — reload the winner.
            _db.Entry(cart).State = EntityState.Detached;
            cart = await _db.Carts
                .FirstOrDefaultAsync(c => c.SessionId == sessionId, cancellationToken);

            if (cart is null)
            {
                throw;
            }

            return cart;
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        return ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
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

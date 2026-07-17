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

    public async Task<AddCartItemResponse> AddItemAsync(
        string sessionId,
        AddCartItemRequest request,
        CancellationToken cancellationToken)
    {
        ValidateSessionId(sessionId);

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        // Lock product row for the transaction so concurrent adds cannot oversell stock.
        var product = await _db.Products
            .FromSql($"SELECT * FROM products WHERE id = {request.ProductId} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);

        if (product is null)
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        if (!product.IsActive)
        {
            throw new BadRequestException("Товар недоступний.");
        }

        if (product.StockQuantity <= 0)
        {
            throw new BadRequestException("Товару немає в наявності.");
        }

        var cart = await GetOrCreateCartAsync(sessionId, cancellationToken);
        var line = await GetOrCreateLineAsync(cart, product, cancellationToken);

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
        CancellationToken cancellationToken)
    {
        var line = await _db.CartItems
            .FirstOrDefaultAsync(
                i => i.CartId == cart.Id && i.ProductId == product.Id,
                cancellationToken);

        if (line is not null)
        {
            line.Quantity += 1;
            return line;
        }

        line = new CartItem
        {
            CartId = cart.Id,
            ProductId = product.Id,
            Quantity = 1
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

            line.Quantity += 1;
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

using System.Security.Cryptography;
using System.Text;
using FaynoShop.API.Constants;
using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Orders;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Models;
using FaynoShop.API.Security;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FaynoShop.API.Services;

public interface IOrderService
{
    Task<IReadOnlyList<OrderListItemDto>> GetMyOrdersAsync(
        int userId,
        int take,
        CancellationToken cancellationToken);

    Task<PlaceOrderResponse> PlaceOrderAsync(
        string sessionId,
        int? userId,
        PlaceOrderRequest request,
        CancellationToken cancellationToken);

    Task<OrderDetailDto> GetByIdAsync(
        int id,
        string? confirmationToken,
        int? userId,
        CancellationToken cancellationToken);
}

public sealed class OrderService : IOrderService
{
    private const int MaxOrderNumberAttempts = 5;
    private const int MaxConfirmationTokenLength = 128;

    private readonly AppDbContext _db;
    private readonly ILogger<OrderService> _logger;

    public OrderService(AppDbContext db, ILogger<OrderService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<IReadOnlyList<OrderListItemDto>> GetMyOrdersAsync(
        int userId,
        int take,
        CancellationToken cancellationToken)
    {
        take = Math.Clamp(take, 1, 50);

        return await _db.Orders
            .AsNoTracking()
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .Take(take)
            .Select(o => new OrderListItemDto(
                o.Id,
                o.OrderNumber,
                o.CreatedAt,
                o.Items.Sum(i => i.Quantity),
                o.TotalAmount,
                o.Status.ToString()))
            .ToListAsync(cancellationToken);
    }

    public async Task<PlaceOrderResponse> PlaceOrderAsync(
        string sessionId,
        int? userId,
        PlaceOrderRequest request,
        CancellationToken cancellationToken)
    {
        ValidateSessionId(sessionId);

        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();
        var phone = request.Phone.Trim();
        var email = request.Email.Trim().ToLowerInvariant();
        // Compose address server-side — do not trust free-form client DeliveryAddress.
        var deliveryAddress = $"{request.CityName.Trim()}, {request.BranchLabel.Trim()}";
        if (deliveryAddress.Length > 500)
        {
            throw new BadRequestException("Адреса доставки занадто довга.");
        }

        var comment = string.IsNullOrWhiteSpace(request.Comment)
            ? null
            : request.Comment.Trim();
        var recipientName = $"{firstName} {lastName}";

        if (recipientName.Length > 200)
        {
            throw new BadRequestException("Ім'я отримувача занадто довге.");
        }

        var confirmationPlain = TokenHash.CreateOpaqueToken();
        var confirmationHash = TokenHash.Sha256Hex(confirmationPlain);

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var cart = await FindCartAsync(sessionId, userId, cancellationToken);
        if (cart is null)
        {
            throw new BadRequestException("Кошик порожній.");
        }

        // Serialize concurrent place attempts on the same cart (prevents double-order / double stock cut).
        cart = await _db.Carts
            .FromSql($"SELECT * FROM carts WHERE id = {cart.Id} FOR UPDATE")
            .FirstOrDefaultAsync(cancellationToken);

        if (cart is null)
        {
            throw new BadRequestException("Кошик порожній.");
        }

        var lines = await _db.CartItems
            .Where(i => i.CartId == cart.Id)
            .OrderBy(i => i.Id)
            .ToListAsync(cancellationToken);

        if (lines.Count == 0)
        {
            throw new BadRequestException("Кошик порожній.");
        }

        // Lock products in ascending id order to avoid deadlocks under concurrent place.
        var productIds = lines.Select(l => l.ProductId).Distinct().OrderBy(id => id).ToList();
        var productsById = new Dictionary<int, Product>(productIds.Count);

        foreach (var productId in productIds)
        {
            var product = await _db.Products
                .FromSql($"SELECT * FROM products WHERE id = {productId} FOR UPDATE")
                .FirstOrDefaultAsync(cancellationToken);

            if (product is null)
            {
                throw new BadRequestException("Один або кілька товарів у кошику більше недоступні.");
            }

            productsById[productId] = product;
        }

        var orderItems = new List<OrderItem>(lines.Count);
        decimal totalAmount = 0m;
        var now = DateTime.UtcNow;

        foreach (var line in lines)
        {
            var product = productsById[line.ProductId];

            if (!product.IsActive)
            {
                throw new BadRequestException(
                    $"Товар «{product.Name}» недоступний. Видаліть його з кошика та спробуйте знову.");
            }

            if (product.StockQuantity < line.Quantity)
            {
                throw new BadRequestException(
                    $"Недостатньо товару «{product.Name}» на складі.");
            }

            product.StockQuantity -= line.Quantity;
            product.UpdatedAt = now;

            var unitPrice = product.Price;
            orderItems.Add(new OrderItem
            {
                ProductId = product.Id,
                Quantity = line.Quantity,
                UnitPrice = unitPrice
            });
            totalAmount += unitPrice * line.Quantity;
        }

        var (prefix, nextSeq) = await ResolveNextOrderSequenceAsync(cancellationToken);
        var order = new Order
        {
            OrderNumber = FormatOrderNumber(prefix, nextSeq),
            Status = OrderStatus.Pending,
            TotalAmount = totalAmount,
            RecipientName = recipientName,
            Phone = phone,
            Email = email,
            DeliveryAddress = deliveryAddress,
            Comment = comment,
            UserId = userId,
            ConfirmationTokenHash = confirmationHash,
            CreatedAt = now,
            UpdatedAt = now,
            Items = orderItems
        };

        _db.Orders.Add(order);

        // PostgreSQL aborts the whole transaction on unique violation unless we use a savepoint.
        for (var attempt = 1; ; attempt++)
        {
            var savepoint = $"place_order_number_{attempt}";
            await transaction.CreateSavepointAsync(savepoint, cancellationToken);
            try
            {
                await _db.SaveChangesAsync(cancellationToken);
                await transaction.ReleaseSavepointAsync(savepoint, cancellationToken);
                break;
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex) && attempt < MaxOrderNumberAttempts)
            {
                await transaction.RollbackToSavepointAsync(savepoint, cancellationToken);
                nextSeq++;
                order.OrderNumber = FormatOrderNumber(prefix, nextSeq);
                _logger.LogWarning(
                    ex,
                    "Order number collision on attempt {Attempt}; retrying with {OrderNumber}",
                    attempt,
                    order.OrderNumber);
            }
        }

        await _db.CartItems
            .Where(i => i.CartId == cart.Id)
            .ExecuteDeleteAsync(cancellationToken);

        cart.UpdatedAt = now;
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        _logger.LogInformation("Order {OrderId} placed ({OrderNumber})", order.Id, order.OrderNumber);

        return new PlaceOrderResponse(
            order.Id,
            order.OrderNumber,
            order.Status.ToString(),
            order.TotalAmount,
            order.CreatedAt,
            confirmationPlain);
    }

    public async Task<OrderDetailDto> GetByIdAsync(
        int id,
        string? confirmationToken,
        int? userId,
        CancellationToken cancellationToken)
    {
        var order = await _db.Orders
            .AsNoTracking()
            .Where(o => o.Id == id)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                Status = o.Status.ToString(),
                o.TotalAmount,
                o.CreatedAt,
                o.RecipientName,
                o.Phone,
                o.Email,
                o.DeliveryAddress,
                o.Comment,
                o.UserId,
                o.ConfirmationTokenHash,
                Items = o.Items
                    .OrderBy(i => i.Id)
                    .Select(i => new
                    {
                        i.ProductId,
                        ProductName = i.Product.Name,
                        i.Quantity,
                        i.UnitPrice,
                        Category = (string?)i.Product.Category.Name,
                        ImageUrl = i.Product.ImageUrl
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        // Same not-found for missing id, missing/invalid token, or unauthorized — no existence oracle.
        if (order is null || !CanAccessOrder(order.UserId, order.ConfirmationTokenHash, confirmationToken, userId))
        {
            throw new NotFoundException("Замовлення не знайдено.");
        }

        var items = order.Items
            .Select(i => new OrderDetailItemDto(
                i.ProductId,
                i.ProductName,
                i.Quantity,
                i.UnitPrice,
                i.UnitPrice * i.Quantity,
                i.Category,
                MediaUrlGuard.Sanitize(i.ImageUrl)))
            .ToList();

        return new OrderDetailDto(
            order.Id,
            order.OrderNumber,
            order.Status,
            order.TotalAmount,
            order.CreatedAt,
            order.RecipientName,
            order.Phone,
            order.Email,
            order.DeliveryAddress,
            order.Comment,
            items);
    }

    private static bool CanAccessOrder(
        int? orderUserId,
        string storedHash,
        string? confirmationToken,
        int? requesterUserId)
    {
        if (requesterUserId is int uid && orderUserId == uid)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(confirmationToken)
            || confirmationToken.Length > MaxConfirmationTokenLength)
        {
            return false;
        }

        var providedHash = TokenHash.Sha256Hex(confirmationToken.Trim());
        return FixedTimeEqualsUtf8(providedHash, storedHash);
    }

    private static bool FixedTimeEqualsUtf8(string a, string b)
    {
        var aBytes = Encoding.UTF8.GetBytes(a);
        var bBytes = Encoding.UTF8.GetBytes(b);
        return aBytes.Length == bBytes.Length
            && CryptographicOperations.FixedTimeEquals(aBytes, bBytes);
    }

    private async Task<(string Prefix, int NextSeq)> ResolveNextOrderSequenceAsync(
        CancellationToken cancellationToken)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"FN-{year}-";

        var last = await _db.Orders
            .AsNoTracking()
            .Where(o => o.OrderNumber.StartsWith(prefix))
            .OrderByDescending(o => o.OrderNumber)
            .Select(o => o.OrderNumber)
            .FirstOrDefaultAsync(cancellationToken);

        var next = 1;
        if (last is not null
            && last.Length > prefix.Length
            && int.TryParse(last.AsSpan(prefix.Length), out var parsed)
            && parsed >= 0)
        {
            next = parsed + 1;
        }

        return (prefix, next);
    }

    private static string FormatOrderNumber(string prefix, int seq) =>
        $"{prefix}{seq:D4}";

    /// <summary>
    /// Same resolution rules as cart: user cart preferred when authenticated;
    /// guests only see unclaimed session carts.
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

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

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

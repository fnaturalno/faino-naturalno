using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Orders;
using Microsoft.EntityFrameworkCore;

namespace FaynoShop.API.Services;

public interface IOrderService
{
    Task<IReadOnlyList<OrderListItemDto>> GetMyOrdersAsync(
        int userId,
        int take,
        CancellationToken cancellationToken);
}

public sealed class OrderService : IOrderService
{
    private readonly AppDbContext _db;

    public OrderService(AppDbContext db)
    {
        _db = db;
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
}

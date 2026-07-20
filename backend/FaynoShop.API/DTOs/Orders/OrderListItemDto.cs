namespace FaynoShop.API.DTOs.Orders;

public sealed record OrderListItemDto(
    int Id,
    string OrderNumber,
    DateTime CreatedAt,
    int ItemCount,
    decimal TotalAmount,
    string Status);

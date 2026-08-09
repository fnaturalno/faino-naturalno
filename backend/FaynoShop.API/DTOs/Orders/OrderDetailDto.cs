namespace FaynoShop.API.DTOs.Orders;

public sealed record OrderDetailDto(
    int Id,
    string OrderNumber,
    string Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    string RecipientName,
    string Phone,
    string Email,
    string DeliveryMethod,
    string DeliveryAddress,
    string? Comment,
    IReadOnlyList<OrderDetailItemDto> Items);

public sealed record OrderDetailItemDto(
    int ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal,
    decimal Weight,
    string WeightUnit,
    string? Category,
    string? ImageUrl);

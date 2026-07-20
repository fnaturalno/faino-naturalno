namespace FaynoShop.API.DTOs.Orders;

public sealed record AdminOrderListResponse(
    IReadOnlyList<AdminOrderListItemDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public sealed record AdminOrderListItemDto(
    int Id,
    string OrderNumber,
    DateTime CreatedAt,
    string RecipientName,
    string Phone,
    string City,
    decimal TotalAmount,
    string Status);

namespace FaynoShop.API.DTOs.Orders;

public sealed record PlaceOrderResponse(
    int Id,
    string OrderNumber,
    string Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    /// <summary>Opaque one-time capability for guest confirmation GET (pass as ?token=).</summary>
    string ConfirmationToken);

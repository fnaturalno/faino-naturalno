namespace FaynoShop.API.DTOs.Cart;

/// <summary>
/// Full cart payload for GET /api/cart and mutation responses that refresh the UI.
/// Prices and stock are live from Product (not a historical snapshot).
/// </summary>
public sealed record CartDto(
    IReadOnlyList<CartItemDto> Items,
    int ItemCount,
    decimal Subtotal);

/// <summary>One cart line with display fields and live product availability.</summary>
public sealed record CartItemDto(
    int CartItemId,
    int ProductId,
    string Name,
    string Slug,
    string Category,
    string? ImageUrl,
    decimal Price,
    int Quantity,
    decimal LineTotal,
    int StockQuantity,
    bool IsActive);

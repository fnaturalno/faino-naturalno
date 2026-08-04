namespace FaynoShop.API.DTOs.Cart;

/// <summary>
/// Full cart payload for GET /api/cart and mutation responses that refresh the UI.
/// Prices are live from ProductVariant (not a historical snapshot).
/// </summary>
public sealed record CartDto(
    IReadOnlyList<CartItemDto> Items,
    int ItemCount,
    decimal Subtotal);

/// <summary>One cart line with display fields and live product/variant status.</summary>
public sealed record CartItemDto(
    int CartItemId,
    int VariantId,
    int ProductId,
    string Name,
    string Slug,
    string Category,
    string? ImageUrl,
    decimal Weight,
    string WeightUnit,
    decimal Price,
    int Quantity,
    decimal LineTotal,
    bool IsActive,
    bool IsAvailable = true);

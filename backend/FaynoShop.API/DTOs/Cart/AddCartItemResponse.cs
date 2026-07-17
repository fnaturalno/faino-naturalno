namespace FaynoShop.API.DTOs.Cart;

/// <summary>
/// Result of POST /api/cart/items. <see cref="ItemCount"/> is the sum of line
/// quantities — enough for the header cart badge.
/// </summary>
public sealed record AddCartItemResponse(
    int CartItemId,
    int ProductId,
    int Quantity,
    int ItemCount);

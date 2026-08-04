namespace FaynoShop.API.DTOs.Cart;

/// <summary>
/// Updates an existing cart line quantity.
/// Server enforces 1‥CartLimits.MaxLineQuantity; use DELETE to remove a line.
/// </summary>
public sealed class UpdateCartItemRequest
{
    public int Quantity { get; init; }
}

namespace FaynoShop.API.DTOs.Cart;

/// <summary>
/// Updates an existing cart line quantity.
/// Server enforces 1‥min(stock, 12); use DELETE to remove a line.
/// </summary>
public sealed class UpdateCartItemRequest
{
    public int Quantity { get; init; }
}

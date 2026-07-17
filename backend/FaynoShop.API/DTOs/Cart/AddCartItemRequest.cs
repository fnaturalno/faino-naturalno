namespace FaynoShop.API.DTOs.Cart;

/// <summary>
/// Adds one unit of a product to the anonymous session cart.
/// Quantity is always treated as 1 by the catalog contract; omit it or send 1.
/// </summary>
public sealed class AddCartItemRequest
{
    public int ProductId { get; init; }

    /// <summary>Optional; must be omitted or 1. Catalog always adds exactly one unit.</summary>
    public int? Quantity { get; init; }
}

namespace FaynoShop.API.DTOs.Cart;

/// <summary>
/// Adds units of a product to the anonymous session cart.
/// Catalog typically sends quantity 1 (or omits it); the product page may send 1–N from the stepper.
/// </summary>
public sealed class AddCartItemRequest
{
    public int ProductId { get; init; }

    /// <summary>
    /// Units to add. Defaults to 1 when omitted.
    /// Server enforces stock: addable amount cannot exceed remaining capacity (stock − current line qty).
    /// </summary>
    public int? Quantity { get; init; }
}

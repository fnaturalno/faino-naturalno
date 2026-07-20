namespace FaynoShop.API.Constants;

/// <summary>Shared cart quantity rules (aligned with product stepper and PUT /api/cart/items).</summary>
public static class CartLimits
{
    /// <summary>Maximum units per cart line (also enforced as min(stock, this)).</summary>
    public const int MaxLineQuantity = 12;
}

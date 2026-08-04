namespace FaynoShop.API.DTOs.Products;

/// <summary>
/// Priced packaging row in create/update product payload.
/// Only entries with a price are sent; weight/unit must match predefined presets.
/// </summary>
public sealed record SaveProductVariantRequest(
    decimal Weight,
    string WeightUnit,
    decimal Price,
    bool IsActive = true);

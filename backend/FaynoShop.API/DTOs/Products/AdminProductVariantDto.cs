namespace FaynoShop.API.DTOs.Products;

/// <summary>Existing DB variant for admin edit (may be inactive).</summary>
public sealed record AdminProductVariantDto(
    int Id,
    decimal Weight,
    string WeightUnit,
    decimal Price,
    bool IsActive,
    int SortOrder);

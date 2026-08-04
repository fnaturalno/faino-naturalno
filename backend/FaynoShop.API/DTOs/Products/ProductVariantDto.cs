namespace FaynoShop.API.DTOs.Products;

/// <summary>Active variant on the public product detail page.</summary>
public sealed record ProductVariantDto(
    int Id,
    decimal Weight,
    string WeightUnit,
    decimal Price,
    int SortOrder);

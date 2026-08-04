namespace FaynoShop.API.DTOs.Products;

/// <summary>
/// Catalog / similar / featured card. Price comes from the min-price active variant.
/// </summary>
public sealed record ProductDto(
    int Id,
    string Name,
    string Slug,
    string? ShortDescription,
    decimal? PriceFrom,
    int? CheapestVariantId,
    IReadOnlyList<ProductVariantDto> Variants,
    string? ImageUrl,
    bool IsFeatured,
    DateTime CreatedAt,
    int CategoryId,
    string CategoryName,
    string CategorySlug,
    bool IsAvailable = true,
    bool IsActive = true);

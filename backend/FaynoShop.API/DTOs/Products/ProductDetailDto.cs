namespace FaynoShop.API.DTOs.Products;

/// <summary>
/// Full active product detail for GET /api/products/{slug}, including similar cards.
/// </summary>
public sealed record ProductDetailDto(
    int Id,
    string Name,
    string Slug,
    string? ShortDescription,
    string? Description,
    string? ImageUrl,
    string[] ImageUrls,
    bool IsFeatured,
    bool IsAvailable,
    DateTime CreatedAt,
    int CategoryId,
    string CategoryName,
    string CategorySlug,
    int? Strength,
    IReadOnlyList<ProductVariantDto> Variants,
    IReadOnlyList<ProductDto> SimilarProducts);

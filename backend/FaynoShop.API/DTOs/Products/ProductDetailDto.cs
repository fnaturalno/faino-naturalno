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
    decimal Price,
    decimal? OldPrice,
    string? ImageUrl,
    string[] ImageUrls,
    decimal? Weight,
    string? WeightUnit,
    int StockQuantity,
    bool IsFeatured,
    DateTime CreatedAt,
    int CategoryId,
    string CategoryName,
    string CategorySlug,
    IReadOnlyList<ProductDto> SimilarProducts);

namespace FaynoShop.API.DTOs.Products;

public sealed record AdminProductDto(
    int Id,
    string NameUk,
    string? NameEn,
    string Slug,
    int CategoryId,
    string CategoryName,
    string CategorySlug,
    string? ShortDescriptionUk,
    string? ShortDescriptionEn,
    string? DescriptionUk,
    string? DescriptionEn,
    decimal? PriceFrom,
    string? ImageUrl,
    string[] ImageUrls,
    bool IsActive,
    bool IsFeatured,
    bool IsAvailable,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<AdminProductVariantDto> Variants);

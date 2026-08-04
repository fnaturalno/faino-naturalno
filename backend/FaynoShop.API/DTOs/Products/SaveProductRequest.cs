namespace FaynoShop.API.DTOs.Products;

public sealed record SaveProductRequest(
    string NameUk,
    string? NameEn,
    string? Slug,
    int CategoryId,
    string? ShortDescriptionUk,
    string? ShortDescriptionEn,
    string? DescriptionUk,
    string? DescriptionEn,
    string? ImageUrl,
    IReadOnlyList<string>? ImageUrls,
    bool IsActive,
    bool IsFeatured,
    bool IsAvailable,
    IReadOnlyList<SaveProductVariantRequest>? Variants);

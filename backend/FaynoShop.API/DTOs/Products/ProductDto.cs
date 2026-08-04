namespace FaynoShop.API.DTOs.Products;

public sealed record ProductDto(
    int Id,
    string Name,
    string Slug,
    string? ShortDescription,
    decimal Price,
    decimal? OldPrice,
    string? ImageUrl,
    decimal? Weight,
    string? WeightUnit,
    bool IsFeatured,
    DateTime CreatedAt,
    int CategoryId,
    string CategoryName,
    string CategorySlug,
    bool IsActive = true);

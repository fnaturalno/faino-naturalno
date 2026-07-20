namespace FaynoShop.API.DTOs.Products;

public sealed record AdminProductDto(
    int Id,
    string Name,
    string Slug,
    int CategoryId,
    string CategoryName,
    string CategorySlug,
    string? ShortDescription,
    string? Description,
    decimal Price,
    decimal? OldPrice,
    decimal? Weight,
    string? WeightUnit,
    int StockQuantity,
    string? ImageUrl,
    string[] ImageUrls,
    bool IsActive,
    bool IsFeatured,
    DateTime CreatedAt,
    DateTime UpdatedAt);

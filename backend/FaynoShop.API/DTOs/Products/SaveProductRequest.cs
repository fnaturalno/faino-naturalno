namespace FaynoShop.API.DTOs.Products;

public sealed record SaveProductRequest(
    string Name,
    string? Slug,
    int CategoryId,
    string? ShortDescription,
    string? Description,
    decimal Price,
    decimal? OldPrice,
    decimal? Weight,
    string? WeightUnit,
    int StockQuantity,
    string? ImageUrl,
    IReadOnlyList<string>? ImageUrls,
    bool IsActive,
    bool IsFeatured);

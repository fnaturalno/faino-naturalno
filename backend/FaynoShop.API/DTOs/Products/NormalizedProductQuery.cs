namespace FaynoShop.API.DTOs.Products;

public sealed record NormalizedProductQuery(
    IReadOnlyList<string> CategorySlugs,
    string? Search,
    decimal? MinPrice,
    decimal? MaxPrice,
    int Page,
    int PageSize,
    string SortBy);

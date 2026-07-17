using FaynoShop.API.DTOs.Products;

namespace FaynoShop.API.Services;

/// <summary>
/// Normalizes product list query params per catalog spec:
/// invalid values → defaults; min/max price swap; pageSize catalog default 9.
/// </summary>
public static class ProductQueryNormalizer
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 9;
    public const int MaxPageSize = 48;
    public const int MaxSearchLength = 100;
    public const int MaxCategorySlugs = 20;
    public const int MaxCategorySlugLength = 100;
    public const string DefaultSortBy = "popular";

    private static readonly HashSet<string> AllowedSort = new(StringComparer.OrdinalIgnoreCase)
    {
        "popular",
        "price-asc",
        "price-desc",
        "new"
    };

    public static NormalizedProductQuery Normalize(ProductQuery query)
    {
        var slugs = ParseCategorySlugs(query.Category);

        var search = string.IsNullOrWhiteSpace(query.Search)
            ? null
            : Truncate(query.Search.Trim(), MaxSearchLength);

        decimal? minPrice = query.MinPrice is < 0 ? null : query.MinPrice;
        decimal? maxPrice = query.MaxPrice is < 0 ? null : query.MaxPrice;

        if (minPrice.HasValue && maxPrice.HasValue && minPrice > maxPrice)
        {
            (minPrice, maxPrice) = (maxPrice, minPrice);
        }

        var page = query.Page is > 0 ? query.Page.Value : DefaultPage;

        // Catalog contract defaults to 9; accept 1..MaxPageSize, otherwise fall back to 9.
        var pageSize = query.PageSize is >= 1 and <= MaxPageSize
            ? query.PageSize.Value
            : DefaultPageSize;

        var sortBy = !string.IsNullOrWhiteSpace(query.SortBy) && AllowedSort.Contains(query.SortBy)
            ? query.SortBy.Trim().ToLowerInvariant()
            : DefaultSortBy;

        return new NormalizedProductQuery(
            slugs,
            search,
            minPrice,
            maxPrice,
            page,
            pageSize,
            sortBy);
    }

    private static IReadOnlyList<string> ParseCategorySlugs(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return [];
        }

        return category
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(s => s.Length is > 0 and <= MaxCategorySlugLength)
            .Select(s => s.ToLowerInvariant())
            .Distinct(StringComparer.Ordinal)
            .Take(MaxCategorySlugs)
            .ToArray();
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}

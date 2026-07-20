namespace FaynoShop.API.DTOs.Products;

/// <summary>
/// Raw query parameters for GET /api/products.
/// Invalid values are normalized to safe defaults (see <see cref="ProductQueryNormalizer"/>).
/// </summary>
public sealed class ProductQuery
{
    /// <summary>Optional comma-separated category slugs (OR match).</summary>
    public string? Category { get; set; }

    /// <summary>Optional text search (name / short description). Catalog UI does not expose a search field.</summary>
    public string? Search { get; set; }

    public decimal? MinPrice { get; set; }

    public decimal? MaxPrice { get; set; }

    public int? Page { get; set; }

    /// <summary>Catalog contract uses 9; invalid values fall back to 9.</summary>
    public int? PageSize { get; set; }

    /// <summary>popular | price-asc | price-desc | new. Defaults to popular.</summary>
    public string? SortBy { get; set; }

    /// <summary>Honored only for administrators.</summary>
    public bool IncludeInactive { get; set; }
}

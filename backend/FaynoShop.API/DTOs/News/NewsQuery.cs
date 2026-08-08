namespace FaynoShop.API.DTOs.News;

/// <summary>
/// Raw query parameters for GET /api/news.
/// Invalid values fall back to safe defaults (pageSize default 9).
/// </summary>
public sealed class NewsQuery
{
    public int? Page { get; set; }

    /// <summary>Public list uses 9; invalid values fall back to 9.</summary>
    public int? PageSize { get; set; }
}

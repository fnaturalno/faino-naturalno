namespace FaynoShop.API.DTOs.News;

public sealed class AdminNewsQuery
{
    public string? Search { get; set; }

    /// <summary>Optional filter: true = published only, false = drafts only, null = all.</summary>
    public bool? IsPublished { get; set; }

    public int? Page { get; set; }

    public int? PageSize { get; set; }
}

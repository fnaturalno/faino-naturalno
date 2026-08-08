namespace FaynoShop.API.DTOs.News;

public sealed record NewsListItemDto(
    int Id,
    string Slug,
    string Title,
    string? Excerpt,
    string? CoverImageUrl,
    DateTime PublishedAt,
    bool IsFeatured);

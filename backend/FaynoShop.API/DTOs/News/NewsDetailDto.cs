namespace FaynoShop.API.DTOs.News;

public sealed record NewsDetailDto(
    int Id,
    string Slug,
    string Title,
    string? Excerpt,
    string Body,
    string? CoverImageUrl,
    DateTime PublishedAt,
    bool IsFeatured);

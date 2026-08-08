namespace FaynoShop.API.DTOs.News;

public sealed record AdminNewsListItemDto(
    int Id,
    string TitleUk,
    string Slug,
    bool IsPublished,
    bool IsFeatured,
    DateTime? PublishedAt,
    DateTime UpdatedAt);

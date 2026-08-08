namespace FaynoShop.API.DTOs.News;

/// <summary>Bilingual news payload for admin create/update and GET-by-id.</summary>
public sealed record AdminNewsDto(
    int Id,
    string TitleUk,
    string? TitleEn,
    string Slug,
    string? ExcerptUk,
    string? ExcerptEn,
    string BodyUk,
    string? BodyEn,
    string? CoverImageUrl,
    bool IsPublished,
    bool IsFeatured,
    DateTime? PublishedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt);

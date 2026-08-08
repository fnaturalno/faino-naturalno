namespace FaynoShop.API.DTOs.News;

public sealed record SaveNewsPostRequest(
    string TitleUk,
    string? TitleEn,
    string? Slug,
    string? ExcerptUk,
    string? ExcerptEn,
    string? BodyUk,
    string? BodyEn,
    string? CoverImageUrl,
    bool IsPublished,
    bool IsFeatured,
    DateTime? PublishedAt);

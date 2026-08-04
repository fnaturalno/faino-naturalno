namespace FaynoShop.API.DTOs.Categories;

/// <summary>
/// Bilingual category payload for admin create/update and admin tree/GET-by-id.
/// <see cref="Name"/> is the admin list display label (always <see cref="NameUk"/>).
/// </summary>
public sealed record AdminCategoryDto(
    int Id,
    string Name,
    string NameUk,
    string? NameEn,
    string Slug,
    int? ParentId,
    int SortOrder,
    int ActiveProductCount,
    string? DescriptionUk,
    string? DescriptionEn,
    IReadOnlyList<AdminCategoryDto> Children);

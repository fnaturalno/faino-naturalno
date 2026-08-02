namespace FaynoShop.API.DTOs.Categories;

public sealed record CategoryDto(
    int Id,
    string Name,
    string Slug,
    int? ParentId,
    int SortOrder,
    int ActiveProductCount,
    string? Description,
    IReadOnlyList<CategoryDto> Children);

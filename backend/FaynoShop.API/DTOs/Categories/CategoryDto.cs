namespace FaynoShop.API.DTOs.Categories;

public sealed record CategoryDto(
    int Id,
    string Name,
    string Slug,
    int SortOrder,
    int ActiveProductCount);

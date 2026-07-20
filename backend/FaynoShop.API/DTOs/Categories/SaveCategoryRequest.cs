namespace FaynoShop.API.DTOs.Categories;

public sealed record SaveCategoryRequest(
    string Name,
    string? Slug,
    string? Description);

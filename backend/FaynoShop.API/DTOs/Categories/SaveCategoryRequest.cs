namespace FaynoShop.API.DTOs.Categories;

public sealed record SaveCategoryRequest(
    string NameUk,
    string? NameEn,
    string? Slug,
    string? DescriptionUk,
    string? DescriptionEn,
    int? ParentId);

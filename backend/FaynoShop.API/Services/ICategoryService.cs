using FaynoShop.API.DTOs.Categories;

namespace FaynoShop.API.Services;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(
        bool includeInactiveProductCount,
        string locale,
        CancellationToken cancellationToken);

    /// <summary>
    /// Full category tree with UK/EN fields for admin forms (include inactive product counts).
    /// </summary>
    Task<IReadOnlyList<AdminCategoryDto>> GetAdminTreeAsync(CancellationToken cancellationToken);

    Task<AdminCategoryDto> GetForAdminAsync(int id, CancellationToken cancellationToken);

    Task<AdminCategoryDto> CreateAsync(SaveCategoryRequest request, CancellationToken cancellationToken);

    Task<AdminCategoryDto> UpdateAsync(int id, SaveCategoryRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);
}

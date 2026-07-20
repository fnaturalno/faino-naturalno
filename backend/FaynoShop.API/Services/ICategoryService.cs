using FaynoShop.API.DTOs.Categories;

namespace FaynoShop.API.Services;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(
        bool includeInactiveProductCount,
        CancellationToken cancellationToken);

    Task<CategoryDto> CreateAsync(SaveCategoryRequest request, CancellationToken cancellationToken);

    Task<CategoryDto> UpdateAsync(int id, SaveCategoryRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);
}

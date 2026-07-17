using FaynoShop.API.DTOs.Categories;

namespace FaynoShop.API.Services;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken);
}

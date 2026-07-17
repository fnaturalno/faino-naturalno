using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Categories;
using Microsoft.EntityFrameworkCore;

namespace FaynoShop.API.Services;

public sealed class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;

    public CategoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken)
    {
        return await _db.Categories
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Id)
            .Select(c => new CategoryDto(
                c.Id,
                c.Name,
                c.Slug,
                c.SortOrder,
                c.Products.Count(p => p.IsActive)))
            .ToListAsync(cancellationToken);
    }
}

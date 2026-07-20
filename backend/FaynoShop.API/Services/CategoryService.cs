using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Categories;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FaynoShop.API.Services;

public sealed class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;

    public CategoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(
        bool includeInactiveProductCount,
        CancellationToken cancellationToken)
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
                includeInactiveProductCount
                    ? c.Products.Count()
                    : c.Products.Count(p => p.IsActive),
                c.Description))
            .ToListAsync(cancellationToken);
    }

    public async Task<CategoryDto> CreateAsync(
        SaveCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var slug = await ResolveSlugAsync(request.Slug, request.Name, null, cancellationToken);
        var category = new Category
        {
            Name = request.Name.Trim(),
            Slug = slug,
            Description = TrimOrNull(request.Description),
            SortOrder = await _db.Categories.MaxAsync(c => (int?)c.SortOrder, cancellationToken) ?? 0
        };
        category.SortOrder++;

        _db.Categories.Add(category);
        await _db.SaveChangesAsync(cancellationToken);
        return new CategoryDto(category.Id, category.Name, category.Slug, category.SortOrder, 0, category.Description);
    }

    public async Task<CategoryDto> UpdateAsync(
        int id,
        SaveCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException("Категорію не знайдено.");

        category.Name = request.Name.Trim();
        category.Slug = await ResolveSlugAsync(request.Slug, request.Name, id, cancellationToken);
        category.Description = TrimOrNull(request.Description);
        await _db.SaveChangesAsync(cancellationToken);

        var count = await _db.Products.CountAsync(p => p.CategoryId == id, cancellationToken);
        return new CategoryDto(category.Id, category.Name, category.Slug, category.SortOrder, count, category.Description);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException("Категорію не знайдено.");

        if (await _db.Products.AnyAsync(p => p.CategoryId == id, cancellationToken))
        {
            throw new ConflictException("Неможливо видалити категорію, поки в ній є товари.");
        }

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<string> ResolveSlugAsync(
        string? requestedSlug,
        string name,
        int? currentCategoryId,
        CancellationToken cancellationToken)
    {
        var source = string.IsNullOrWhiteSpace(requestedSlug) ? name : requestedSlug;
        var slug = SlugGenerator.From(source, 100);
        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new BadRequestException("Не вдалося сформувати коректний slug категорії.");
        }

        var duplicate = await _db.Categories.AnyAsync(
            c => c.Slug == slug && c.Id != currentCategoryId,
            cancellationToken);
        if (duplicate)
        {
            throw new ConflictException("Категорія з таким URL (slug) уже існує.");
        }

        return slug;
    }

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

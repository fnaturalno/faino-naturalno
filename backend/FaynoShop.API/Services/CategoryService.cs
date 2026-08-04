using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Categories;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Localization;
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
        string locale,
        CancellationToken cancellationToken)
    {
        var useEn = LocalizedContent.IsEnglish(locale);

        var categories = await _db.Categories
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Id)
            .Select(c => new CategoryDto(
                c.Id,
                useEn && c.NameEn != null && c.NameEn != "" ? c.NameEn : c.NameUk,
                c.Slug,
                c.ParentId,
                c.SortOrder,
                0,
                useEn && c.DescriptionEn != null && c.DescriptionEn != ""
                    ? c.DescriptionEn
                    : c.DescriptionUk,
                Array.Empty<CategoryDto>()))
            .ToListAsync(cancellationToken);

        var categoryIds = categories.Select(c => c.Id).ToArray();
        var productCounts = await _db.Products
            .AsNoTracking()
            .Where(p => categoryIds.Contains(p.CategoryId) &&
                (includeInactiveProductCount || p.IsActive))
            .GroupBy(p => p.CategoryId)
            .Select(group => new { CategoryId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, cancellationToken);

        var childrenByParent = categories
            .Where(c => c.ParentId.HasValue)
            .GroupBy(c => c.ParentId!.Value)
            .ToDictionary(group => group.Key, group => group.ToList());

        return categories
            .Where(c => c.ParentId is null)
            .Select(parent =>
            {
                var children = childrenByParent.GetValueOrDefault(parent.Id, []);
                var childNodes = children
                    .Select(child => child with
                    {
                        ActiveProductCount = productCounts.GetValueOrDefault(child.Id)
                    })
                    .ToArray();

                return parent with
                {
                    ActiveProductCount = productCounts.GetValueOrDefault(parent.Id) +
                        childNodes.Sum(child => child.ActiveProductCount),
                    Children = childNodes
                };
            })
            .ToArray();
    }

    public async Task<IReadOnlyList<AdminCategoryDto>> GetAdminTreeAsync(CancellationToken cancellationToken)
    {
        var categories = await _db.Categories
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Id)
            .Select(c => new AdminCategoryDto(
                c.Id,
                c.NameUk,
                c.NameUk,
                c.NameEn,
                c.Slug,
                c.ParentId,
                c.SortOrder,
                0,
                c.DescriptionUk,
                c.DescriptionEn,
                Array.Empty<AdminCategoryDto>()))
            .ToListAsync(cancellationToken);

        var categoryIds = categories.Select(c => c.Id).ToArray();
        var productCounts = await _db.Products
            .AsNoTracking()
            .Where(p => categoryIds.Contains(p.CategoryId))
            .GroupBy(p => p.CategoryId)
            .Select(group => new { CategoryId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, cancellationToken);

        var childrenByParent = categories
            .Where(c => c.ParentId.HasValue)
            .GroupBy(c => c.ParentId!.Value)
            .ToDictionary(group => group.Key, group => group.ToList());

        return categories
            .Where(c => c.ParentId is null)
            .Select(parent =>
            {
                var children = childrenByParent.GetValueOrDefault(parent.Id, []);
                var childNodes = children
                    .Select(child => child with
                    {
                        ActiveProductCount = productCounts.GetValueOrDefault(child.Id)
                    })
                    .ToArray();

                return parent with
                {
                    ActiveProductCount = productCounts.GetValueOrDefault(parent.Id) +
                        childNodes.Sum(child => child.ActiveProductCount),
                    Children = childNodes
                };
            })
            .ToArray();
    }

    public async Task<AdminCategoryDto> GetForAdminAsync(int id, CancellationToken cancellationToken)
    {
        var category = await _db.Categories
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new
            {
                c.Id,
                c.NameUk,
                c.NameEn,
                c.Slug,
                c.ParentId,
                c.SortOrder,
                c.DescriptionUk,
                c.DescriptionEn
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("Категорію не знайдено.");

        var isTopLevel = category.ParentId is null;
        var count = await _db.Products.CountAsync(
            p => p.CategoryId == id || (isTopLevel && p.Category.ParentId == id),
            cancellationToken);

        return new AdminCategoryDto(
            category.Id,
            category.NameUk,
            category.NameUk,
            category.NameEn,
            category.Slug,
            category.ParentId,
            category.SortOrder,
            count,
            category.DescriptionUk,
            category.DescriptionEn,
            Array.Empty<AdminCategoryDto>());
    }

    public async Task<AdminCategoryDto> CreateAsync(
        SaveCategoryRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureValidParentAsync(request.ParentId, null, false, cancellationToken);
        var slug = await ResolveSlugAsync(request.Slug, request.NameUk, null, cancellationToken);
        var category = new Category
        {
            NameUk = request.NameUk.Trim(),
            NameEn = TrimOrNull(request.NameEn),
            Slug = slug,
            DescriptionUk = TrimOrNull(request.DescriptionUk),
            DescriptionEn = TrimOrNull(request.DescriptionEn),
            ParentId = request.ParentId,
            SortOrder = await _db.Categories
                .Where(c => c.ParentId == request.ParentId)
                .MaxAsync(c => (int?)c.SortOrder, cancellationToken) ?? 0
        };
        category.SortOrder++;

        _db.Categories.Add(category);
        await _db.SaveChangesAsync(cancellationToken);
        return new AdminCategoryDto(
            category.Id,
            category.NameUk,
            category.NameUk,
            category.NameEn,
            category.Slug,
            category.ParentId,
            category.SortOrder,
            0,
            category.DescriptionUk,
            category.DescriptionEn,
            Array.Empty<AdminCategoryDto>());
    }

    public async Task<AdminCategoryDto> UpdateAsync(
        int id,
        SaveCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException("Категорію не знайдено.");

        var hasChildren = await _db.Categories.AnyAsync(c => c.ParentId == id, cancellationToken);
        await EnsureValidParentAsync(request.ParentId, id, hasChildren, cancellationToken);

        category.NameUk = request.NameUk.Trim();
        category.NameEn = TrimOrNull(request.NameEn);
        category.Slug = await ResolveSlugAsync(request.Slug, request.NameUk, id, cancellationToken);
        category.DescriptionUk = TrimOrNull(request.DescriptionUk);
        category.DescriptionEn = TrimOrNull(request.DescriptionEn);
        category.ParentId = request.ParentId;
        await _db.SaveChangesAsync(cancellationToken);

        var isTopLevel = category.ParentId is null;
        var count = await _db.Products.CountAsync(
            p => p.CategoryId == id || (isTopLevel && p.Category.ParentId == id),
            cancellationToken);
        return new AdminCategoryDto(
            category.Id,
            category.NameUk,
            category.NameUk,
            category.NameEn,
            category.Slug,
            category.ParentId,
            category.SortOrder,
            count,
            category.DescriptionUk,
            category.DescriptionEn,
            Array.Empty<AdminCategoryDto>());
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException("Категорію не знайдено.");

        if (await _db.Products.AnyAsync(p => p.CategoryId == id, cancellationToken))
        {
            throw new ConflictException("Неможливо видалити категорію, поки в ній є товари.");
        }

        if (await _db.Categories.AnyAsync(c => c.ParentId == id, cancellationToken))
        {
            throw new ConflictException(
                "Неможливо видалити категорію, поки вона має підкатегорії. Спочатку видаліть або перепризначте їх.");
        }

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureValidParentAsync(
        int? parentId,
        int? categoryId,
        bool hasChildren,
        CancellationToken cancellationToken)
    {
        if (!parentId.HasValue)
        {
            return;
        }

        if (categoryId == parentId)
        {
            throw new BadRequestException("Категорія не може бути батьківською для самої себе.");
        }

        if (hasChildren)
        {
            throw new BadRequestException(
                "Неможливо призначити батьківську категорію, поки категорія має підкатегорії.");
        }

        var parent = await _db.Categories
            .AsNoTracking()
            .Select(c => new { c.Id, c.ParentId })
            .FirstOrDefaultAsync(c => c.Id == parentId, cancellationToken);

        if (parent is null)
        {
            throw new BadRequestException("Вказану батьківську категорію не знайдено.");
        }

        if (parent.ParentId.HasValue)
        {
            throw new BadRequestException(
                "Батьківською може бути лише категорія верхнього рівня. Вкладеність понад два рівні заборонена.");
        }
    }

    private async Task<string> ResolveSlugAsync(
        string? requestedSlug,
        string nameUk,
        int? currentCategoryId,
        CancellationToken cancellationToken)
    {
        var source = string.IsNullOrWhiteSpace(requestedSlug) ? nameUk : requestedSlug;
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

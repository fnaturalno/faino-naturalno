using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Products;
using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FaynoShop.API.Services;

public sealed class ProductService : IProductService
{
    private readonly AppDbContext _db;

    public ProductService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ProductListResponse> GetProductsAsync(
        ProductQuery query,
        CancellationToken cancellationToken)
    {
        var normalized = ProductQueryNormalizer.Normalize(query);
        normalized = await ResolveValidCategorySlugsAsync(normalized, cancellationToken);

        var priceBounds = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Min = g.Min(p => p.Price),
                Max = g.Max(p => p.Price)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var priceMin = priceBounds?.Min ?? 0m;
        var priceMax = priceBounds?.Max ?? 0m;

        var filtered = ApplyFilters(
            _db.Products.AsNoTracking().Where(p => p.IsActive),
            normalized);

        var totalCount = await filtered.CountAsync(cancellationToken);

        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)normalized.PageSize);

        var page = ResolveNearestPage(normalized.Page, totalPages);

        var sorted = ApplySort(filtered, normalized.SortBy);

        var items = await sorted
            .Skip((page - 1) * normalized.PageSize)
            .Take(normalized.PageSize)
            .Select(p => new ProductDto(
                p.Id,
                p.Name,
                p.Slug,
                p.ShortDescription,
                p.Price,
                p.OldPrice,
                p.ImageUrl,
                p.Weight,
                p.WeightUnit,
                p.StockQuantity,
                p.IsFeatured,
                p.CreatedAt,
                p.CategoryId,
                p.Category.Name,
                p.Category.Slug))
            .ToListAsync(cancellationToken);

        return new ProductListResponse(
            items,
            page,
            normalized.PageSize,
            totalCount,
            totalPages,
            priceMin,
            priceMax);
    }

    private async Task<NormalizedProductQuery> ResolveValidCategorySlugsAsync(
        NormalizedProductQuery query,
        CancellationToken cancellationToken)
    {
        if (query.CategorySlugs.Count == 0)
        {
            return query;
        }

        var validSlugs = await _db.Categories
            .AsNoTracking()
            .Where(c => query.CategorySlugs.Contains(c.Slug))
            .Select(c => c.Slug)
            .ToListAsync(cancellationToken);

        return query with { CategorySlugs = validSlugs };
    }

    private static IQueryable<Product> ApplyFilters(
        IQueryable<Product> source,
        NormalizedProductQuery query)
    {
        if (query.CategorySlugs.Count > 0)
        {
            var slugs = query.CategorySlugs;
            source = source.Where(p => slugs.Contains(p.Category.Slug));
        }

        if (!string.IsNullOrEmpty(query.Search))
        {
            var pattern = EscapeLikePattern(query.Search);
            source = source.Where(p =>
                EF.Functions.ILike(p.Name, pattern, "\\") ||
                (p.ShortDescription != null && EF.Functions.ILike(p.ShortDescription, pattern, "\\")));
        }

        if (query.MinPrice.HasValue)
        {
            var min = query.MinPrice.Value;
            source = source.Where(p => p.Price >= min);
        }

        if (query.MaxPrice.HasValue)
        {
            var max = query.MaxPrice.Value;
            source = source.Where(p => p.Price <= max);
        }

        return source;
    }

    private static IQueryable<Product> ApplySort(IQueryable<Product> source, string sortBy)
    {
        return sortBy switch
        {
            "price-asc" => source.OrderBy(p => p.Price).ThenBy(p => p.Id),
            "price-desc" => source.OrderByDescending(p => p.Price).ThenBy(p => p.Id),
            "new" => source.OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Id),
            _ => source.OrderByDescending(p => p.IsFeatured).ThenBy(p => p.Id)
        };
    }

    private static int ResolveNearestPage(int requestedPage, int totalPages)
    {
        if (totalPages <= 0)
        {
            return ProductQueryNormalizer.DefaultPage;
        }

        if (requestedPage < 1)
        {
            return 1;
        }

        return requestedPage > totalPages ? totalPages : requestedPage;
    }

    private static string EscapeLikePattern(string value)
    {
        var escaped = value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);

        return $"%{escaped}%";
    }
}

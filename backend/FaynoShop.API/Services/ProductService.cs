using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Products;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Models;
using FaynoShop.API.Security;
using Microsoft.EntityFrameworkCore;

namespace FaynoShop.API.Services;

public sealed class ProductService : IProductService
{
    private const int SimilarProductsLimit = 3;

    /// <summary>Matches <see cref="Data.Configurations.ProductConfiguration"/> slug max length.</summary>
    private const int MaxSlugLength = 200;

    private readonly AppDbContext _db;

    public ProductService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ProductDetailDto> GetBySlugAsync(
        string slug,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        slug = slug.Trim();

        // Reject oversized slugs before hitting the DB (DoS / accidental huge path segments).
        if (slug.Length > MaxSlugLength)
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        var product = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive && p.Slug == slug)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Slug,
                p.ShortDescription,
                p.Description,
                p.Price,
                p.OldPrice,
                p.ImageUrl,
                p.ImageUrls,
                p.Weight,
                p.WeightUnit,
                p.StockQuantity,
                p.IsFeatured,
                p.CreatedAt,
                p.CategoryId,
                CategoryName = p.Category.Name,
                CategorySlug = p.Category.Slug
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (product is null)
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        var similarProducts = await _db.Products
            .AsNoTracking()
            .Where(p =>
                p.IsActive &&
                p.CategoryId == product.CategoryId &&
                p.Id != product.Id)
            .OrderByDescending(p => p.IsFeatured)
            .ThenBy(p => p.Id)
            .Take(SimilarProductsLimit)
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

        similarProducts = similarProducts
            .Select(MapSafeProductCard)
            .ToList();

        return new ProductDetailDto(
            product.Id,
            product.Name,
            product.Slug,
            product.ShortDescription,
            product.Description,
            product.Price,
            product.OldPrice,
            MediaUrlGuard.Sanitize(product.ImageUrl),
            MediaUrlGuard.SanitizeMany(product.ImageUrls),
            product.Weight,
            product.WeightUnit,
            product.StockQuantity,
            product.IsFeatured,
            product.CreatedAt,
            product.CategoryId,
            product.CategoryName,
            product.CategorySlug,
            similarProducts);
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

        items = items.Select(MapSafeProductCard).ToList();

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

    private static ProductDto MapSafeProductCard(ProductDto product) =>
        product with { ImageUrl = MediaUrlGuard.Sanitize(product.ImageUrl) };
}

using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Products;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Models;
using FaynoShop.API.Security;
using Microsoft.EntityFrameworkCore;
using Npgsql;

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

        var includeInactive = query.IncludeInactive;
        var products = _db.Products.AsNoTracking();

        if (!includeInactive)
        {
            products = products.Where(p => p.IsActive);
        }

        var priceBounds = await products
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Min = g.Min(p => p.Price),
                Max = g.Max(p => p.Price)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var priceMin = priceBounds?.Min ?? 0m;
        var priceMax = priceBounds?.Max ?? 0m;

        var filtered = ApplyFilters(products, normalized);

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
                p.Category.Slug,
                p.IsActive))
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

    public async Task<AdminProductDto> GetForAdminAsync(int id, CancellationToken cancellationToken)
    {
        var product = await _db.Products
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new AdminProductDto(
                p.Id, p.Name, p.Slug, p.CategoryId, p.Category.Name, p.Category.Slug,
                p.ShortDescription, p.Description, p.Price, p.OldPrice, p.Weight, p.WeightUnit,
                p.StockQuantity, p.ImageUrl, p.ImageUrls, p.IsActive, p.IsFeatured,
                p.CreatedAt, p.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);

        return product ?? throw new NotFoundException("Товар не знайдено.");
    }

    public async Task<AdminProductDto> CreateAsync(
        SaveProductRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureCategoryExistsAsync(request.CategoryId, cancellationToken);
        var slug = await ResolveSlugAsync(request.Slug, request.Name, null, cancellationToken);
        var now = DateTime.UtcNow;
        var imageUrls = NormalizeImageUrls(request.ImageUrl, request.ImageUrls);

        var product = new Product
        {
            Name = request.Name.Trim(),
            Slug = slug,
            CategoryId = request.CategoryId,
            ShortDescription = TrimOrNull(request.ShortDescription),
            Description = TrimOrNull(request.Description),
            Price = request.Price,
            OldPrice = request.OldPrice,
            Weight = request.Weight,
            WeightUnit = TrimOrNull(request.WeightUnit),
            StockQuantity = request.StockQuantity,
            ImageUrl = imageUrls.FirstOrDefault(),
            ImageUrls = imageUrls,
            IsActive = request.IsActive,
            IsFeatured = request.IsFeatured,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync(cancellationToken);
        return await GetForAdminAsync(product.Id, cancellationToken);
    }

    public async Task<AdminProductDto> UpdateAsync(
        int id,
        SaveProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw new NotFoundException("Товар не знайдено.");

        await EnsureCategoryExistsAsync(request.CategoryId, cancellationToken);
        var slug = await ResolveSlugAsync(request.Slug, request.Name, id, cancellationToken);
        var imageUrls = NormalizeImageUrls(request.ImageUrl, request.ImageUrls);

        product.Name = request.Name.Trim();
        product.Slug = slug;
        product.CategoryId = request.CategoryId;
        product.ShortDescription = TrimOrNull(request.ShortDescription);
        product.Description = TrimOrNull(request.Description);
        product.Price = request.Price;
        product.OldPrice = request.OldPrice;
        product.Weight = request.Weight;
        product.WeightUnit = TrimOrNull(request.WeightUnit);
        product.StockQuantity = request.StockQuantity;
        product.ImageUrl = imageUrls.FirstOrDefault();
        product.ImageUrls = imageUrls;
        product.IsActive = request.IsActive;
        product.IsFeatured = request.IsFeatured;
        product.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return await GetForAdminAsync(product.Id, cancellationToken);
    }

    public async Task<AdminProductDto> SetActiveAsync(
        int id,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw new NotFoundException("Товар не знайдено.");

        product.IsActive = isActive;
        product.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetForAdminAsync(product.Id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var exists = await _db.Products.AnyAsync(p => p.Id == id, cancellationToken);
        if (!exists)
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        var referenced = await _db.CartItems.AnyAsync(item => item.ProductId == id, cancellationToken)
            || await _db.OrderItems.AnyAsync(item => item.ProductId == id, cancellationToken);
        if (referenced)
        {
            throw new ConflictException(
                "Товар неможливо видалити, бо він є в кошиках або історії замовлень. Приховайте його замість видалення.");
        }

        try
        {
            await _db.Products.Where(p => p.Id == id).ExecuteDeleteAsync(cancellationToken);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.ForeignKeyViolation)
        {
            throw new ConflictException(
                "Товар неможливо видалити, бо він пов'язаний з іншими даними. Приховайте його замість видалення.");
        }
    }

    private async Task EnsureCategoryExistsAsync(int categoryId, CancellationToken cancellationToken)
    {
        if (!await _db.Categories.AnyAsync(c => c.Id == categoryId, cancellationToken))
        {
            throw new BadRequestException("Вказану категорію не знайдено.");
        }
    }

    private async Task<string> ResolveSlugAsync(
        string? requestedSlug,
        string name,
        int? currentProductId,
        CancellationToken cancellationToken)
    {
        var source = string.IsNullOrWhiteSpace(requestedSlug) ? name : requestedSlug;
        var slug = SlugGenerator.From(source, MaxSlugLength);
        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new BadRequestException("Не вдалося сформувати коректний slug товару.");
        }

        var duplicate = await _db.Products.AnyAsync(
            p => p.Slug == slug && p.Id != currentProductId,
            cancellationToken);
        if (duplicate)
        {
            throw new ConflictException("Товар з таким URL (slug) уже існує.");
        }

        return slug;
    }

    private static string[] NormalizeImageUrls(string? imageUrl, IReadOnlyList<string>? imageUrls)
    {
        var urls = new[] { imageUrl }
            .Concat(imageUrls ?? [])
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Select(url => url!.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        return urls;
    }

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

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
                EF.Functions.ILike(p.Slug, pattern, "\\") ||
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

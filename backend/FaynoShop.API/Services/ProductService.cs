using FaynoShop.API.Constants;
using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Products;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Localization;
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
        string locale,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        slug = slug.Trim();

        if (slug.Length > MaxSlugLength)
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        var useEn = LocalizedContent.IsEnglish(locale);

        var product = await CatalogProducts(_db.Products.AsNoTracking())
            .Where(p => p.Slug == slug)
            .Select(p => new
            {
                p.Id,
                Name = useEn && p.NameEn != null && p.NameEn != "" ? p.NameEn : p.NameUk,
                p.Slug,
                ShortDescription = useEn && p.ShortDescriptionEn != null && p.ShortDescriptionEn != ""
                    ? p.ShortDescriptionEn
                    : p.ShortDescriptionUk,
                Description = useEn && p.DescriptionEn != null && p.DescriptionEn != ""
                    ? p.DescriptionEn
                    : p.DescriptionUk,
                p.ImageUrl,
                p.ImageUrls,
                p.IsFeatured,
                p.IsAvailable,
                p.CreatedAt,
                p.CategoryId,
                CategoryName = useEn && p.Category.NameEn != null && p.Category.NameEn != ""
                    ? p.Category.NameEn
                    : p.Category.NameUk,
                CategorySlug = p.Category.Slug,
                p.Strength,
                Variants = p.Variants
                    .Where(v => v.IsActive)
                    .OrderBy(v => v.SortOrder)
                    .Select(v => new ProductVariantDto(
                        v.Id,
                        v.Weight,
                        v.WeightUnit,
                        v.Price,
                        v.SortOrder))
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (product is null)
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        var similarProducts = await ProjectProductCards(
                CatalogProducts(_db.Products.AsNoTracking())
                    .Where(p => p.CategoryId == product.CategoryId && p.Id != product.Id)
                    .OrderByDescending(p => p.IsFeatured)
                    .ThenBy(p => p.Id)
                    .Take(SimilarProductsLimit),
                useEn)
            .ToListAsync(cancellationToken);

        similarProducts = similarProducts.Select(MapSafeProductCard).ToList();

        return new ProductDetailDto(
            product.Id,
            product.Name,
            product.Slug,
            product.ShortDescription,
            product.Description,
            MediaUrlGuard.Sanitize(product.ImageUrl),
            MediaUrlGuard.SanitizeMany(product.ImageUrls),
            product.IsFeatured,
            product.IsAvailable,
            product.CreatedAt,
            product.CategoryId,
            product.CategoryName,
            product.CategorySlug,
            product.Strength,
            product.Variants,
            similarProducts);
    }

    public async Task<ProductListResponse> GetProductsAsync(
        ProductQuery query,
        string locale,
        CancellationToken cancellationToken)
    {
        var normalized = ProductQueryNormalizer.Normalize(query);
        normalized = await ResolveValidCategorySlugsAsync(normalized, cancellationToken);

        var includeInactive = query.IncludeInactive;
        var useEn = LocalizedContent.IsEnglish(locale);
        var products = _db.Products.AsNoTracking();

        if (!includeInactive)
        {
            products = CatalogProducts(products);
        }

        var priceBounds = await products
            .Where(p => p.Variants.Any(v => v.IsActive))
            .Select(p => p.Variants.Where(v => v.IsActive).Min(v => v.Price))
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Min = g.Min(),
                Max = g.Max()
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

        var sorted = ApplySort(filtered, normalized.SortBy, useEn);

        var items = await ProjectProductCards(
                sorted
                    .Skip((page - 1) * normalized.PageSize)
                    .Take(normalized.PageSize),
                useEn)
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
            .Select(p => new
            {
                p.Id,
                p.NameUk,
                p.NameEn,
                p.Slug,
                p.CategoryId,
                CategoryName = p.Category.NameUk,
                CategorySlug = p.Category.Slug,
                p.ShortDescriptionUk,
                p.ShortDescriptionEn,
                p.DescriptionUk,
                p.DescriptionEn,
                p.ImageUrl,
                p.ImageUrls,
                p.IsActive,
                p.IsFeatured,
                p.IsAvailable,
                p.Strength,
                p.CreatedAt,
                p.UpdatedAt,
                PriceFrom = p.Variants.Where(v => v.IsActive).Min(v => (decimal?)v.Price),
                Variants = p.Variants
                    .OrderBy(v => v.SortOrder)
                    .Select(v => new AdminProductVariantDto(
                        v.Id,
                        v.Weight,
                        v.WeightUnit,
                        v.Price,
                        v.IsActive,
                        v.SortOrder))
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (product is null)
        {
            throw new NotFoundException("Товар не знайдено.");
        }

        return new AdminProductDto(
            product.Id,
            product.NameUk,
            product.NameEn,
            product.Slug,
            product.CategoryId,
            product.CategoryName,
            product.CategorySlug,
            product.ShortDescriptionUk,
            product.ShortDescriptionEn,
            product.DescriptionUk,
            product.DescriptionEn,
            product.PriceFrom,
            product.ImageUrl,
            product.ImageUrls,
            product.IsActive,
            product.IsFeatured,
            product.IsAvailable,
            product.Strength,
            product.CreatedAt,
            product.UpdatedAt,
            product.Variants);
    }

    public async Task<AdminProductDto> CreateAsync(
        SaveProductRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureCategoryExistsAsync(request.CategoryId, cancellationToken);
        EnsureActiveRequiresVariants(request);
        var slug = await ResolveSlugAsync(request.Slug, request.NameUk, null, cancellationToken);
        var now = DateTime.UtcNow;
        var imageUrls = NormalizeImageUrls(request.ImageUrl, request.ImageUrls);

        var product = new Product
        {
            NameUk = request.NameUk.Trim(),
            NameEn = TrimOrNull(request.NameEn),
            Slug = slug,
            CategoryId = request.CategoryId,
            ShortDescriptionUk = TrimOrNull(request.ShortDescriptionUk),
            ShortDescriptionEn = TrimOrNull(request.ShortDescriptionEn),
            DescriptionUk = TrimOrNull(request.DescriptionUk),
            DescriptionEn = TrimOrNull(request.DescriptionEn),
            ImageUrl = imageUrls.FirstOrDefault(),
            ImageUrls = imageUrls,
            IsActive = request.IsActive,
            IsFeatured = request.IsFeatured,
            IsAvailable = request.IsAvailable,
            Strength = request.Strength,
            CreatedAt = now,
            UpdatedAt = now
        };

        foreach (var variant in BuildVariantsFromRequest(request.Variants))
        {
            product.Variants.Add(variant);
        }

        _db.Products.Add(product);
        await _db.SaveChangesAsync(cancellationToken);
        return await GetForAdminAsync(product.Id, cancellationToken);
    }

    public async Task<AdminProductDto> UpdateAsync(
        int id,
        SaveProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await _db.Products
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw new NotFoundException("Товар не знайдено.");

        await EnsureCategoryExistsAsync(request.CategoryId, cancellationToken);
        EnsureActiveRequiresVariants(request);
        var slug = await ResolveSlugAsync(request.Slug, request.NameUk, id, cancellationToken);
        var imageUrls = NormalizeImageUrls(request.ImageUrl, request.ImageUrls);

        product.NameUk = request.NameUk.Trim();
        product.NameEn = TrimOrNull(request.NameEn);
        product.Slug = slug;
        product.CategoryId = request.CategoryId;
        product.ShortDescriptionUk = TrimOrNull(request.ShortDescriptionUk);
        product.ShortDescriptionEn = TrimOrNull(request.ShortDescriptionEn);
        product.DescriptionUk = TrimOrNull(request.DescriptionUk);
        product.DescriptionEn = TrimOrNull(request.DescriptionEn);
        product.ImageUrl = imageUrls.FirstOrDefault();
        product.ImageUrls = imageUrls;
        product.IsActive = request.IsActive;
        product.IsFeatured = request.IsFeatured;
        product.IsAvailable = request.IsAvailable;
        product.Strength = request.Strength;
        product.UpdatedAt = DateTime.UtcNow;

        await SyncVariantsAsync(product, request.Variants, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return await GetForAdminAsync(product.Id, cancellationToken);
    }

    public async Task<AdminProductDto> SetActiveAsync(
        int id,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var product = await _db.Products
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw new NotFoundException("Товар не знайдено.");

        if (isActive && !product.Variants.Any(v => v.IsActive))
        {
            throw new BadRequestException(
                "Активний товар потребує хоча б одного активного фасування з ціною.");
        }

        product.IsActive = isActive;
        product.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetForAdminAsync(product.Id, cancellationToken);
    }

    public async Task<AdminProductDto> SetAvailableAsync(
        int id,
        bool isAvailable,
        CancellationToken cancellationToken)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw new NotFoundException("Товар не знайдено.");

        product.IsAvailable = isAvailable;
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

        var referenced = await _db.CartItems.AnyAsync(item => item.Variant.ProductId == id, cancellationToken)
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

    private async Task SyncVariantsAsync(
        Product product,
        IReadOnlyList<SaveProductVariantRequest>? requestVariants,
        CancellationToken cancellationToken)
    {
        var incoming = NormalizeIncomingVariants(requestVariants);
        var existingByKey = product.Variants.ToDictionary(
            v => (v.Weight, v.WeightUnit),
            v => v);

        var keepKeys = new HashSet<(decimal Weight, string WeightUnit)>();

        foreach (var (preset, request) in incoming)
        {
            var key = (preset.Weight, preset.WeightUnit);
            keepKeys.Add(key);

            if (existingByKey.TryGetValue(key, out var existing))
            {
                existing.Price = request.Price;
                existing.IsActive = request.IsActive;
                existing.SortOrder = preset.SortOrder;
            }
            else
            {
                product.Variants.Add(new ProductVariant
                {
                    ProductId = product.Id,
                    Weight = preset.Weight,
                    WeightUnit = preset.WeightUnit,
                    Price = request.Price,
                    IsActive = request.IsActive,
                    SortOrder = preset.SortOrder
                });
            }
        }

        var toRemove = product.Variants
            .Where(v => !keepKeys.Contains((v.Weight, v.WeightUnit)))
            .ToList();

        foreach (var variant in toRemove)
        {
            var referenced = await _db.CartItems.AnyAsync(i => i.VariantId == variant.Id, cancellationToken)
                || await _db.OrderItems.AnyAsync(i => i.VariantId == variant.Id, cancellationToken);

            if (referenced)
            {
                throw new BadRequestException(
                    $"Фасування {variant.Weight} {variant.WeightUnit} використовується в кошиках або замовленнях. Деактивуйте його замість видалення ціни.");
            }

            product.Variants.Remove(variant);
            _db.ProductVariants.Remove(variant);
        }
    }

    private static List<ProductVariant> BuildVariantsFromRequest(
        IReadOnlyList<SaveProductVariantRequest>? requestVariants)
    {
        return NormalizeIncomingVariants(requestVariants)
            .Select(pair => new ProductVariant
            {
                Weight = pair.Preset.Weight,
                WeightUnit = pair.Preset.WeightUnit,
                Price = pair.Request.Price,
                IsActive = pair.Request.IsActive,
                SortOrder = pair.Preset.SortOrder
            })
            .ToList();
    }

    private static List<(PredefinedWeights.Entry Preset, SaveProductVariantRequest Request)> NormalizeIncomingVariants(
        IReadOnlyList<SaveProductVariantRequest>? requestVariants)
    {
        if (requestVariants is null || requestVariants.Count == 0)
        {
            return [];
        }

        var result = new List<(PredefinedWeights.Entry, SaveProductVariantRequest)>(requestVariants.Count);
        foreach (var request in requestVariants)
        {
            var preset = PredefinedWeights.Find(request.Weight, request.WeightUnit)
                ?? throw new BadRequestException(
                    "Фасування має відповідати одному з дозволених: 10г, 50г, 100г, 250г, 500г, 1кг, 1шт.");
            result.Add((preset, request));
        }

        return result;
    }

    private static void EnsureActiveRequiresVariants(SaveProductRequest request)
    {
        if (request.IsActive
            && (request.Variants is null
                || !request.Variants.Any(v => v.IsActive && v.Price > 0)))
        {
            throw new BadRequestException(
                "Активний товар потребує хоча б одного активного фасування з ціною.");
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
        string nameUk,
        int? currentProductId,
        CancellationToken cancellationToken)
    {
        var source = string.IsNullOrWhiteSpace(requestedSlug) ? nameUk : requestedSlug;
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

        var selectedCategories = await _db.Categories
            .AsNoTracking()
            .Where(c => query.CategorySlugs.Contains(c.Slug))
            .Select(c => new { c.Id, c.Slug, c.ParentId })
            .ToListAsync(cancellationToken);

        var selectedParentIds = selectedCategories
            .Where(c => c.ParentId is null)
            .Select(c => c.Id)
            .ToArray();

        if (selectedParentIds.Length == 0)
        {
            return query with { CategorySlugs = selectedCategories.Select(c => c.Slug).ToArray() };
        }

        var expandedSlugs = await _db.Categories
            .AsNoTracking()
            .Where(c => c.ParentId.HasValue && selectedParentIds.Contains(c.ParentId.Value))
            .Select(c => c.Slug)
            .ToListAsync(cancellationToken);

        return query with
        {
            CategorySlugs = selectedCategories
                .Select(c => c.Slug)
                .Concat(expandedSlugs)
                .Distinct(StringComparer.Ordinal)
                .ToArray()
        };
    }

    /// <summary>Public catalog inclusion: active + available + ≥1 active priced variant.</summary>
    private static IQueryable<Product> CatalogProducts(IQueryable<Product> source) =>
        source.Where(p =>
            p.IsActive
            && p.IsAvailable
            && p.Variants.Any(v => v.IsActive));

    private static IQueryable<ProductDto> ProjectProductCards(IQueryable<Product> source, bool useEn)
    {
        return source.Select(p => new ProductDto(
            p.Id,
            useEn && p.NameEn != null && p.NameEn != "" ? p.NameEn : p.NameUk,
            p.Slug,
            useEn && p.ShortDescriptionEn != null && p.ShortDescriptionEn != ""
                ? p.ShortDescriptionEn
                : p.ShortDescriptionUk,
            p.Variants.Where(v => v.IsActive).Min(v => (decimal?)v.Price),
            p.Variants
                .Where(v => v.IsActive)
                .OrderBy(v => v.Price)
                .ThenBy(v => v.SortOrder)
                .Select(v => (int?)v.Id)
                .FirstOrDefault(),
            p.Variants
                .Where(v => v.IsActive)
                .OrderBy(v => v.SortOrder)
                .Select(v => new ProductVariantDto(
                    v.Id,
                    v.Weight,
                    v.WeightUnit,
                    v.Price,
                    v.SortOrder))
                .ToList(),
            p.ImageUrl,
            p.IsFeatured,
            p.CreatedAt,
            p.CategoryId,
            useEn && p.Category.NameEn != null && p.Category.NameEn != ""
                ? p.Category.NameEn
                : p.Category.NameUk,
            p.Category.Slug,
            p.IsAvailable,
            p.IsActive,
            p.Strength));
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
                EF.Functions.ILike(p.NameUk, pattern, "\\") ||
                (p.NameEn != null && EF.Functions.ILike(p.NameEn, pattern, "\\")) ||
                EF.Functions.ILike(p.Slug, pattern, "\\") ||
                (p.ShortDescriptionUk != null && EF.Functions.ILike(p.ShortDescriptionUk, pattern, "\\")) ||
                (p.ShortDescriptionEn != null && EF.Functions.ILike(p.ShortDescriptionEn, pattern, "\\")));
        }

        if (query.MinPrice.HasValue)
        {
            var min = query.MinPrice.Value;
            source = source.Where(p =>
                p.Variants.Any(v => v.IsActive)
                && p.Variants.Where(v => v.IsActive).Min(v => v.Price) >= min);
        }

        if (query.MaxPrice.HasValue)
        {
            var max = query.MaxPrice.Value;
            source = source.Where(p =>
                p.Variants.Any(v => v.IsActive)
                && p.Variants.Where(v => v.IsActive).Min(v => v.Price) <= max);
        }

        return source;
    }

    private static IQueryable<Product> ApplySort(IQueryable<Product> source, string sortBy, bool useEn)
    {
        return sortBy switch
        {
            "price-asc" => source
                .OrderBy(p => p.Variants.Where(v => v.IsActive).Min(v => (decimal?)v.Price) ?? decimal.MaxValue)
                .ThenBy(p => p.Id),
            "price-desc" => source
                .OrderByDescending(p => p.Variants.Where(v => v.IsActive).Min(v => (decimal?)v.Price) ?? decimal.MinValue)
                .ThenBy(p => p.Id),
            "new" => source.OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Id),
            "name-asc" => useEn
                ? source
                    .OrderBy(p => p.NameEn != null && p.NameEn != "" ? p.NameEn : p.NameUk)
                    .ThenBy(p => p.Id)
                : source.OrderBy(p => p.NameUk).ThenBy(p => p.Id),
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

    private static ProductDto MapSafeProductCard(ProductDto product)
    {
        return product with
        {
            ImageUrl = MediaUrlGuard.Sanitize(product.ImageUrl)
        };
    }
}

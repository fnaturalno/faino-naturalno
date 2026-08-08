using FaynoShop.API.Data;
using FaynoShop.API.DTOs.News;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Localization;
using FaynoShop.API.Models;
using FaynoShop.API.Security;
using Microsoft.EntityFrameworkCore;

namespace FaynoShop.API.Services;

public sealed class NewsService : INewsService
{
    private const int MaxSlugLength = 300;
    private const int DefaultPage = 1;
    private const int DefaultPublicPageSize = 9;
    private const int MaxPublicPageSize = 48;
    private const int DefaultAdminPageSize = 20;
    private const int MaxAdminPageSize = 100;
    private const int MaxSearchLength = 100;

    private readonly AppDbContext _db;

    public NewsService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<NewsListResponse> GetPublishedAsync(
        NewsQuery query,
        string locale,
        CancellationToken cancellationToken)
    {
        var page = query.Page is > 0 ? query.Page.Value : DefaultPage;
        var pageSize = query.PageSize is >= 1 and <= MaxPublicPageSize
            ? query.PageSize.Value
            : DefaultPublicPageSize;

        var now = DateTime.UtcNow;
        var source = PublishedPosts(_db.NewsPosts.AsNoTracking(), now);

        var totalCount = await source.CountAsync(cancellationToken);
        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)pageSize);
        page = ResolveNearestPage(page, totalPages);

        var rows = await source
            .OrderByDescending(n => n.IsFeatured)
            .ThenByDescending(n => n.PublishedAt)
            .ThenByDescending(n => n.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new
            {
                n.Id,
                n.Slug,
                n.TitleUk,
                n.TitleEn,
                n.ExcerptUk,
                n.ExcerptEn,
                n.CoverImageUrl,
                PublishedAt = n.PublishedAt!.Value,
                n.IsFeatured
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(n => new NewsListItemDto(
                n.Id,
                n.Slug,
                LocalizedContent.Pick(locale, n.TitleUk, n.TitleEn),
                LocalizedContent.PickOptional(locale, n.ExcerptUk, n.ExcerptEn),
                MediaUrlGuard.Sanitize(n.CoverImageUrl),
                n.PublishedAt,
                n.IsFeatured))
            .ToArray();

        return new NewsListResponse(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<NewsDetailDto> GetPublishedBySlugAsync(
        string slug,
        string locale,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new NotFoundException("Новину не знайдено.");
        }

        slug = slug.Trim();
        if (slug.Length > MaxSlugLength)
        {
            throw new NotFoundException("Новину не знайдено.");
        }

        var now = DateTime.UtcNow;
        var post = await PublishedPosts(_db.NewsPosts.AsNoTracking(), now)
            .Where(n => n.Slug == slug)
            .Select(n => new
            {
                n.Id,
                n.Slug,
                n.TitleUk,
                n.TitleEn,
                n.ExcerptUk,
                n.ExcerptEn,
                n.BodyUk,
                n.BodyEn,
                n.CoverImageUrl,
                PublishedAt = n.PublishedAt!.Value,
                n.IsFeatured
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("Новину не знайдено.");

        return new NewsDetailDto(
            post.Id,
            post.Slug,
            LocalizedContent.Pick(locale, post.TitleUk, post.TitleEn),
            LocalizedContent.PickOptional(locale, post.ExcerptUk, post.ExcerptEn),
            LocalizedContent.Pick(locale, post.BodyUk, post.BodyEn),
            MediaUrlGuard.Sanitize(post.CoverImageUrl),
            post.PublishedAt,
            post.IsFeatured);
    }

    public async Task<AdminNewsListResponse> GetAdminListAsync(
        AdminNewsQuery query,
        CancellationToken cancellationToken)
    {
        var pageSize = Math.Clamp(query.PageSize ?? DefaultAdminPageSize, 1, MaxAdminPageSize);
        var page = Math.Max(query.Page ?? DefaultPage, 1);

        var posts = _db.NewsPosts.AsNoTracking().AsQueryable();

        if (query.IsPublished.HasValue)
        {
            posts = posts.Where(n => n.IsPublished == query.IsPublished.Value);
        }

        var search = NormalizeSearch(query.Search);
        if (search is not null)
        {
            var pattern = EscapeLikePattern(search);
            posts = posts.Where(n =>
                EF.Functions.ILike(n.TitleUk, pattern, "\\") ||
                (n.TitleEn != null && EF.Functions.ILike(n.TitleEn, pattern, "\\")) ||
                EF.Functions.ILike(n.Slug, pattern, "\\"));
        }

        var totalCount = await posts.CountAsync(cancellationToken);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);
        page = totalPages == 0 ? 1 : Math.Min(page, totalPages);

        var items = await posts
            .OrderByDescending(n => n.UpdatedAt)
            .ThenByDescending(n => n.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new AdminNewsListItemDto(
                n.Id,
                n.TitleUk,
                n.Slug,
                n.IsPublished,
                n.IsFeatured,
                n.PublishedAt,
                n.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new AdminNewsListResponse(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<AdminNewsDto> GetForAdminAsync(int id, CancellationToken cancellationToken)
    {
        var post = await _db.NewsPosts
            .AsNoTracking()
            .Where(n => n.Id == id)
            .Select(n => new AdminNewsDto(
                n.Id,
                n.TitleUk,
                n.TitleEn,
                n.Slug,
                n.ExcerptUk,
                n.ExcerptEn,
                n.BodyUk,
                n.BodyEn,
                n.CoverImageUrl,
                n.IsPublished,
                n.IsFeatured,
                n.PublishedAt,
                n.CreatedAt,
                n.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("Новину не знайдено.");

        return post with { CoverImageUrl = MediaUrlGuard.Sanitize(post.CoverImageUrl) };
    }

    public async Task<AdminNewsDto> CreateAsync(
        SaveNewsPostRequest request,
        CancellationToken cancellationToken)
    {
        var slug = await ResolveSlugAsync(request.Slug, request.TitleUk, null, cancellationToken);
        var now = DateTime.UtcNow;
        var publishedAt = ResolvePublishedAt(request.IsPublished, request.PublishedAt, existing: null, now);

        var post = new NewsPost
        {
            TitleUk = request.TitleUk.Trim(),
            TitleEn = TrimOrNull(request.TitleEn),
            Slug = slug,
            ExcerptUk = TrimOrNull(request.ExcerptUk),
            ExcerptEn = TrimOrNull(request.ExcerptEn),
            BodyUk = request.BodyUk?.Trim() ?? string.Empty,
            BodyEn = TrimOrNull(request.BodyEn),
            CoverImageUrl = MediaUrlGuard.Sanitize(request.CoverImageUrl),
            IsPublished = request.IsPublished,
            IsFeatured = request.IsFeatured,
            PublishedAt = publishedAt,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.NewsPosts.Add(post);
        await _db.SaveChangesAsync(cancellationToken);
        return await GetForAdminAsync(post.Id, cancellationToken);
    }

    public async Task<AdminNewsDto> UpdateAsync(
        int id,
        SaveNewsPostRequest request,
        CancellationToken cancellationToken)
    {
        var post = await _db.NewsPosts.FirstOrDefaultAsync(n => n.Id == id, cancellationToken)
            ?? throw new NotFoundException("Новину не знайдено.");

        var slug = await ResolveSlugAsync(request.Slug, request.TitleUk, id, cancellationToken);
        var now = DateTime.UtcNow;

        post.TitleUk = request.TitleUk.Trim();
        post.TitleEn = TrimOrNull(request.TitleEn);
        post.Slug = slug;
        post.ExcerptUk = TrimOrNull(request.ExcerptUk);
        post.ExcerptEn = TrimOrNull(request.ExcerptEn);
        post.BodyUk = request.BodyUk?.Trim() ?? string.Empty;
        post.BodyEn = TrimOrNull(request.BodyEn);
        post.CoverImageUrl = MediaUrlGuard.Sanitize(request.CoverImageUrl);
        post.IsFeatured = request.IsFeatured;
        post.PublishedAt = ResolvePublishedAt(request.IsPublished, request.PublishedAt, post.PublishedAt, now);
        post.IsPublished = request.IsPublished;
        post.UpdatedAt = now;

        await _db.SaveChangesAsync(cancellationToken);
        return await GetForAdminAsync(post.Id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var deleted = await _db.NewsPosts
            .Where(n => n.Id == id)
            .ExecuteDeleteAsync(cancellationToken);

        if (deleted == 0)
        {
            throw new NotFoundException("Новину не знайдено.");
        }
    }

    private static IQueryable<NewsPost> PublishedPosts(IQueryable<NewsPost> source, DateTime now) =>
        source.Where(n => n.IsPublished && n.PublishedAt != null && n.PublishedAt <= now);

    /// <summary>
    /// Publish with null publishedAt → now; keep provided timestamp; unpublish keeps existing publishedAt.
    /// </summary>
    private static DateTime? ResolvePublishedAt(
        bool isPublished,
        DateTime? requested,
        DateTime? existing,
        DateTime now)
    {
        if (!isPublished)
        {
            return existing ?? requested;
        }

        if (requested.HasValue)
        {
            return EnsureUtc(requested.Value);
        }

        if (existing.HasValue)
        {
            return existing;
        }

        return now;
    }

    private static DateTime EnsureUtc(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

    private async Task<string> ResolveSlugAsync(
        string? requestedSlug,
        string titleUk,
        int? currentPostId,
        CancellationToken cancellationToken)
    {
        var source = string.IsNullOrWhiteSpace(requestedSlug) ? titleUk : requestedSlug;
        var slug = SlugGenerator.From(source, MaxSlugLength);
        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new BadRequestException("Не вдалося сформувати коректний slug новини.");
        }

        var duplicate = await _db.NewsPosts.AnyAsync(
            n => n.Slug == slug && n.Id != currentPostId,
            cancellationToken);
        if (duplicate)
        {
            throw new ConflictException("Новина з таким URL (slug) уже існує.");
        }

        return slug;
    }

    private static int ResolveNearestPage(int requestedPage, int totalPages)
    {
        if (totalPages <= 0)
        {
            return DefaultPage;
        }

        return requestedPage > totalPages ? totalPages : requestedPage;
    }

    private static string? NormalizeSearch(string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return null;
        }

        var trimmed = search.Trim();
        return trimmed.Length <= MaxSearchLength ? trimmed : trimmed[..MaxSearchLength];
    }

    private static string EscapeLikePattern(string value)
    {
        var escaped = value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
        return $"%{escaped}%";
    }

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

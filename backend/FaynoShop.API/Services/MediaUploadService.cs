using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Uploads;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FaynoShop.API.Services;

public interface IMediaUploadService
{
    Task<string> SaveProductImageAsync(IFormFile file, CancellationToken cancellationToken);
    IReadOnlyList<string> ListUncompressedProductImages();
    Task<CompressImageResultDto> CompressExistingProductImageAsync(
        string fileName,
        CancellationToken cancellationToken);
    Task<CompressAllImagesResultDto> CompressAllUncompressedProductImagesAsync(
        CancellationToken cancellationToken);
}

public sealed class MediaUploadService : IMediaUploadService
{
    public const long MaxBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png"
    };

    private static readonly HashSet<string> UncompressedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png"
    };

    private readonly string _productsRoot;
    private readonly IImageCompressionService _compression;
    private readonly AppDbContext _db;

    public MediaUploadService(
        IWebHostEnvironment environment,
        IOptions<MediaStorageOptions> options,
        IImageCompressionService compression,
        AppDbContext db)
    {
        _productsRoot = Path.Combine(ResolveUploadsRoot(environment, options.Value), "products");
        _compression = compression;
        _db = db;
    }

    public static string ResolveUploadsRoot(IWebHostEnvironment environment, MediaStorageOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.RootPath))
        {
            return Path.GetFullPath(options.RootPath.Trim());
        }

        return Path.Combine(environment.ContentRootPath, "wwwroot", "uploads");
    }

    public async Task<string> SaveProductImageAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            throw new BadRequestException("Файл зображення порожній.");
        }

        if (file.Length > MaxBytes)
        {
            throw new BadRequestException("Зображення має бути не більше 5 МБ.");
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            throw new BadRequestException("Дозволені лише JPG та PNG.");
        }

        var extension = DetectExtension(file)
            ?? throw new BadRequestException("Дозволені лише JPG та PNG.");

        Directory.CreateDirectory(_productsRoot);

        await using var input = file.OpenReadStream();
        await using var compressed = await _compression.CompressAsync(
            input,
            file.FileName is { Length: > 0 } name ? name : $"image{extension}",
            cancellationToken);

        var storedExtension = ".webp";
        var fileName = $"{Guid.NewGuid():N}{storedExtension}";
        var fullPath = Path.Combine(_productsRoot, fileName);

        await using (var stream = File.Create(fullPath))
        {
            await compressed.CopyToAsync(stream, cancellationToken);
        }

        return $"/uploads/products/{fileName}";
    }

    public IReadOnlyList<string> ListUncompressedProductImages()
    {
        if (!Directory.Exists(_productsRoot))
        {
            return [];
        }

        return Directory.EnumerateFiles(_productsRoot)
            .Select(Path.GetFileName)
            .Where(name => name is not null && IsUncompressedExtension(Path.GetExtension(name)))
            .Cast<string>()
            .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<CompressImageResultDto> CompressExistingProductImageAsync(
        string fileName,
        CancellationToken cancellationToken)
    {
        var safeName = ValidateExistingFileName(fileName);
        var extension = Path.GetExtension(safeName);

        if (extension.Equals(".webp", StringComparison.OrdinalIgnoreCase))
        {
            throw new BadRequestException("Файл вже стиснений");
        }

        if (!IsUncompressedExtension(extension))
        {
            throw new BadRequestException("Непідтримуваний формат");
        }

        var originalPath = Path.Combine(_productsRoot, safeName);
        if (!File.Exists(originalPath))
        {
            throw new NotFoundException("Файл не знайдено.");
        }

        var newFileName = Path.GetFileNameWithoutExtension(safeName) + ".webp";
        var destPath = Path.Combine(_productsRoot, newFileName);
        var originalKb = new FileInfo(originalPath).Length / 1024;

        await using (var input = File.OpenRead(originalPath))
        await using (var compressed = await _compression.CompressAsync(input, safeName, cancellationToken))
        await using (var output = File.Create(destPath))
        {
            await compressed.CopyToAsync(output, cancellationToken);
        }

        var compressedKb = new FileInfo(destPath).Length / 1024;
        var oldUrl = "/uploads/products/" + safeName;
        var newUrl = "/uploads/products/" + newFileName;
        var dbUpdated = await UpdateImageReferencesAsync(oldUrl, newUrl, cancellationToken);

        File.Delete(originalPath);

        return new CompressImageResultDto(safeName, newFileName, originalKb, compressedKb, dbUpdated);
    }

    public async Task<CompressAllImagesResultDto> CompressAllUncompressedProductImagesAsync(
        CancellationToken cancellationToken)
    {
        var files = ListUncompressedProductImages();
        var processed = 0;
        var failed = 0;
        var savedKb = 0L;
        var errors = new List<string>();

        foreach (var name in files)
        {
            try
            {
                var result = await CompressExistingProductImageAsync(name, cancellationToken);
                processed++;
                savedKb += Math.Max(0, result.OriginalKb - result.CompressedKb);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch
            {
                failed++;
                errors.Add(name);
            }
        }

        return new CompressAllImagesResultDto(processed, failed, savedKb, [.. errors]);
    }

    private async Task<int> UpdateImageReferencesAsync(
        string oldUrl,
        string newUrl,
        CancellationToken cancellationToken)
    {
        var dbUpdated = 0;

        var products = await _db.Products
            .Where(p => p.ImageUrl == oldUrl || p.ImageUrls.Contains(oldUrl))
            .ToListAsync(cancellationToken);

        foreach (var product in products)
        {
            if (product.ImageUrl == oldUrl)
            {
                product.ImageUrl = newUrl;
                dbUpdated++;
            }

            if (product.ImageUrls.Contains(oldUrl))
            {
                product.ImageUrls = product.ImageUrls
                    .Select(url => url == oldUrl ? newUrl : url)
                    .ToArray();
                dbUpdated++;
            }
        }

        var posts = await _db.NewsPosts
            .Where(n => n.CoverImageUrl == oldUrl)
            .ToListAsync(cancellationToken);

        foreach (var post in posts)
        {
            post.CoverImageUrl = newUrl;
            dbUpdated++;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return dbUpdated;
    }

    private static string ValidateExistingFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            throw new BadRequestException("Непідтримуваний формат");
        }

        var safeName = Path.GetFileName(fileName.Trim());
        if (string.IsNullOrWhiteSpace(safeName)
            || !string.Equals(safeName, fileName.Trim(), StringComparison.Ordinal))
        {
            throw new BadRequestException("Непідтримуваний формат");
        }

        return safeName;
    }

    private static bool IsUncompressedExtension(string extension) =>
        UncompressedExtensions.Contains(extension);

    private static string? DetectExtension(IFormFile file)
    {
        Span<byte> header = stackalloc byte[8];
        using var stream = file.OpenReadStream();
        var read = stream.Read(header);
        if (read < 3)
        {
            return null;
        }

        if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return ".jpg";
        }

        if (read >= 8
            && header[0] == 0x89
            && header[1] == 0x50
            && header[2] == 0x4E
            && header[3] == 0x47
            && header[4] == 0x0D
            && header[5] == 0x0A
            && header[6] == 0x1A
            && header[7] == 0x0A)
        {
            return ".png";
        }

        return null;
    }
}

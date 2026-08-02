using FaynoShop.API.Exceptions;
using FaynoShop.API.Options;
using Microsoft.Extensions.Options;

namespace FaynoShop.API.Services;

public interface IMediaUploadService
{
    Task<string> SaveProductImageAsync(IFormFile file, CancellationToken cancellationToken);
}

public sealed class MediaUploadService : IMediaUploadService
{
    public const long MaxBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png"
    };

    private readonly string _productsRoot;

    public MediaUploadService(IWebHostEnvironment environment, IOptions<MediaStorageOptions> options)
    {
        _productsRoot = Path.Combine(ResolveUploadsRoot(environment, options.Value), "products");
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

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(_productsRoot, fileName);

        await using (var stream = File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return $"/uploads/products/{fileName}";
    }

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

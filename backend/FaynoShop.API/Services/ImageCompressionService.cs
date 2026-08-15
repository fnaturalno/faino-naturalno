using FaynoShop.API.Exceptions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace FaynoShop.API.Services;

public interface IImageCompressionService
{
    Task<Stream> CompressAsync(Stream input, string fileName, CancellationToken ct);
}

public sealed class ImageCompressionService : IImageCompressionService
{
    private const int MaxDimension = 500;

    public async Task<Stream> CompressAsync(Stream input, string fileName, CancellationToken ct)
    {
        await using var original = new MemoryStream();
        await input.CopyToAsync(original, ct);
        original.Position = 0;

        Image image;
        try
        {
            image = await Image.LoadAsync(original, ct);
        }
        catch (UnknownImageFormatException)
        {
            throw new BadRequestException("Дозволені лише JPG та PNG.");
        }
        catch (InvalidImageContentException)
        {
            throw new BadRequestException("Файл зображення пошкоджений.");
        }

        using (image)
        {
            var isWebp = IsWebp(fileName);
            var needsResize = image.Width > MaxDimension || image.Height > MaxDimension;

            if (isWebp && !needsResize)
            {
                original.Position = 0;
                var passthrough = new MemoryStream();
                await original.CopyToAsync(passthrough, ct);
                passthrough.Position = 0;
                return passthrough;
            }

            if (needsResize)
            {
                image.Mutate(ctx => ctx.Resize(new ResizeOptions
                {
                    Size = new Size(MaxDimension, MaxDimension),
                    Mode = ResizeMode.Max,
                }));
            }

            var output = new MemoryStream();
            await image.SaveAsync(output, new WebpEncoder { Quality = 80 }, ct);
            output.Position = 0;
            return output;
        }
    }

    private static bool IsWebp(string fileName) =>
        Path.GetExtension(fileName).Equals(".webp", StringComparison.OrdinalIgnoreCase);
}

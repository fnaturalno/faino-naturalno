namespace FaynoShop.API.Security;

/// <summary>
/// Defense-in-depth filter for product/category image URLs returned to clients.
/// Blocks javascript:, data:, and other non-http(s) schemes that could abuse &lt;img src&gt;.
/// </summary>
public static class MediaUrlGuard
{
    public static string? Sanitize(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        var trimmed = url.Trim();

        // Same-origin relative paths only (reject protocol-relative //host).
        if (trimmed.StartsWith('/') && !trimmed.StartsWith("//", StringComparison.Ordinal))
        {
            return trimmed.Length <= 500 ? trimmed : null;
        }

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            return null;
        }

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            return null;
        }

        return trimmed.Length <= 500 ? trimmed : null;
    }

    public static string[] SanitizeMany(IEnumerable<string>? urls)
    {
        if (urls is null)
        {
            return [];
        }

        return urls
            .Select(Sanitize)
            .Where(u => u is not null)
            .Cast<string>()
            .ToArray();
    }
}

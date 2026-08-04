namespace FaynoShop.API.Localization;

/// <summary>
/// Resolves API content locale: <c>?locale=</c> → Accept-Language → <see cref="Locales.Default"/>.
/// </summary>
public static class LocaleResolver
{
    public static string Resolve(string? queryLocale, string? acceptLanguage)
    {
        if (TryNormalize(queryLocale, out var fromQuery))
        {
            return fromQuery;
        }

        if (!string.IsNullOrWhiteSpace(acceptLanguage))
        {
            foreach (var segment in acceptLanguage.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
            {
                var tag = segment.Split(';', 2, StringSplitOptions.TrimEntries)[0];
                if (TryNormalize(tag, out var fromHeader))
                {
                    return fromHeader;
                }
            }
        }

        return Locales.Default;
    }

    /// <summary>
    /// Accepts <c>ua</c>/<c>uk</c>/<c>en</c> (case-insensitive) or prefixes like <c>uk-UA</c>/<c>en-US</c>/<c>ua</c>.
    /// Legacy <c>uk</c> query values map to <see cref="Locales.Ua"/>.
    /// Invalid values are ignored (caller continues resolution).
    /// </summary>
    public static bool TryNormalize(string? value, out string locale)
    {
        locale = Locales.Default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var trimmed = value.Trim();
        if (trimmed.StartsWith("ua", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("uk", StringComparison.OrdinalIgnoreCase))
        {
            locale = Locales.Ua;
            return true;
        }

        if (trimmed.StartsWith("en", StringComparison.OrdinalIgnoreCase))
        {
            locale = Locales.En;
            return true;
        }

        return false;
    }
}

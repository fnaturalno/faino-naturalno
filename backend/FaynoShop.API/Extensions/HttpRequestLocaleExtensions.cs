using FaynoShop.API.Localization;

namespace FaynoShop.API.Extensions;

public static class HttpRequestLocaleExtensions
{
    /// <summary>
    /// Resolves content locale from optional <paramref name="queryLocale"/> (or <c>?locale=</c>)
    /// then Accept-Language, falling back to Ukrainian.
    /// </summary>
    public static string ResolveLocale(this HttpRequest request, string? queryLocale = null)
    {
        var fromQuery = queryLocale ?? request.Query["locale"].FirstOrDefault();
        var acceptLanguage = request.Headers.AcceptLanguage.ToString();
        return LocaleResolver.Resolve(fromQuery, acceptLanguage);
    }
}

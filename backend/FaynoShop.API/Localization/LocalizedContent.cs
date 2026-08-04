namespace FaynoShop.API.Localization;

/// <summary>
/// Picks UK/EN display text: EN when locale is en and the English value is non-empty; otherwise UK.
/// </summary>
public static class LocalizedContent
{
    public static string Pick(string locale, string uk, string? en) =>
        IsEnglish(locale) && !string.IsNullOrWhiteSpace(en) ? en.Trim() : uk;

    public static string? PickOptional(string locale, string? uk, string? en) =>
        IsEnglish(locale) && !string.IsNullOrWhiteSpace(en)
            ? en.Trim()
            : (string.IsNullOrWhiteSpace(uk) ? null : uk);

    public static bool IsEnglish(string locale) =>
        string.Equals(locale, Locales.En, StringComparison.OrdinalIgnoreCase);
}

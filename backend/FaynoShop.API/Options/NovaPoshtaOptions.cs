namespace FaynoShop.API.Options;

/// <summary>
/// Nova Poshta integration. When <see cref="ApiKey"/> is empty, the mock provider is used
/// (realistic UA cities/branches for local/dev). Set an API key to call the live NP API.
/// </summary>
public sealed class NovaPoshtaOptions
{
    public const string SectionName = "NovaPoshta";

    /// <summary>NP API key. Empty or whitespace → mock provider.</summary>
    public string? ApiKey { get; set; }
}

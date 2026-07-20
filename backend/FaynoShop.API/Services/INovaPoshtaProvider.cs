using FaynoShop.API.DTOs.Shipping;

namespace FaynoShop.API.Services;

/// <summary>
/// Nova Poshta city/branch lookup. Implementations: mock (no API key) or live NP API.
/// </summary>
public interface INovaPoshtaProvider
{
    /// <summary>Provider id for diagnostics: "mock" | "api".</summary>
    string ProviderName { get; }

    Task<IReadOnlyList<NpCityDto>> SearchCitiesAsync(string query, CancellationToken cancellationToken);

    Task<IReadOnlyList<NpBranchDto>> GetBranchesAsync(string cityId, CancellationToken cancellationToken);
}

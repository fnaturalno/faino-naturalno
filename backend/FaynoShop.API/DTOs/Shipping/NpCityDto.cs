namespace FaynoShop.API.DTOs.Shipping;

/// <summary>Nova Poshta city search hit for profile address autocomplete.</summary>
public sealed record NpCityDto(
    string CityId,
    string CityName,
    string? Region);

namespace FaynoShop.API.DTOs.Auth;

public sealed record DeliveryAddressDto(
    string CityId,
    string CityName,
    string? CityRegion,
    string BranchId,
    string BranchLabel,
    string Summary);

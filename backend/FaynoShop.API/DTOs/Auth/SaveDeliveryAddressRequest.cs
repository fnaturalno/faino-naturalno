namespace FaynoShop.API.DTOs.Auth;

public sealed class SaveDeliveryAddressRequest
{
    public string CityId { get; set; } = string.Empty;
    public string CityName { get; set; } = string.Empty;
    public string? CityRegion { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string BranchLabel { get; set; } = string.Empty;
    public string? Summary { get; set; }
}

namespace FaynoShop.API.DTOs.Orders;

public sealed class PlaceOrderRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary><c>nova-poshta</c> | <c>pickup</c> | <c>ukrposhta</c>.</summary>
    public string DeliveryMethod { get; set; } = string.Empty;

    public string CityId { get; set; } = string.Empty;
    public string CityName { get; set; } = string.Empty;
    public string? CityRegion { get; set; }
    public string BranchId { get; set; } = string.Empty;
    public string BranchLabel { get; set; } = string.Empty;

    /// <summary>Free-text address for Ukrposhta (required when method is ukrposhta).</summary>
    public string? StreetAddress { get; set; }

    /// <summary>Optional client hint; server composes the stored address.</summary>
    public string DeliveryAddress { get; set; } = string.Empty;
    public string? Comment { get; set; }
}

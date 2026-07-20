namespace FaynoShop.API.Models;

/// <summary>
/// Nova Poshta delivery address saved on the user profile (1:1).
/// Absence of a row means the user has never saved an address.
/// </summary>
public class UserDeliveryAddress
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public required string CityId { get; set; }
    public required string CityName { get; set; }
    public string? CityRegion { get; set; }
    public required string BranchId { get; set; }
    public required string BranchLabel { get; set; }
    public required string Summary { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}

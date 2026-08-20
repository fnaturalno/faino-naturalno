namespace FaynoShop.API.Models;

/// <summary>Checkout delivery method values stored on <see cref="Order.DeliveryMethod"/>.</summary>
public static class DeliveryMethods
{
    public const string NovaPoshta = "nova-poshta";
    public const string Pickup = "pickup";
    public const string Ukrposhta = "ukrposhta";

    public const string PickupAddressUa =
        "Самовивіз · м. Берегове, Центральний ринок, овочевий павільйон";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        NovaPoshta,
        Pickup,
        Ukrposhta
    };

    public static bool IsKnown(string? value) =>
        !string.IsNullOrWhiteSpace(value) && All.Contains(value.Trim());

    public static string Normalize(string value) => value.Trim().ToLowerInvariant();
}

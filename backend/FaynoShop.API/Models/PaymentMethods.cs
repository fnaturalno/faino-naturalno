namespace FaynoShop.API.Models;

/// <summary>Checkout payment method values stored on <see cref="Order.PaymentMethod"/>.</summary>
public static class PaymentMethods
{
    public const string PrivatCard = "privat-card";
    public const string OtherBankCard = "other-bank-card";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        PrivatCard,
        OtherBankCard
    };

    public static bool IsKnown(string? value) =>
        !string.IsNullOrWhiteSpace(value) && All.Contains(value.Trim());

    public static string Normalize(string value) => value.Trim().ToLowerInvariant();
}

namespace FaynoShop.API.Services.Telegram.Models;

/// <summary>One line in a Telegram order alert.</summary>
/// <param name="Name">Product display name (UK).</param>
/// <param name="Quantity">Line quantity.</param>
/// <param name="UnitPrice">Unit price snapshot.</param>
public sealed record TelegramOrderLine(string Name, int Quantity, decimal UnitPrice);

/// <summary>Payload for an admin Telegram notification after a successful place-order.</summary>
/// <param name="OrderId">Database id.</param>
/// <param name="OrderNumber">Human-readable number (e.g. FN-2026-0042).</param>
/// <param name="CustomerName">Recipient full name.</param>
/// <param name="CustomerPhone">Recipient phone.</param>
/// <param name="DeliveryMethod">nova-poshta | pickup | ukrposhta (legacy: city).</param>
/// <param name="DeliveryAddress">Server-composed delivery summary.</param>
/// <param name="Items">Order lines.</param>
/// <param name="Total">Order total (subtotal; no delivery fee).</param>
public sealed record OrderNotification(
    int OrderId,
    string OrderNumber,
    string CustomerName,
    string CustomerPhone,
    string DeliveryMethod,
    string DeliveryAddress,
    IReadOnlyList<TelegramOrderLine> Items,
    decimal Total);

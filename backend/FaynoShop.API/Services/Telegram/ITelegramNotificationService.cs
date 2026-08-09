using FaynoShop.API.Services.Telegram.Models;

namespace FaynoShop.API.Services.Telegram;

/// <summary>Sends outbound Telegram messages to the configured admin chat (no webhook).</summary>
public interface ITelegramNotificationService
{
    /// <summary>
    /// Notifies the admin about a new order. Never throws; failures are logged only.
    /// </summary>
    Task SendOrderNotificationAsync(OrderNotification order, CancellationToken cancellationToken = default);
}

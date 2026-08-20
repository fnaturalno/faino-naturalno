using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using FaynoShop.API.Options;
using FaynoShop.API.Services.Telegram.Models;
using Microsoft.Extensions.Options;

namespace FaynoShop.API.Services.Telegram;

/// <summary>
/// Posts HTML order alerts via Telegram Bot API <c>sendMessage</c>.
/// Missing config or API errors are logged and swallowed.
/// </summary>
public sealed class TelegramNotificationService : ITelegramNotificationService
{
    private readonly HttpClient _http;
    private readonly TelegramOptions _options;
    private readonly ILogger<TelegramNotificationService> _logger;

    /// <summary>Creates a Telegram notification sender.</summary>
    public TelegramNotificationService(
        HttpClient http,
        IOptions<TelegramOptions> options,
        ILogger<TelegramNotificationService> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task SendOrderNotificationAsync(
        OrderNotification order,
        CancellationToken cancellationToken = default)
    {
        var token = _options.BotToken?.Trim() ?? string.Empty;
        var chatId = _options.AdminChatId?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(chatId))
        {
            _logger.LogWarning(
                "Telegram order alert skipped for {OrderNumber}: BotToken or AdminChatId is empty.",
                order.OrderNumber);
            return;
        }

        try
        {
            var payload = new SendMessageRequest(
                chatId,
                BuildMessage(order),
                "HTML");

            using var response = await _http.PostAsJsonAsync(
                $"https://api.telegram.org/bot{token}/sendMessage",
                payload,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError(
                    "Telegram sendMessage failed for {OrderNumber}: {StatusCode} {Body}",
                    order.OrderNumber,
                    (int)response.StatusCode,
                    body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Telegram sendMessage threw for {OrderNumber}", order.OrderNumber);
        }
    }

    private static string BuildMessage(OrderNotification order)
    {
        var sb = new StringBuilder();
        sb.Append("🛍 <b>Нове замовлення #").Append(Escape(order.OrderNumber)).Append("</b>\n\n");
        sb.Append("👤 ").Append(Escape(order.CustomerName)).Append('\n');
        sb.Append("📞 ").Append(Escape(order.CustomerPhone)).Append("\n\n");
        sb.Append("🚚 ").Append(Escape(FormatMethod(order.DeliveryMethod))).Append('\n');
        sb.Append(Escape(order.DeliveryAddress)).Append("\n\n");
        sb.Append("📦 <b>Товари:</b>\n");

        foreach (var item in order.Items)
        {
            var lineTotal = item.UnitPrice * item.Quantity;
            sb.Append("  • ")
                .Append(Escape(item.Name))
                .Append(" × ")
                .Append(item.Quantity)
                .Append(" — <b>")
                .Append(FormatMoney(lineTotal))
                .Append(" грн</b>\n");
        }

        sb.Append('\n')
            .Append("💰 <b>Разом: ")
            .Append(FormatMoney(order.Total))
            .Append(" грн</b>");

        return sb.ToString();
    }

    private static string FormatMethod(string method) =>
        method switch
        {
            "pickup" => "Самовивіз",
            "ukrposhta" => "Укрпошта",
            "city" => "Доставка по Береговому",
            "nova-poshta" => "Нова Пошта",
            _ => method
        };

    private static string FormatMoney(decimal value) =>
        value.ToString("0.##", CultureInfo.InvariantCulture);

    private static string Escape(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        return value
            .Replace("&", "&amp;", StringComparison.Ordinal)
            .Replace("<", "&lt;", StringComparison.Ordinal)
            .Replace(">", "&gt;", StringComparison.Ordinal);
    }

    private sealed record SendMessageRequest(
        [property: JsonPropertyName("chat_id")] string ChatId,
        [property: JsonPropertyName("text")] string Text,
        [property: JsonPropertyName("parse_mode")] string ParseMode);
}

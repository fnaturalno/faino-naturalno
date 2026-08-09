namespace FaynoShop.API.Options;

/// <summary>
/// Telegram Bot API settings for admin order alerts.
/// Empty <see cref="BotToken"/> or <see cref="AdminChatId"/> disables sending (warning logged).
/// Set via env / user-secrets: <c>Telegram__BotToken</c>, <c>Telegram__AdminChatId</c>.
/// </summary>
public sealed class TelegramOptions
{
    public const string SectionName = "Telegram";

    /// <summary>Bot token from @BotFather.</summary>
    public string BotToken { get; set; } = string.Empty;

    /// <summary>Numeric chat id of the admin (or group) that receives alerts.</summary>
    public string AdminChatId { get; set; } = string.Empty;
}

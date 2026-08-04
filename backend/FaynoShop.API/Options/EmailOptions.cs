namespace FaynoShop.API.Options;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>From address used for outbound mail (e.g. noreply@fayno.shop).</summary>
    public string From { get; set; } = "noreply@fayno.local";

    public SmtpOptions Smtp { get; set; } = new();
}

public sealed class SmtpOptions
{
    /// <summary>When empty, the API uses log-only email (no real delivery).</summary>
    public string Host { get; set; } = "";

    public int Port { get; set; } = 587;

    public string Username { get; set; } = "";

    public string Password { get; set; } = "";

    public bool UseSsl { get; set; } = true;
}

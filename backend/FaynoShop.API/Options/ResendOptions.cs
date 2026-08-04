namespace FaynoShop.API.Options;

public sealed class ResendOptions
{
    public const string SectionName = "Resend";

    /// <summary>Resend API token. Empty → log-only email stub (no delivery).</summary>
    public string ApiToken { get; set; } = "";
}

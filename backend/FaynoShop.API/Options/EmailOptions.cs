namespace FaynoShop.API.Options;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>
    /// From address for outbound mail.
    /// Format: <c>Файно натурально &lt;noreply@f-n.fun&gt;</c> or a bare email.
    /// </summary>
    public string From { get; set; } = "Файно натурально <noreply@fayno.local>";
}

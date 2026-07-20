using System.ComponentModel.DataAnnotations;

namespace FaynoShop.API.Options;

public sealed class AppOptions
{
    public const string SectionName = "App";

    /// <summary>Frontend origin used to build password-reset links in emails.</summary>
    [Required]
    [Url]
    public string FrontendBaseUrl { get; set; } = "http://localhost:4200";

    [Range(1, 72)]
    public int PasswordResetTokenHours { get; set; } = 1;
}

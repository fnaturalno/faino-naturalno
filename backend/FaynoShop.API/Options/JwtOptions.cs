using System.ComponentModel.DataAnnotations;

namespace FaynoShop.API.Options;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    [MinLength(32)]
    public string Key { get; set; } = string.Empty;

    [Required]
    public string Issuer { get; set; } = "FaynoShop";

    [Required]
    public string Audience { get; set; } = "FaynoShop";

    [Range(1, 1440)]
    public int AccessTokenMinutes { get; set; } = 15;

    [Range(1, 365)]
    public int RefreshTokenDays { get; set; } = 14;
}

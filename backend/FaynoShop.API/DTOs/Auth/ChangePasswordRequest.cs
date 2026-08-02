namespace FaynoShop.API.DTOs.Auth;

public sealed class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;

    /// <summary>
    /// Current device refresh token. When provided, that session stays valid
    /// while all other refresh sessions are revoked.
    /// </summary>
    public string? RefreshToken { get; set; }
}

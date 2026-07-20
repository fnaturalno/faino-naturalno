namespace FaynoShop.API.DTOs.Auth;

public sealed class ResetPasswordRequest
{
    public string Token { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

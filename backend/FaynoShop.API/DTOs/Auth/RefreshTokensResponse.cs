namespace FaynoShop.API.DTOs.Auth;

public sealed record RefreshTokensResponse(
    string AccessToken,
    string RefreshToken);

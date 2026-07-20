namespace FaynoShop.API.DTOs.Auth;

public sealed record AuthTokensResponse(
    string AccessToken,
    string RefreshToken,
    UserDto User);

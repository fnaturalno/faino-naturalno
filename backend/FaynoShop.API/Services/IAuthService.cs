using FaynoShop.API.DTOs.Auth;
using FaynoShop.API.Models;

namespace FaynoShop.API.Services;

public interface IAuthService
{
    Task<AuthTokensResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthTokensResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<RefreshTokensResponse> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken);
    Task LogoutAsync(int userId, LogoutRequest request, CancellationToken cancellationToken);
    Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken);
    Task<UserDto> GetMeAsync(int userId, CancellationToken cancellationToken);
    Task<UserDto> UpdateMeAsync(int userId, UpdateProfileRequest request, CancellationToken cancellationToken);
    Task<DeliveryAddressDto?> GetDeliveryAddressAsync(int userId, CancellationToken cancellationToken);
    Task<DeliveryAddressDto> SaveDeliveryAddressAsync(
        int userId,
        SaveDeliveryAddressRequest request,
        CancellationToken cancellationToken);
}

public static class UserMapping
{
    public static UserDto ToDto(User user) => new(
        user.Id,
        user.FirstName,
        user.LastName,
        user.Email,
        user.Phone,
        user.CreatedAt,
        user.IsAdmin);
}

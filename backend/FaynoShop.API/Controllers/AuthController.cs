using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Auth;
using FaynoShop.API.Extensions;
using FaynoShop.API.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FaynoShop.API.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<RefreshRequest> _refreshValidator;
    private readonly IValidator<LogoutRequest> _logoutValidator;
    private readonly IValidator<ForgotPasswordRequest> _forgotValidator;
    private readonly IValidator<ResetPasswordRequest> _resetValidator;
    private readonly IValidator<UpdateProfileRequest> _updateProfileValidator;
    private readonly IValidator<SaveDeliveryAddressRequest> _saveAddressValidator;

    public AuthController(
        IAuthService auth,
        IValidator<RegisterRequest> registerValidator,
        IValidator<LoginRequest> loginValidator,
        IValidator<RefreshRequest> refreshValidator,
        IValidator<LogoutRequest> logoutValidator,
        IValidator<ForgotPasswordRequest> forgotValidator,
        IValidator<ResetPasswordRequest> resetValidator,
        IValidator<UpdateProfileRequest> updateProfileValidator,
        IValidator<SaveDeliveryAddressRequest> saveAddressValidator)
    {
        _auth = auth;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
        _refreshValidator = refreshValidator;
        _logoutValidator = logoutValidator;
        _forgotValidator = forgotValidator;
        _resetValidator = resetValidator;
        _updateProfileValidator = updateProfileValidator;
        _saveAddressValidator = saveAddressValidator;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthStrictPolicy)]
    [ProducesResponseType(typeof(ApiResponse<AuthTokensResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<AuthTokensResponse>>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        await _registerValidator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _auth.RegisterAsync(request, cancellationToken);
        return Ok(ApiResponse<AuthTokensResponse>.Ok(data));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthStrictPolicy)]
    [ProducesResponseType(typeof(ApiResponse<AuthTokensResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<AuthTokensResponse>>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        await _loginValidator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _auth.LoginAsync(request, cancellationToken);
        return Ok(ApiResponse<AuthTokensResponse>.Ok(data));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthStrictPolicy)]
    [ProducesResponseType(typeof(ApiResponse<RefreshTokensResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<RefreshTokensResponse>>> Refresh(
        [FromBody] RefreshRequest request,
        CancellationToken cancellationToken)
    {
        await _refreshValidator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _auth.RefreshAsync(request, cancellationToken);
        return Ok(ApiResponse<RefreshTokensResponse>.Ok(data));
    }

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> Logout(
        [FromBody] LogoutRequest request,
        CancellationToken cancellationToken)
    {
        await _logoutValidator.ValidateAndThrowAsync(request, cancellationToken);
        await _auth.LogoutAsync(User.GetRequiredUserId(), request, cancellationToken);
        return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse("Ви вийшли.")));
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthForgotPolicy)]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        CancellationToken cancellationToken)
    {
        await _forgotValidator.ValidateAndThrowAsync(request, cancellationToken);
        await _auth.ForgotPasswordAsync(request, cancellationToken);
        return Ok(ApiResponse<MessageResponse>.Ok(
            new MessageResponse("Якщо акаунт існує, лист для скидання пароля надіслано.")));
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthStrictPolicy)]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<MessageResponse>>> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        await _resetValidator.ValidateAndThrowAsync(request, cancellationToken);
        await _auth.ResetPasswordAsync(request, cancellationToken);
        return Ok(ApiResponse<MessageResponse>.Ok(new MessageResponse("Пароль оновлено.")));
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetMe(CancellationToken cancellationToken)
    {
        var data = await _auth.GetMeAsync(User.GetRequiredUserId(), cancellationToken);
        return Ok(ApiResponse<UserDto>.Ok(data));
    }

    [HttpPut("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateMe(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        await _updateProfileValidator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _auth.UpdateMeAsync(User.GetRequiredUserId(), request, cancellationToken);
        return Ok(ApiResponse<UserDto>.Ok(data));
    }

    [HttpGet("me/delivery-address")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<DeliveryAddressDto?>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<DeliveryAddressDto?>>> GetDeliveryAddress(
        CancellationToken cancellationToken)
    {
        var data = await _auth.GetDeliveryAddressAsync(User.GetRequiredUserId(), cancellationToken);
        return Ok(ApiResponse<DeliveryAddressDto?>.Ok(data));
    }

    [HttpPut("me/delivery-address")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<DeliveryAddressDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<DeliveryAddressDto>>> SaveDeliveryAddress(
        [FromBody] SaveDeliveryAddressRequest request,
        CancellationToken cancellationToken)
    {
        await _saveAddressValidator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _auth.SaveDeliveryAddressAsync(
            User.GetRequiredUserId(),
            request,
            cancellationToken);
        return Ok(ApiResponse<DeliveryAddressDto>.Ok(data));
    }
}

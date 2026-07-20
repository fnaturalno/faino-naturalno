using FaynoShop.API.Constants;
using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Cart;
using FaynoShop.API.Extensions;
using FaynoShop.API.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FaynoShop.API.Controllers;

[ApiController]
[Route("api/cart")]
[Produces("application/json")]
public sealed class CartController : ControllerBase
{
    private readonly ICartService _cartService;
    private readonly IValidator<AddCartItemRequest> _validator;

    public CartController(ICartService cartService, IValidator<AddCartItemRequest> validator)
    {
        _cartService = cartService;
        _validator = validator;
    }

    /// <summary>
    /// Adds one or more units of a product to the anonymous browser cart.
    /// Send a stable UUID in header <c>X-Cart-Session-Id</c> (format 8-4-4-4-12).
    /// Quantity defaults to 1 when omitted; catalog adds 1, product page may send stepper quantity.
    /// Out-of-stock and overselling (beyond remaining stock capacity) are rejected.
    /// </summary>
    [HttpPost("items")]
    [EnableRateLimiting(RateLimitingExtensions.CartMutationPolicy)]
    [ProducesResponseType(typeof(ApiResponse<AddCartItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<AddCartItemResponse>>> AddItem(
        [FromBody] AddCartItemRequest request,
        [FromHeader(Name = CartSessionHeaders.SessionId)] string? sessionId,
        CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(request, cancellationToken);

        var data = await _cartService.AddItemAsync(sessionId ?? string.Empty, request, cancellationToken);
        return Ok(ApiResponse<AddCartItemResponse>.Ok(data));
    }

    /// <summary>
    /// Merges guest cart (<c>X-Cart-Session-Id</c>) into the authenticated user's cart.
    /// Call after successful login/register. No confirmation dialog.
    /// </summary>
    [HttpPost("merge")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<MergeCartResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<MergeCartResponse>>> Merge(
        [FromHeader(Name = CartSessionHeaders.SessionId)] string? sessionId,
        CancellationToken cancellationToken)
    {
        var data = await _cartService.MergeGuestCartAsync(
            User.GetRequiredUserId(),
            sessionId ?? string.Empty,
            cancellationToken);
        return Ok(ApiResponse<MergeCartResponse>.Ok(data));
    }
}

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
    private readonly IValidator<AddCartItemRequest> _addValidator;
    private readonly IValidator<UpdateCartItemRequest> _updateValidator;

    public CartController(
        ICartService cartService,
        IValidator<AddCartItemRequest> addValidator,
        IValidator<UpdateCartItemRequest> updateValidator)
    {
        _cartService = cartService;
        _addValidator = addValidator;
        _updateValidator = updateValidator;
    }

    /// <summary>
    /// Returns the current cart with live prices, stock, and availability flags.
    /// Send <c>X-Cart-Session-Id</c>. When authenticated after merge, the user cart is preferred.
    /// An empty cart is a successful empty payload.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<CartDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<CartDto>>> GetCart(
        [FromHeader(Name = CartSessionHeaders.SessionId)] string? sessionId,
        CancellationToken cancellationToken)
    {
        var data = await _cartService.GetCartAsync(
            sessionId ?? string.Empty,
            OptionalUserId(),
            cancellationToken);
        return Ok(ApiResponse<CartDto>.Ok(data));
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
        await _addValidator.ValidateAndThrowAsync(request, cancellationToken);

        var data = await _cartService.AddItemAsync(
            sessionId ?? string.Empty,
            OptionalUserId(),
            request,
            cancellationToken);
        return Ok(ApiResponse<AddCartItemResponse>.Ok(data));
    }

    /// <summary>
    /// Updates line quantity (1‥min(stock, 12)). Returns the full cart for client refresh.
    /// </summary>
    [HttpPut("items/{id:int}")]
    [EnableRateLimiting(RateLimitingExtensions.CartMutationPolicy)]
    [ProducesResponseType(typeof(ApiResponse<CartDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<CartDto>>> UpdateItem(
        int id,
        [FromBody] UpdateCartItemRequest request,
        [FromHeader(Name = CartSessionHeaders.SessionId)] string? sessionId,
        CancellationToken cancellationToken)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var data = await _cartService.UpdateItemQuantityAsync(
            sessionId ?? string.Empty,
            OptionalUserId(),
            id,
            request,
            cancellationToken);
        return Ok(ApiResponse<CartDto>.Ok(data));
    }

    /// <summary>Removes a cart line and returns the updated cart.</summary>
    [HttpDelete("items/{id:int}")]
    [EnableRateLimiting(RateLimitingExtensions.CartMutationPolicy)]
    [ProducesResponseType(typeof(ApiResponse<CartDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<CartDto>>> RemoveItem(
        int id,
        [FromHeader(Name = CartSessionHeaders.SessionId)] string? sessionId,
        CancellationToken cancellationToken)
    {
        var data = await _cartService.RemoveItemAsync(
            sessionId ?? string.Empty,
            OptionalUserId(),
            id,
            cancellationToken);
        return Ok(ApiResponse<CartDto>.Ok(data));
    }

    /// <summary>
    /// Clears all lines for the current cart. API capability only (no clear-all UI in this feature).
    /// </summary>
    [HttpDelete]
    [EnableRateLimiting(RateLimitingExtensions.CartMutationPolicy)]
    [ProducesResponseType(typeof(ApiResponse<CartDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<CartDto>>> ClearCart(
        [FromHeader(Name = CartSessionHeaders.SessionId)] string? sessionId,
        CancellationToken cancellationToken)
    {
        var data = await _cartService.ClearCartAsync(
            sessionId ?? string.Empty,
            OptionalUserId(),
            cancellationToken);
        return Ok(ApiResponse<CartDto>.Ok(data));
    }

    /// <summary>
    /// Merges guest cart (<c>X-Cart-Session-Id</c>) into the authenticated user's cart.
    /// Call after successful login/register. No confirmation dialog.
    /// Carts already owned by another user are ignored (no takeover).
    /// </summary>
    [HttpPost("merge")]
    [Authorize]
    [EnableRateLimiting(RateLimitingExtensions.CartMutationPolicy)]
    [ProducesResponseType(typeof(ApiResponse<MergeCartResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
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

    private int? OptionalUserId() =>
        User.TryGetUserId(out var userId) ? userId : null;
}

using FaynoShop.API.Constants;
using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Orders;
using FaynoShop.API.Extensions;
using FaynoShop.API.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FaynoShop.API.Controllers;

[ApiController]
[Route("api/orders")]
[Produces("application/json")]
public sealed class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;
    private readonly IValidator<PlaceOrderRequest> _placeValidator;

    public OrdersController(
        IOrderService orders,
        IValidator<PlaceOrderRequest> placeValidator)
    {
        _orders = orders;
        _placeValidator = placeValidator;
    }

    /// <summary>
    /// Places an order from the current server cart (guest or authenticated).
    /// Requires <c>X-Cart-Session-Id</c>. Optional JWT links the order to the user.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitingExtensions.PlaceOrderPolicy)]
    [ProducesResponseType(typeof(ApiResponse<PlaceOrderResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<PlaceOrderResponse>>> PlaceOrder(
        [FromBody] PlaceOrderRequest request,
        [FromHeader(Name = CartSessionHeaders.SessionId)] string? sessionId,
        CancellationToken cancellationToken)
    {
        await _placeValidator.ValidateAndThrowAsync(request, cancellationToken);

        var data = await _orders.PlaceOrderAsync(
            sessionId ?? string.Empty,
            OptionalUserId(),
            request,
            cancellationToken);
        return Ok(ApiResponse<PlaceOrderResponse>.Ok(data));
    }

    /// <summary>
    /// Order confirmation details. Requires opaque <c>?token=</c> from place response
    /// (guest-friendly), or JWT of the order owner. Unknown / unauthorized → 404 envelope.
    /// </summary>
    [HttpGet("{id:int}")]
    [EnableRateLimiting(RateLimitingExtensions.OrderConfirmPolicy)]
    [ProducesResponseType(typeof(ApiResponse<OrderDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<OrderDetailDto>>> GetById(
        int id,
        [FromQuery] string? token,
        CancellationToken cancellationToken)
    {
        var data = await _orders.GetByIdAsync(id, token, OptionalUserId(), cancellationToken);
        return Ok(ApiResponse<OrderDetailDto>.Ok(data));
    }

    /// <summary>
    /// Authenticated user's orders, newest first. Defaults to 20 (profile UI cap).
    /// </summary>
    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<OrderListItemDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<OrderListItemDto>>>> GetMyOrders(
        [FromQuery] int take = 20,
        CancellationToken cancellationToken = default)
    {
        var data = await _orders.GetMyOrdersAsync(
            User.GetRequiredUserId(),
            take,
            cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<OrderListItemDto>>.Ok(data));
    }

    private int? OptionalUserId() =>
        User.TryGetUserId(out var userId) ? userId : null;
}

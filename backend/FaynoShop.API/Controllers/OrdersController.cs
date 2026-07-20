using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Orders;
using FaynoShop.API.Extensions;
using FaynoShop.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FaynoShop.API.Controllers;

[ApiController]
[Route("api/orders")]
[Produces("application/json")]
[Authorize]
public sealed class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;

    public OrdersController(IOrderService orders)
    {
        _orders = orders;
    }

    /// <summary>
    /// Authenticated user's orders, newest first. Defaults to 20 (profile UI cap).
    /// </summary>
    [HttpGet]
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
}

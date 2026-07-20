using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Orders;
using FaynoShop.API.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FaynoShop.API.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public sealed class AdminOrdersController : ControllerBase
{
    private readonly IOrderService _orders;

    public AdminOrdersController(IOrderService orders)
    {
        _orders = orders;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<AdminOrderListResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AdminOrderListResponse>>> GetOrders(
        [FromQuery] AdminOrderQuery query,
        CancellationToken cancellationToken)
    {
        var data = await _orders.GetAdminOrdersAsync(query, cancellationToken);
        return Ok(ApiResponse<AdminOrderListResponse>.Ok(data));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<OrderDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<OrderDetailDto>>> GetOrder(
        int id,
        CancellationToken cancellationToken)
    {
        var data = await _orders.GetAdminOrderByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<OrderDetailDto>.Ok(data));
    }

    [HttpPut("{id:int}/status")]
    [ProducesResponseType(typeof(ApiResponse<OrderDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<OrderDetailDto>>> UpdateStatus(
        int id,
        [FromBody] UpdateOrderStatusRequest request,
        [FromServices] IValidator<UpdateOrderStatusRequest> validator,
        CancellationToken cancellationToken)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _orders.UpdateStatusAsync(id, request, cancellationToken);
        return Ok(ApiResponse<OrderDetailDto>.Ok(data));
    }
}

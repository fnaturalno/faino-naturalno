using FaynoShop.API.Constants;
using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Cart;
using FaynoShop.API.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

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
    /// Adds exactly one unit of a product to the anonymous browser cart.
    /// Send a stable UUID in header <c>X-Cart-Session-Id</c> (format 8-4-4-4-12).
    /// Frontend should generate and persist this id (e.g. localStorage) across catalog visits.
    /// </summary>
    [HttpPost("items")]
    [ProducesResponseType(typeof(ApiResponse<AddCartItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<AddCartItemResponse>>> AddItem(
        [FromBody] AddCartItemRequest request,
        [FromHeader(Name = CartSessionHeaders.SessionId)] string? sessionId,
        CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(request, cancellationToken);

        var data = await _cartService.AddItemAsync(sessionId ?? string.Empty, request, cancellationToken);
        return Ok(ApiResponse<AddCartItemResponse>.Ok(data));
    }
}

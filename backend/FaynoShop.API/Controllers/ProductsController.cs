using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Products;
using FaynoShop.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace FaynoShop.API.Controllers;

[ApiController]
[Route("api/products")]
[Produces("application/json")]
public sealed class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    /// <summary>
    /// Filtered, sorted, paginated list of active products.
    /// Invalid query values fall back to safe defaults; pageSize defaults to 9.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<ProductListResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<ProductListResponse>>> GetProducts(
        [FromQuery] ProductQuery query,
        CancellationToken cancellationToken)
    {
        var data = await _productService.GetProductsAsync(query, cancellationToken);
        return Ok(ApiResponse<ProductListResponse>.Ok(data));
    }
}

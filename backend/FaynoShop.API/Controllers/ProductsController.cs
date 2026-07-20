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

    /// <summary>
    /// Active product detail by slug, including up to 3 similar products (same category, popular order).
    /// Unknown or inactive slug → 404 with ApiResponse failure.
    /// </summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(ApiResponse<ProductDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<ProductDetailDto>>> GetBySlug(
        string slug,
        CancellationToken cancellationToken)
    {
        var data = await _productService.GetBySlugAsync(slug, cancellationToken);
        return Ok(ApiResponse<ProductDetailDto>.Ok(data));
    }
}

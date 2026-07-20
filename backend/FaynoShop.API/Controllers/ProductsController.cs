using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Products;
using FaynoShop.API.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
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
        query.IncludeInactive = query.IncludeInactive && User.IsInRole("Admin");
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

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<AdminProductDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<AdminProductDto>>> GetForAdmin(
        int id,
        CancellationToken cancellationToken)
    {
        var data = await _productService.GetForAdminAsync(id, cancellationToken);
        return Ok(ApiResponse<AdminProductDto>.Ok(data));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<AdminProductDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<AdminProductDto>>> Create(
        [FromBody] SaveProductRequest request,
        [FromServices] IValidator<SaveProductRequest> validator,
        CancellationToken cancellationToken)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _productService.CreateAsync(request, cancellationToken);
        return Ok(ApiResponse<AdminProductDto>.Ok(data));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<AdminProductDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<AdminProductDto>>> Update(
        int id,
        [FromBody] SaveProductRequest request,
        [FromServices] IValidator<SaveProductRequest> validator,
        CancellationToken cancellationToken)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _productService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<AdminProductDto>.Ok(data));
    }

    [HttpPut("{id:int}/active")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<AdminProductDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<AdminProductDto>>> SetActive(
        int id,
        [FromBody] SetProductActiveRequest request,
        CancellationToken cancellationToken)
    {
        var data = await _productService.SetActiveAsync(id, request.IsActive, cancellationToken);
        return Ok(ApiResponse<AdminProductDto>.Ok(data));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await _productService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }));
    }
}

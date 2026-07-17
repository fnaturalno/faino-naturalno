using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Categories;
using FaynoShop.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace FaynoShop.API.Controllers;

[ApiController]
[Route("api/categories")]
[Produces("application/json")]
public sealed class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    /// <summary>
    /// Catalog categories ordered by SortOrder, with counts of active products.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CategoryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> GetCategories(
        CancellationToken cancellationToken)
    {
        var data = await _categoryService.GetCategoriesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(data));
    }
}

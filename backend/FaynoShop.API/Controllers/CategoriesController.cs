using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Categories;
using FaynoShop.API.Extensions;
using FaynoShop.API.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
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
    /// Catalog categories ordered by SortOrder, with product counts.
    /// Public response uses locale-selected <c>name</c>/<c>description</c>.
    /// Admin may pass <c>bilingual=true</c> to receive UK/EN fields for forms.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<CategoryDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<AdminCategoryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult> GetCategories(
        [FromQuery] string? locale,
        [FromQuery] bool bilingual = false,
        CancellationToken cancellationToken = default)
    {
        if (bilingual && User.IsInRole("Admin"))
        {
            var adminTree = await _categoryService.GetAdminTreeAsync(cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<AdminCategoryDto>>.Ok(adminTree));
        }

        var data = await _categoryService.GetCategoriesAsync(
            User.IsInRole("Admin"),
            Request.ResolveLocale(locale),
            cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(data));
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<AdminCategoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<AdminCategoryDto>>> GetForAdmin(
        int id,
        CancellationToken cancellationToken)
    {
        var data = await _categoryService.GetForAdminAsync(id, cancellationToken);
        return Ok(ApiResponse<AdminCategoryDto>.Ok(data));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<AdminCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AdminCategoryDto>>> Create(
        [FromBody] SaveCategoryRequest request,
        [FromServices] IValidator<SaveCategoryRequest> validator,
        CancellationToken cancellationToken)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _categoryService.CreateAsync(request, cancellationToken);
        return Ok(ApiResponse<AdminCategoryDto>.Ok(data));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<AdminCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AdminCategoryDto>>> Update(
        int id,
        [FromBody] SaveCategoryRequest request,
        [FromServices] IValidator<SaveCategoryRequest> validator,
        CancellationToken cancellationToken)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _categoryService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<AdminCategoryDto>.Ok(data));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await _categoryService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }));
    }
}

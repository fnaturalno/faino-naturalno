using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.News;
using FaynoShop.API.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FaynoShop.API.Controllers;

[ApiController]
[Route("api/admin/news")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public sealed class AdminNewsController : ControllerBase
{
    private readonly INewsService _newsService;

    public AdminNewsController(INewsService newsService)
    {
        _newsService = newsService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<AdminNewsListResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AdminNewsListResponse>>> GetNews(
        [FromQuery] AdminNewsQuery query,
        CancellationToken cancellationToken)
    {
        var data = await _newsService.GetAdminListAsync(query, cancellationToken);
        return Ok(ApiResponse<AdminNewsListResponse>.Ok(data));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<AdminNewsDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<AdminNewsDto>>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var data = await _newsService.GetForAdminAsync(id, cancellationToken);
        return Ok(ApiResponse<AdminNewsDto>.Ok(data));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<AdminNewsDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<AdminNewsDto>>> Create(
        [FromBody] SaveNewsPostRequest request,
        [FromServices] IValidator<SaveNewsPostRequest> validator,
        CancellationToken cancellationToken)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _newsService.CreateAsync(request, cancellationToken);
        return Ok(ApiResponse<AdminNewsDto>.Ok(data));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<AdminNewsDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<AdminNewsDto>>> Update(
        int id,
        [FromBody] SaveNewsPostRequest request,
        [FromServices] IValidator<SaveNewsPostRequest> validator,
        CancellationToken cancellationToken)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);
        var data = await _newsService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<AdminNewsDto>.Ok(data));
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        await _newsService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }));
    }
}

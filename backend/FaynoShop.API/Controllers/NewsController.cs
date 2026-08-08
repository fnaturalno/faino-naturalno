using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.News;
using FaynoShop.API.Extensions;
using FaynoShop.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace FaynoShop.API.Controllers;

[ApiController]
[Route("api/news")]
[Produces("application/json")]
public sealed class NewsController : ControllerBase
{
    private readonly INewsService _newsService;

    public NewsController(INewsService newsService)
    {
        _newsService = newsService;
    }

    /// <summary>
    /// Paginated list of published news posts (featured first, then publishedAt desc).
    /// Display fields follow <c>?locale=</c> → Accept-Language → ua with UK fallback.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<NewsListResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<NewsListResponse>>> GetNews(
        [FromQuery] NewsQuery query,
        [FromQuery] string? locale,
        CancellationToken cancellationToken)
    {
        var data = await _newsService.GetPublishedAsync(
            query,
            Request.ResolveLocale(locale),
            cancellationToken);
        return Ok(ApiResponse<NewsListResponse>.Ok(data));
    }

    /// <summary>
    /// Published news detail by slug. Draft / future / missing → 404.
    /// </summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(ApiResponse<NewsDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<NewsDetailDto>>> GetBySlug(
        string slug,
        [FromQuery] string? locale,
        CancellationToken cancellationToken)
    {
        var data = await _newsService.GetPublishedBySlugAsync(
            slug,
            Request.ResolveLocale(locale),
            cancellationToken);
        return Ok(ApiResponse<NewsDetailDto>.Ok(data));
    }
}

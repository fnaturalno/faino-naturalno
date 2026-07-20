using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Shipping;
using FaynoShop.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace FaynoShop.API.Controllers;

/// <summary>
/// Nova Poshta shipping lookups for profile delivery address.
/// When <c>NovaPoshta:ApiKey</c> is empty the mock provider returns realistic UA cities/branches.
/// With an API key, the live NP JSON API is used. Response shapes are identical either way.
/// </summary>
[ApiController]
[Route("api/shipping/np")]
[Produces("application/json")]
public sealed class ShippingController : ControllerBase
{
    private readonly INovaPoshtaProvider _np;

    public ShippingController(INovaPoshtaProvider np)
    {
        _np = np;
    }

    /// <summary>
    /// Search cities by typed query. Empty query returns a short default list (mock) or empty (API).
    /// Query: <c>?q=київ</c> or <c>?query=київ</c>.
    /// </summary>
    [HttpGet("cities")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<NpCityDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<NpCityDto>>>> SearchCities(
        [FromQuery] string? q,
        [FromQuery] string? query,
        CancellationToken cancellationToken)
    {
        var text = q ?? query ?? string.Empty;
        var data = await _np.SearchCitiesAsync(text, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<NpCityDto>>.Ok(data));
    }

    /// <summary>
    /// Branches / parcel lockers for a city. Query: <c>?cityId={ref}</c>.
    /// </summary>
    [HttpGet("branches")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<NpBranchDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<NpBranchDto>>>> GetBranches(
        [FromQuery] string cityId,
        CancellationToken cancellationToken)
    {
        var data = await _np.GetBranchesAsync(cityId ?? string.Empty, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<NpBranchDto>>.Ok(data));
    }
}

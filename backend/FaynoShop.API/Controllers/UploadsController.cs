using FaynoShop.API.DTOs;
using FaynoShop.API.DTOs.Uploads;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FaynoShop.API.Controllers;

[ApiController]
[Route("api/admin/uploads")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public sealed class UploadsController : ControllerBase
{
    private readonly IMediaUploadService _uploads;

    public UploadsController(IMediaUploadService uploads)
    {
        _uploads = uploads;
    }

    [HttpPost("images")]
    [RequestSizeLimit(MediaUploadService.MaxBytes + 1024)]
    [ProducesResponseType(typeof(ApiResponse<UploadedImageDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<UploadedImageDto>>> UploadImage(
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file is null)
        {
            throw new BadRequestException("Оберіть файл зображення.");
        }

        var url = await _uploads.SaveProductImageAsync(file, cancellationToken);
        return Ok(ApiResponse<UploadedImageDto>.Ok(new UploadedImageDto(url)));
    }
}

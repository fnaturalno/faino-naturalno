using System.Text.Json;
using FaynoShop.API.DTOs;
using FaynoShop.API.Exceptions;

namespace FaynoShop.API.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            _logger.LogWarning(ex, "Handled application error: {Message}", ex.Message);
            await WriteErrorAsync(context, ex.StatusCode, ex.Message);
        }
        catch (FluentValidation.ValidationException ex)
        {
            var message = string.Join("; ", ex.Errors.Select(e => e.ErrorMessage));
            await WriteErrorAsync(context, StatusCodes.Status400BadRequest, message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            // Never expose stack traces or internal details to clients.
            await WriteErrorAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "Сталася внутрішня помилка сервера.");
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, int statusCode, string message)
    {
        if (context.Response.HasStarted)
        {
            throw new InvalidOperationException("The response has already started.");
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = ApiResponse<object>.Fail(message);
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, JsonOptions));
    }
}

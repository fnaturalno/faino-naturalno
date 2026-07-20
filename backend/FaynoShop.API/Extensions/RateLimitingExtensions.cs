using System.Threading.RateLimiting;
using FaynoShop.API.DTOs;
using Microsoft.AspNetCore.RateLimiting;
using System.Text.Json;

namespace FaynoShop.API.Extensions;

public static class RateLimitingExtensions
{
    public const string AuthStrictPolicy = "auth-strict";
    public const string AuthForgotPolicy = "auth-forgot";
    public const string CartMutationPolicy = "cart-mutation";
    public const string PlaceOrderPolicy = "place-order";
    public const string OrderConfirmPolicy = "order-confirm";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.ContentType = "application/json";
                var payload = ApiResponse<object>.Fail(
                    "Забагато спроб. Зачекайте хвилину й спробуйте знову.");
                await context.HttpContext.Response.WriteAsync(
                    JsonSerializer.Serialize(payload, JsonOptions),
                    cancellationToken);
            };

            // Login / register / refresh / reset — per client IP.
            options.AddPolicy(AuthStrictPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    GetClientKey(httpContext),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 20,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));

            // Forgot-password is stricter (email abuse / reset spam).
            options.AddPolicy(AuthForgotPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    GetClientKey(httpContext),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 5,
                        Window = TimeSpan.FromMinutes(15),
                        QueueLimit = 0
                    }));

            // Guest cart mutations — blunt cart-stuffing / DoS from a single IP.
            options.AddPolicy(CartMutationPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    GetClientKey(httpContext),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 60,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));

            // Place order — stricter than cart mutations (spam / inventory thrash).
            options.AddPolicy(PlaceOrderPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    GetClientKey(httpContext),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));

            // Public order confirmation GET — blunt ID enumeration / token guessing noise.
            options.AddPolicy(OrderConfirmPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    GetClientKey(httpContext),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 60,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));
        });

        return services;
    }

    private static string GetClientKey(HttpContext httpContext) =>
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}

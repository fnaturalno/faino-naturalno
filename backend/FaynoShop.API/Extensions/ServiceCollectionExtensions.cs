using System.Text;
using System.Text.Json;
using FaynoShop.API.DTOs;
using FaynoShop.API.Options;
using FaynoShop.API.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace FaynoShop.API.Extensions;

public static class ServiceCollectionExtensions
{
    private static readonly JsonSerializerOptions AuthJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static IServiceCollection AddCatalogServices(this IServiceCollection services)
    {
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ICartService, CartService>();
        services.AddScoped<IMediaUploadService, MediaUploadService>();
        services.AddValidatorsFromAssemblyContaining<Program>();
        return services;
    }

    public static IServiceCollection AddAuthServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .Validate(
                o => environment.IsDevelopment()
                    || (!o.Key.Contains("Dev-Only", StringComparison.OrdinalIgnoreCase)
                        && !o.Key.Contains("Change-In-Production", StringComparison.OrdinalIgnoreCase)),
                "Jwt:Key must be a production secret (env/user-secrets), not the local Dev-Only key.")
            .ValidateOnStart();

        services.AddOptions<AppOptions>()
            .Bind(configuration.GetSection(AppOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<NovaPoshtaOptions>()
            .Bind(configuration.GetSection(NovaPoshtaOptions.SectionName));

        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddSingleton<IEmailSender, LoggingEmailSender>();

        var npKey = configuration.GetSection(NovaPoshtaOptions.SectionName)["ApiKey"];
        if (string.IsNullOrWhiteSpace(npKey))
        {
            services.AddSingleton<INovaPoshtaProvider, MockNovaPoshtaProvider>();
        }
        else
        {
            services.AddHttpClient<INovaPoshtaProvider, ApiNovaPoshtaProvider>(client =>
            {
                client.BaseAddress = new Uri("https://api.novaposhta.ua/v2.0/json/");
                client.Timeout = TimeSpan.FromSeconds(30);
            });
        }

        var jwt = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
            ?? throw new InvalidOperationException("Jwt configuration section is required.");

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwt.Issuer,
                    ValidAudience = jwt.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };

                options.Events = new JwtBearerEvents
                {
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        context.Response.ContentType = "application/json";
                        var payload = ApiResponse<object>.Fail("Необхідна авторизація.");
                        await context.Response.WriteAsync(
                            JsonSerializer.Serialize(payload, AuthJsonOptions));
                    },
                    OnForbidden = async context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";
                        var payload = ApiResponse<object>.Fail("Доступ заборонено.");
                        await context.Response.WriteAsync(
                            JsonSerializer.Serialize(payload, AuthJsonOptions));
                    }
                };
            });

        services.AddAuthorization();
        return services;
    }
}

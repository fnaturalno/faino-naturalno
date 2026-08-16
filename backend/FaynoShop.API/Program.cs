using FaynoShop.API.Data;
using FaynoShop.API.Extensions;
using FaynoShop.API.Middleware;
using FaynoShop.API.Options;
using FaynoShop.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddHealthChecks();
builder.Services.AddOpenApi();
builder.Services.AddCatalogServices(builder.Configuration);
builder.Services.AddAuthServices(builder.Configuration, builder.Environment);
builder.Services.AddAuthRateLimiting();

builder.Services.AddDbContext<AppDbContext>(options =>
    options
        .UseNpgsql(DatabaseConnection.Resolve(builder.Configuration, builder.Environment))
        .UseSnakeCaseNamingConvention());

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var origins = builder.Configuration["AllowedOrigins"]?
            .Split(",", StringSplitOptions.RemoveEmptyEntries)
            ?? ["http://localhost:4200"];

        policy
            .WithOrigins(origins)
            .WithHeaders("Content-Type", "Authorization", "X-Cart-Session-Id")
            .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var mediaOptions = builder.Configuration
    .GetSection(MediaStorageOptions.SectionName)
    .Get<MediaStorageOptions>() ?? new MediaStorageOptions();
var uploadsRoot = MediaUploadService.ResolveUploadsRoot(builder.Environment, mediaOptions);
Directory.CreateDirectory(Path.Combine(uploadsRoot, "products"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads"
});
app.UseStaticFiles();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health");
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.Run();

public partial class Program;

using FaynoShop.API.Data;
using FaynoShop.API.Extensions;
using FaynoShop.API.Middleware;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddCatalogServices();
builder.Services.AddAuthServices(builder.Configuration, builder.Environment);
builder.Services.AddAuthRateLimiting();

builder.Services.AddDbContext<AppDbContext>(options =>
    options
        .UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
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
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    await db.Database.MigrateAsync();
    await SeedData.SeedAsync(db, config);
}

app.Run();

public partial class Program;

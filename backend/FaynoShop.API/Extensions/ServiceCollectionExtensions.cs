using FaynoShop.API.Services;
using FluentValidation;

namespace FaynoShop.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCatalogServices(this IServiceCollection services)
    {
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ICartService, CartService>();
        services.AddValidatorsFromAssemblyContaining<Program>();
        return services;
    }
}

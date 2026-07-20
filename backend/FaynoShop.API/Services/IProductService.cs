using FaynoShop.API.DTOs.Products;

namespace FaynoShop.API.Services;

public interface IProductService
{
    Task<ProductListResponse> GetProductsAsync(ProductQuery query, CancellationToken cancellationToken);

    /// <summary>
    /// Returns one active product by slug with up to 3 similar products from the same category.
    /// Throws <see cref="Exceptions.NotFoundException"/> for unknown or inactive slugs.
    /// </summary>
    Task<ProductDetailDto> GetBySlugAsync(string slug, CancellationToken cancellationToken);

    Task<AdminProductDto> GetForAdminAsync(int id, CancellationToken cancellationToken);

    Task<AdminProductDto> CreateAsync(SaveProductRequest request, CancellationToken cancellationToken);

    Task<AdminProductDto> UpdateAsync(int id, SaveProductRequest request, CancellationToken cancellationToken);

    Task<AdminProductDto> SetActiveAsync(int id, bool isActive, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);
}

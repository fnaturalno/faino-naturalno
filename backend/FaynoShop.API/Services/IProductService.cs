using FaynoShop.API.DTOs.Products;

namespace FaynoShop.API.Services;

public interface IProductService
{
    Task<ProductListResponse> GetProductsAsync(ProductQuery query, CancellationToken cancellationToken);
}

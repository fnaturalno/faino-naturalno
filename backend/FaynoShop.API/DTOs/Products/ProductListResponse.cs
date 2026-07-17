namespace FaynoShop.API.DTOs.Products;

public sealed record ProductListResponse(
    IReadOnlyList<ProductDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    decimal PriceMin,
    decimal PriceMax);

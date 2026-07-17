using FaynoShop.API.DTOs.Cart;

namespace FaynoShop.API.Services;

public interface ICartService
{
    Task<AddCartItemResponse> AddItemAsync(
        string sessionId,
        AddCartItemRequest request,
        CancellationToken cancellationToken);
}

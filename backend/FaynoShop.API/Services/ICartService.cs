using FaynoShop.API.DTOs.Cart;

namespace FaynoShop.API.Services;

public interface ICartService
{
    Task<AddCartItemResponse> AddItemAsync(
        string sessionId,
        AddCartItemRequest request,
        CancellationToken cancellationToken);

    /// <summary>
    /// Merges the guest cart identified by <paramref name="sessionId"/> into the
    /// authenticated user's cart. No confirmation; quantities are summed (capped by stock).
    /// </summary>
    Task<MergeCartResponse> MergeGuestCartAsync(
        int userId,
        string sessionId,
        CancellationToken cancellationToken);
}

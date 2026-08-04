using FaynoShop.API.DTOs.Cart;

namespace FaynoShop.API.Services;

public interface ICartService
{
    Task<AddCartItemResponse> AddItemAsync(
        string sessionId,
        int? userId,
        AddCartItemRequest request,
        CancellationToken cancellationToken);

    /// <summary>
    /// Merges the guest cart identified by <paramref name="sessionId"/> into the
    /// authenticated user's cart. No confirmation; quantities are summed (capped at MaxLineQuantity).
    /// </summary>
    Task<MergeCartResponse> MergeGuestCartAsync(
        int userId,
        string sessionId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Returns the current cart with live product prices and locale-aware display names.
    /// Empty cart is a successful empty payload (no 404).
    /// </summary>
    Task<CartDto> GetCartAsync(
        string sessionId,
        int? userId,
        string locale,
        CancellationToken cancellationToken);

    /// <summary>
    /// Sets line quantity to 1‥MaxLineQuantity (12). Returns the full cart for client refresh.
    /// </summary>
    Task<CartDto> UpdateItemQuantityAsync(
        string sessionId,
        int? userId,
        int cartItemId,
        UpdateCartItemRequest request,
        string locale,
        CancellationToken cancellationToken);

    /// <summary>Removes one line and returns the updated cart.</summary>
    Task<CartDto> RemoveItemAsync(
        string sessionId,
        int? userId,
        int cartItemId,
        string locale,
        CancellationToken cancellationToken);

    /// <summary>Clears all lines for the current cart (API-only; no UI control).</summary>
    Task<CartDto> ClearCartAsync(
        string sessionId,
        int? userId,
        string locale,
        CancellationToken cancellationToken);
}

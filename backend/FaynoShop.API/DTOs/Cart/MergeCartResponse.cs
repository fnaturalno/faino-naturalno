namespace FaynoShop.API.DTOs.Cart;

/// <summary>Result of POST /api/cart/merge — total quantity after guest→user merge.</summary>
public sealed record MergeCartResponse(int ItemCount);

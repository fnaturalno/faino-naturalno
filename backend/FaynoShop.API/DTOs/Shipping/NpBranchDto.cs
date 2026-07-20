namespace FaynoShop.API.DTOs.Shipping;

/// <summary>Nova Poshta branch / parcel locker for a selected city.</summary>
public sealed record NpBranchDto(
    string BranchId,
    string Label,
    string? Type);

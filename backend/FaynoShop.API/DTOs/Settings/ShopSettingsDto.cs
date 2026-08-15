namespace FaynoShop.API.DTOs.Settings;

public sealed record ShopSettingsDto(decimal UkrposhtaFreeFromAmount);

public sealed record SaveShopSettingsRequest(decimal UkrposhtaFreeFromAmount);

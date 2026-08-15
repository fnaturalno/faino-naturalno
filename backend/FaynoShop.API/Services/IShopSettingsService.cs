using FaynoShop.API.DTOs.Settings;

namespace FaynoShop.API.Services;

public interface IShopSettingsService
{
    Task<ShopSettingsDto> GetAsync(CancellationToken cancellationToken);
    Task<ShopSettingsDto> UpdateAsync(SaveShopSettingsRequest request, CancellationToken cancellationToken);
}

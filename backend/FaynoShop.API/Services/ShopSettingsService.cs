using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Settings;
using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FaynoShop.API.Services;

public sealed class ShopSettingsService : IShopSettingsService
{
    private readonly AppDbContext _db;

    public ShopSettingsService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ShopSettingsDto> GetAsync(CancellationToken cancellationToken)
    {
        var settings = await EnsureRowAsync(cancellationToken);
        return ToDto(settings);
    }

    public async Task<ShopSettingsDto> UpdateAsync(
        SaveShopSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var settings = await EnsureRowAsync(cancellationToken);
        settings.UkrposhtaFreeFromAmount = decimal.Round(request.UkrposhtaFreeFromAmount, 2);
        settings.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(settings);
    }

    private async Task<ShopSettings> EnsureRowAsync(CancellationToken cancellationToken)
    {
        var settings = await _db.ShopSettings
            .FirstOrDefaultAsync(s => s.Id == ShopSettings.SingletonId, cancellationToken);
        if (settings is not null)
        {
            return settings;
        }

        settings = new ShopSettings
        {
            Id = ShopSettings.SingletonId,
            UkrposhtaFreeFromAmount = ShopSettings.DefaultUkrposhtaFreeFromAmount,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.ShopSettings.Add(settings);
        await _db.SaveChangesAsync(cancellationToken);
        return settings;
    }

    private static ShopSettingsDto ToDto(ShopSettings settings) =>
        new(settings.UkrposhtaFreeFromAmount);
}

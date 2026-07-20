using FaynoShop.API.DTOs.Shipping;
using FaynoShop.API.Exceptions;

namespace FaynoShop.API.Services;

/// <summary>
/// Local/dev Nova Poshta stand-in with realistic Ukrainian cities and sample branches.
/// Used when <c>NovaPoshta:ApiKey</c> is empty. City/branch ids are stable UUIDs so
/// saved profile addresses remain consistent across restarts.
/// </summary>
public sealed class MockNovaPoshtaProvider : INovaPoshtaProvider
{
    public string ProviderName => "mock";

    private static readonly IReadOnlyList<(NpCityDto City, IReadOnlyList<NpBranchDto> Branches)> Data =
    [
        (
            new NpCityDto("db5c88f5-391c-11dd-90d9-001a92567626", "Київ", "Київська"),
            [
                new("1ec09d88-e1c2-11e3-8c4a-0050568002cf", "Відділення №1: вул. Пирогівський шлях, 135", "Branch"),
                new("1ec09d89-e1c2-11e3-8c4a-0050568002cf", "Відділення №2: вул. Борщагівська, 154", "Branch"),
                new("mock-kyiv-pl-01", "Поштомат №1234: ТРЦ Gulliver, Спортивна пл., 1а", "ParcelLocker"),
                new("mock-kyiv-br-03", "Відділення №5: просп. Перемоги, 67", "Branch"),
                new("mock-kyiv-br-04", "Відділення №12: вул. Хрещатик, 22", "Branch")
            ]
        ),
        (
            new NpCityDto("db5c88e0-391c-11dd-90d9-001a92567626", "Львів", "Львівська"),
            [
                new("mock-lviv-br-01", "Відділення №1: вул. Городоцька, 174", "Branch"),
                new("mock-lviv-br-02", "Відділення №3: пл. Ринок, 1", "Branch"),
                new("mock-lviv-pl-01", "Поштомат №88: вул. Стрийська, 30", "ParcelLocker")
            ]
        ),
        (
            new NpCityDto("db5c88d0-391c-11dd-90d9-001a92567626", "Одеса", "Одеська"),
            [
                new("mock-odesa-br-01", "Відділення №1: вул. Мала Арнаутська, 71", "Branch"),
                new("mock-odesa-br-02", "Відділення №7: просп. Шевченка, 4д", "Branch"),
                new("mock-odesa-pl-01", "Поштомат №45: вул. Дерибасівська, 16", "ParcelLocker")
            ]
        ),
        (
            new NpCityDto("db5c88c0-391c-11dd-90d9-001a92567626", "Харків", "Харківська"),
            [
                new("mock-kharkiv-br-01", "Відділення №1: вул. Сумська, 72", "Branch"),
                new("mock-kharkiv-br-02", "Відділення №4: просп. Науки, 9", "Branch")
            ]
        ),
        (
            new NpCityDto("db5c88b0-391c-11dd-90d9-001a92567626", "Дніпро", "Дніпропетровська"),
            [
                new("mock-dnipro-br-01", "Відділення №1: просп. Дмитра Яворницького, 50", "Branch"),
                new("mock-dnipro-br-02", "Відділення №6: вул. Робоча, 23", "Branch"),
                new("mock-dnipro-pl-01", "Поштомат №22: ТРЦ Каскад Плаза", "ParcelLocker")
            ]
        ),
        (
            new NpCityDto("db5c88a0-391c-11dd-90d9-001a92567626", "Запоріжжя", "Запорізька"),
            [
                new("mock-zp-br-01", "Відділення №1: просп. Соборний, 160", "Branch"),
                new("mock-zp-br-02", "Відділення №3: вул. Незалежної України, 42", "Branch")
            ]
        ),
        (
            new NpCityDto("db5c8890-391c-11dd-90d9-001a92567626", "Вінниця", "Вінницька"),
            [
                new("mock-vn-br-01", "Відділення №1: вул. Келецька, 51а", "Branch"),
                new("mock-vn-pl-01", "Поштомат №11: вул. Соборна, 70", "ParcelLocker")
            ]
        ),
        (
            new NpCityDto("db5c8880-391c-11dd-90d9-001a92567626", "Полтава", "Полтавська"),
            [
                new("mock-pl-br-01", "Відділення №1: вул. Європейська, 66", "Branch"),
                new("mock-pl-br-02", "Відділення №2: вул. Соборності, 45", "Branch")
            ]
        ),
        (
            new NpCityDto("db5c8870-391c-11dd-90d9-001a92567626", "Чернівці", "Чернівецька"),
            [
                new("mock-cv-br-01", "Відділення №1: вул. Головна, 125", "Branch")
            ]
        ),
        (
            new NpCityDto("db5c8860-391c-11dd-90d9-001a92567626", "Івано-Франківськ", "Івано-Франківська"),
            [
                new("mock-if-br-01", "Відділення №1: вул. Галицька, 48", "Branch"),
                new("mock-if-br-02", "Відділення №4: вул. Незалежності, 12", "Branch")
            ]
        )
    ];

    public Task<IReadOnlyList<NpCityDto>> SearchCitiesAsync(
        string query,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var q = (query ?? string.Empty).Trim();
        if (q.Length == 0)
        {
            return Task.FromResult<IReadOnlyList<NpCityDto>>(
                Data.Select(d => d.City).Take(20).ToList());
        }

        var matches = Data
            .Select(d => d.City)
            .Where(c =>
                c.CityName.Contains(q, StringComparison.OrdinalIgnoreCase)
                || (c.Region?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false))
            .Take(20)
            .ToList();

        return Task.FromResult<IReadOnlyList<NpCityDto>>(matches);
    }

    public Task<IReadOnlyList<NpBranchDto>> GetBranchesAsync(
        string cityId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(cityId))
        {
            throw new BadRequestException("Параметр cityId є обов'язковим.");
        }

        var entry = Data.FirstOrDefault(d =>
            string.Equals(d.City.CityId, cityId.Trim(), StringComparison.OrdinalIgnoreCase));

        if (entry.City is null)
        {
            return Task.FromResult<IReadOnlyList<NpBranchDto>>(Array.Empty<NpBranchDto>());
        }

        return Task.FromResult(entry.Branches);
    }
}

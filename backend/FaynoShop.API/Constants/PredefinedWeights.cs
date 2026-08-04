namespace FaynoShop.API.Constants;

/// <summary>
/// Admin may only price variants from this ordered list. <see cref="SortOrder"/> is 1-based.
/// </summary>
public static class PredefinedWeights
{
    public sealed record Entry(decimal Weight, string WeightUnit, int SortOrder);

    public static readonly IReadOnlyList<Entry> All =
    [
        new(10m, "г", 1),
        new(50m, "г", 2),
        new(100m, "г", 3),
        new(250m, "г", 4),
        new(500m, "г", 5),
        new(1m, "кг", 6),
        new(1m, "шт", 7)
    ];

    public static Entry? Find(decimal weight, string weightUnit)
    {
        var unit = weightUnit.Trim();
        return All.FirstOrDefault(e => e.Weight == weight && e.WeightUnit == unit);
    }

    public static bool IsAllowed(decimal weight, string weightUnit) =>
        Find(weight, weightUnit) is not null;
}

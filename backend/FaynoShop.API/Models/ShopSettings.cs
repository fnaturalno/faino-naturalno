namespace FaynoShop.API.Models;

/// <summary>Singleton shop settings row (id = 1).</summary>
public class ShopSettings
{
    public const int SingletonId = 1;
    public const decimal DefaultUkrposhtaFreeFromAmount = 1300m;

    public int Id { get; set; }
    public decimal UkrposhtaFreeFromAmount { get; set; } = DefaultUkrposhtaFreeFromAmount;
    public DateTime UpdatedAt { get; set; }
}

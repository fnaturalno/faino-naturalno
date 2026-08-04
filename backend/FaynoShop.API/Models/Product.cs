namespace FaynoShop.API.Models;

public class Product
{
    public int Id { get; set; }
    public required string NameUk { get; set; }
    public string? NameEn { get; set; }
    public required string Slug { get; set; }
    public string? DescriptionUk { get; set; }
    public string? DescriptionEn { get; set; }
    public string? ShortDescriptionUk { get; set; }
    public string? ShortDescriptionEn { get; set; }
    public decimal Price { get; set; }
    public decimal? OldPrice { get; set; }
    public string? ImageUrl { get; set; }
    public string[] ImageUrls { get; set; } = [];
    public decimal? Weight { get; set; }
    public string? WeightUnit { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    /// <summary>When false, product stays in catalog but cannot be added to cart.</summary>
    public bool IsAvailable { get; set; } = true;
    public int CategoryId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Category Category { get; set; } = null!;
    public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}

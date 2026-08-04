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
    public string? ImageUrl { get; set; }
    public string[] ImageUrls { get; set; } = [];
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    /// <summary>When false, product is excluded from public catalog (with IsActive + active variants).</summary>
    public bool IsAvailable { get; set; } = true;
    public int CategoryId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Category Category { get; set; } = null!;
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}

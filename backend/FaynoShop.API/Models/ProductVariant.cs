namespace FaynoShop.API.Models;

public class ProductVariant
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public decimal Weight { get; set; }
    public required string WeightUnit { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    public Product Product { get; set; } = null!;
    public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}

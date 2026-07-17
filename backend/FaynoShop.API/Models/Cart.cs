namespace FaynoShop.API.Models;

public class Cart
{
    public int Id { get; set; }
    public required string SessionId { get; set; }
    public int? UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
}

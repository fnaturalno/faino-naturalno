namespace FaynoShop.API.Models;

public class Order
{
    public int Id { get; set; }
    public required string OrderNumber { get; set; }
    public OrderStatus Status { get; set; }
    public decimal TotalAmount { get; set; }
    public required string RecipientName { get; set; }
    public required string Phone { get; set; }
    public required string Email { get; set; }
    public required string DeliveryAddress { get; set; }
    public string? Comment { get; set; }
    public int? UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User? User { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

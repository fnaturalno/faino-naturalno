namespace FaynoShop.API.Models;

public class CartItem
{
    public int Id { get; set; }
    public int CartId { get; set; }
    public int VariantId { get; set; }
    public int Quantity { get; set; }

    public Cart Cart { get; set; } = null!;
    public ProductVariant Variant { get; set; } = null!;
}

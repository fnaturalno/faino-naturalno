namespace FaynoShop.API.Models;

public class Category
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }

    public ICollection<Product> Products { get; set; } = new List<Product>();
}

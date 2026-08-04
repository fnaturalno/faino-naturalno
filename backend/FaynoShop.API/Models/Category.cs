namespace FaynoShop.API.Models;

public class Category
{
    public int Id { get; set; }
    public required string NameUk { get; set; }
    public string? NameEn { get; set; }
    public required string Slug { get; set; }
    public string? DescriptionUk { get; set; }
    public string? DescriptionEn { get; set; }
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }
    public int? ParentId { get; set; }

    public Category? Parent { get; set; }
    public ICollection<Category> Children { get; set; } = new List<Category>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

namespace FaynoShop.API.Models;

public class NewsPost
{
    public int Id { get; set; }
    public required string TitleUk { get; set; }
    public string? TitleEn { get; set; }
    public required string Slug { get; set; }
    public string? ExcerptUk { get; set; }
    public string? ExcerptEn { get; set; }
    public string BodyUk { get; set; } = string.Empty;
    public string? BodyEn { get; set; }
    public string? CoverImageUrl { get; set; }
    public DateTime? PublishedAt { get; set; }
    public bool IsPublished { get; set; }
    public bool IsFeatured { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

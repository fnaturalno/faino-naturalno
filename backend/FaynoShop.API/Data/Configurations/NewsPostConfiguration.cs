using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FaynoShop.API.Data.Configurations;

public class NewsPostConfiguration : IEntityTypeConfiguration<NewsPost>
{
    public void Configure(EntityTypeBuilder<NewsPost> builder)
    {
        builder.ToTable("news_posts");

        builder.HasKey(n => n.Id);

        builder.Property(n => n.TitleUk)
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(n => n.TitleEn)
            .HasMaxLength(300);

        builder.Property(n => n.Slug)
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(n => n.ExcerptUk)
            .HasMaxLength(500);

        builder.Property(n => n.ExcerptEn)
            .HasMaxLength(500);

        builder.Property(n => n.BodyUk)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(n => n.BodyEn)
            .HasColumnType("text");

        builder.Property(n => n.CoverImageUrl)
            .HasMaxLength(500);

        builder.Property(n => n.PublishedAt)
            .HasColumnType("timestamptz");

        builder.Property(n => n.IsPublished)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(n => n.IsFeatured)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(n => n.CreatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.Property(n => n.UpdatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasIndex(n => n.Slug)
            .IsUnique()
            .HasDatabaseName("idx_news_posts_slug");

        builder.HasIndex(n => new { n.IsPublished, n.PublishedAt })
            .IsDescending(false, true)
            .HasDatabaseName("idx_news_posts_is_published_published_at");

        builder.HasIndex(n => n.IsFeatured)
            .HasDatabaseName("idx_news_posts_is_featured");
    }
}

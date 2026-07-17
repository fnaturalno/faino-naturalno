using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FaynoShop.API.Data.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(p => p.Slug)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(p => p.ShortDescription)
            .HasMaxLength(500);

        builder.Property(p => p.Price)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(p => p.OldPrice)
            .HasPrecision(10, 2);

        builder.Property(p => p.ImageUrl)
            .HasMaxLength(500);

        builder.Property(p => p.ImageUrls)
            .HasColumnType("text[]");

        builder.Property(p => p.StockQuantity)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(p => p.Weight)
            .HasPrecision(10, 3);

        builder.Property(p => p.WeightUnit)
            .HasMaxLength(10);

        builder.Property(p => p.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(p => p.IsFeatured)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(p => p.CreatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.Property(p => p.UpdatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.Slug)
            .IsUnique()
            .HasDatabaseName("idx_products_slug");

        builder.HasIndex(p => p.CategoryId)
            .HasDatabaseName("idx_products_category_id");

        builder.HasIndex(p => p.IsActive)
            .HasDatabaseName("idx_products_is_active");

        builder.HasIndex(p => new { p.CategoryId, p.IsActive })
            .HasDatabaseName("idx_products_category_id_is_active");

        builder.HasIndex(p => p.IsFeatured)
            .HasDatabaseName("idx_products_is_featured");

        builder.HasIndex(p => p.CreatedAt)
            .HasDatabaseName("idx_products_created_at");

        builder.HasIndex(p => p.Price)
            .HasDatabaseName("idx_products_price");
    }
}

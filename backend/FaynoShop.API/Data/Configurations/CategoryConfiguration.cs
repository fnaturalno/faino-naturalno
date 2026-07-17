using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FaynoShop.API.Data.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("categories");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(c => c.Slug)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(c => c.ImageUrl)
            .HasMaxLength(500);

        builder.Property(c => c.SortOrder)
            .IsRequired()
            .HasDefaultValue(0);

        builder.HasIndex(c => c.Slug)
            .IsUnique()
            .HasDatabaseName("idx_categories_slug");

        builder.HasIndex(c => c.SortOrder)
            .HasDatabaseName("idx_categories_sort_order");
    }
}

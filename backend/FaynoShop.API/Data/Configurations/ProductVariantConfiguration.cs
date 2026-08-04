using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FaynoShop.API.Data.Configurations;

public class ProductVariantConfiguration : IEntityTypeConfiguration<ProductVariant>
{
    public void Configure(EntityTypeBuilder<ProductVariant> builder)
    {
        builder.ToTable("product_variants");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.Weight)
            .HasPrecision(10, 3)
            .IsRequired();

        builder.Property(v => v.WeightUnit)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(v => v.Price)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(v => v.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(v => v.SortOrder)
            .IsRequired();

        builder.HasOne(v => v.Product)
            .WithMany(p => p.Variants)
            .HasForeignKey(v => v.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(v => v.ProductId)
            .HasDatabaseName("idx_product_variants_product_id");

        builder.HasIndex(v => new { v.ProductId, v.Weight, v.WeightUnit })
            .IsUnique()
            .HasDatabaseName("idx_product_variants_product_id_weight_weight_unit");
    }
}

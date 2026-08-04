using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FaynoShop.API.Data.Configurations;

public class CartItemConfiguration : IEntityTypeConfiguration<CartItem>
{
    public void Configure(EntityTypeBuilder<CartItem> builder)
    {
        builder.ToTable("cart_items");

        builder.HasKey(ci => ci.Id);

        builder.Property(ci => ci.Quantity)
            .IsRequired();

        builder.HasOne(ci => ci.Cart)
            .WithMany(c => c.Items)
            .HasForeignKey(ci => ci.CartId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ci => ci.Variant)
            .WithMany(v => v.CartItems)
            .HasForeignKey(ci => ci.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ci => ci.CartId)
            .HasDatabaseName("idx_cart_items_cart_id");

        builder.HasIndex(ci => ci.VariantId)
            .HasDatabaseName("idx_cart_items_variant_id");

        builder.HasIndex(ci => new { ci.CartId, ci.VariantId })
            .IsUnique()
            .HasDatabaseName("idx_cart_items_cart_id_variant_id");
    }
}

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

        builder.HasOne(ci => ci.Product)
            .WithMany(p => p.CartItems)
            .HasForeignKey(ci => ci.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ci => ci.CartId)
            .HasDatabaseName("idx_cart_items_cart_id");

        builder.HasIndex(ci => ci.ProductId)
            .HasDatabaseName("idx_cart_items_product_id");

        builder.HasIndex(ci => new { ci.CartId, ci.ProductId })
            .IsUnique()
            .HasDatabaseName("idx_cart_items_cart_id_product_id");
    }
}

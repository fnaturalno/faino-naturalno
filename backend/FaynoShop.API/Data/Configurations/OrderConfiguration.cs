using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FaynoShop.API.Data.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders");

        builder.HasKey(o => o.Id);

        builder.Property(o => o.OrderNumber)
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(o => o.Status)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(o => o.TotalAmount)
            .HasPrecision(10, 2)
            .IsRequired();

        builder.Property(o => o.RecipientName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(o => o.Phone)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(o => o.Email)
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(o => o.DeliveryAddress)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(o => o.Comment)
            .HasMaxLength(1000);

        builder.Property(o => o.CreatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.Property(o => o.UpdatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasOne(o => o.User)
            .WithMany(u => u.Orders)
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(o => o.OrderNumber)
            .IsUnique()
            .HasDatabaseName("idx_orders_order_number");

        builder.HasIndex(o => o.UserId)
            .HasDatabaseName("idx_orders_user_id");

        builder.HasIndex(o => o.CreatedAt)
            .HasDatabaseName("idx_orders_created_at");

        builder.HasIndex(o => new { o.UserId, o.CreatedAt })
            .HasDatabaseName("idx_orders_user_id_created_at");
    }
}

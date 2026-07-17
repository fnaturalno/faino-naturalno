using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FaynoShop.API.Data.Configurations;

public class CartConfiguration : IEntityTypeConfiguration<Cart>
{
    public void Configure(EntityTypeBuilder<Cart> builder)
    {
        builder.ToTable("carts");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.SessionId)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(c => c.CreatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.Property(c => c.UpdatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasIndex(c => c.SessionId)
            .IsUnique()
            .HasDatabaseName("idx_carts_session_id");

        builder.HasIndex(c => c.UserId)
            .HasDatabaseName("idx_carts_user_id");
    }
}

using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FaynoShop.API.Data.Configurations;

public class UserDeliveryAddressConfiguration : IEntityTypeConfiguration<UserDeliveryAddress>
{
    public void Configure(EntityTypeBuilder<UserDeliveryAddress> builder)
    {
        builder.ToTable("user_delivery_addresses");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.CityId)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(a => a.CityName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(a => a.CityRegion)
            .HasMaxLength(200);

        builder.Property(a => a.BranchId)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(a => a.BranchLabel)
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(a => a.Summary)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(a => a.UpdatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasOne(a => a.User)
            .WithOne(u => u.DeliveryAddress)
            .HasForeignKey<UserDeliveryAddress>(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => a.UserId)
            .IsUnique()
            .HasDatabaseName("idx_user_delivery_addresses_user_id");
    }
}

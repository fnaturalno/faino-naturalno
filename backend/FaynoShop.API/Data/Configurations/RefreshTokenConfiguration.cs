using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FaynoShop.API.Data.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.TokenFamily)
            .IsRequired();

        builder.Property(t => t.TokenHash)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(t => t.ExpiresAt)
            .HasColumnType("timestamptz")
            .IsRequired();

        builder.Property(t => t.CreatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.Property(t => t.RevokedAt)
            .HasColumnType("timestamptz");

        builder.HasOne(t => t.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.TokenHash)
            .IsUnique()
            .HasDatabaseName("idx_refresh_tokens_token_hash");

        builder.HasIndex(t => t.UserId)
            .HasDatabaseName("idx_refresh_tokens_user_id");

        builder.HasIndex(t => t.TokenFamily)
            .HasDatabaseName("idx_refresh_tokens_token_family");

        builder.HasIndex(t => t.ExpiresAt)
            .HasDatabaseName("idx_refresh_tokens_expires_at");
    }
}

using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FaynoShop.API.Data.Configurations;

public class PasswordResetTokenConfiguration : IEntityTypeConfiguration<PasswordResetToken>
{
    public void Configure(EntityTypeBuilder<PasswordResetToken> builder)
    {
        builder.ToTable("password_reset_tokens");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.TokenHash)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(t => t.ExpiresAt)
            .HasColumnType("timestamptz")
            .IsRequired();

        builder.Property(t => t.IsUsed)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(t => t.CreatedAt)
            .HasColumnType("timestamptz")
            .IsRequired()
            .HasDefaultValueSql("now()");

        builder.HasOne(t => t.User)
            .WithMany(u => u.PasswordResetTokens)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.TokenHash)
            .IsUnique()
            .HasDatabaseName("idx_password_reset_tokens_token_hash");

        builder.HasIndex(t => t.UserId)
            .HasDatabaseName("idx_password_reset_tokens_user_id");

        builder.HasIndex(t => t.ExpiresAt)
            .HasDatabaseName("idx_password_reset_tokens_expires_at");
    }
}

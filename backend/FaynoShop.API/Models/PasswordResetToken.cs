namespace FaynoShop.API.Models;

public class PasswordResetToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    /// <summary>SHA-256 (or similar) hash of the reset token from the email link.</summary>
    public required string TokenHash { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}

namespace FaynoShop.API.Models;

public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    /// <summary>
    /// Rotation chain id. Reuse of a revoked token revokes every token in this family.
    /// </summary>
    public Guid TokenFamily { get; set; }
    /// <summary>SHA-256 (or similar) hash of the opaque refresh token; never store plaintext.</summary>
    public required string TokenHash { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>Set on logout / rotation revoke; null means still usable until expiry.</summary>
    public DateTime? RevokedAt { get; set; }

    public User User { get; set; } = null!;
}

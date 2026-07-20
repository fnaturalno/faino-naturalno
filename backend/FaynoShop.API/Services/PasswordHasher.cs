namespace FaynoShop.API.Services;

/// <summary>Centralized bcrypt hashing (OWASP-recommended work factor).</summary>
public static class PasswordHasher
{
    /// <summary>Minimum bcrypt cost for new password hashes.</summary>
    public const int WorkFactor = 12;

    /// <summary>
    /// Valid bcrypt hash used only to equalize login timing when the email is unknown.
    /// </summary>
    public static readonly string DummyHash =
        BCrypt.Net.BCrypt.HashPassword("timing-equalization-dummy", WorkFactor);

    public static string Hash(string password) =>
        BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

    public static bool Verify(string password, string passwordHash) =>
        BCrypt.Net.BCrypt.Verify(password, passwordHash);
}

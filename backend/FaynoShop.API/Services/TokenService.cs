using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FaynoShop.API.Models;
using FaynoShop.API.Options;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace FaynoShop.API.Services;

public interface ITokenService
{
    string CreateAccessToken(User user);
    (string PlainToken, string TokenHash, DateTime ExpiresAt) CreateRefreshToken();
}

public sealed class TokenService : ITokenService
{
    private readonly JwtOptions _options;
    private readonly SigningCredentials _credentials;

    public TokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        _credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    }

    public string CreateAccessToken(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Email, user.Email),
            new("is_admin", user.IsAdmin ? "true" : "false"),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };

        if (user.IsAdmin)
        {
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));
        }

        var now = DateTime.UtcNow;
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(_options.AccessTokenMinutes),
            signingCredentials: _credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public (string PlainToken, string TokenHash, DateTime ExpiresAt) CreateRefreshToken()
    {
        var plain = TokenHash.CreateOpaqueToken();
        var hash = TokenHash.Sha256Hex(plain);
        var expires = DateTime.UtcNow.AddDays(_options.RefreshTokenDays);
        return (plain, hash, expires);
    }
}

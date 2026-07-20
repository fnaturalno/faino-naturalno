using FaynoShop.API.Data;
using FaynoShop.API.DTOs.Auth;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Models;
using FaynoShop.API.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace FaynoShop.API.Services;

public sealed class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;
    private readonly IEmailSender _email;
    private readonly AppOptions _app;

    public AuthService(
        AppDbContext db,
        ITokenService tokens,
        IEmailSender email,
        IOptions<AppOptions> app)
    {
        _db = db;
        _tokens = tokens;
        _email = email;
        _app = app.Value;
    }

    public async Task<AuthTokensResponse> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);

        if (await _db.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            throw new ConflictException("Користувач з таким email уже існує.");
        }

        var now = DateTime.UtcNow;
        var user = new User
        {
            Email = email,
            PasswordHash = PasswordHasher.Hash(request.Password),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Users.Add(user);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new ConflictException("Користувач з таким email уже існує.");
        }

        return await IssueAuthTokensAsync(user, cancellationToken);
    }

    public async Task<AuthTokensResponse> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        // Always verify against a hash so unknown emails take similar time to wrong passwords.
        var hashToCheck = user?.PasswordHash ?? PasswordHasher.DummyHash;
        var passwordOk = PasswordHasher.Verify(request.Password, hashToCheck);

        if (user is null || !passwordOk)
        {
            throw new UnauthorizedException("Невірний email або пароль.");
        }

        return await IssueAuthTokensAsync(user, cancellationToken);
    }

    public async Task<RefreshTokensResponse> RefreshAsync(
        RefreshRequest request,
        CancellationToken cancellationToken)
    {
        var hash = TokenHash.Sha256Hex(request.RefreshToken);
        var now = DateTime.UtcNow;

        var stored = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);

        if (stored is null || stored.ExpiresAt <= now)
        {
            throw new UnauthorizedException("Недійсний або прострочений refresh token.");
        }

        // Reuse of a rotated/revoked token → revoke the whole family (theft detection).
        if (stored.RevokedAt is not null)
        {
            await RevokeTokenFamilyAsync(stored.TokenFamily, now, cancellationToken);
            throw new UnauthorizedException("Недійсний або прострочений refresh token.");
        }

        // Rotate: revoke current, issue new pair in the same family.
        stored.RevokedAt = now;
        var access = _tokens.CreateAccessToken(stored.User);
        var (plain, newHash, expires) = _tokens.CreateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = stored.UserId,
            TokenFamily = stored.TokenFamily,
            TokenHash = newHash,
            ExpiresAt = expires,
            CreatedAt = now
        });

        await _db.SaveChangesAsync(cancellationToken);
        return new RefreshTokensResponse(access, plain);
    }

    public async Task LogoutAsync(
        int userId,
        LogoutRequest request,
        CancellationToken cancellationToken)
    {
        var hash = TokenHash.Sha256Hex(request.RefreshToken);
        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(
                t => t.TokenHash == hash && t.UserId == userId,
                cancellationToken);

        if (stored is null)
        {
            // Idempotent: unknown token for this user is treated as already logged out.
            return;
        }

        if (stored.RevokedAt is null)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task ForgotPasswordAsync(
        ForgotPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        // Always succeed — no account enumeration.
        if (user is null)
        {
            return;
        }

        var plain = TokenHash.CreateOpaqueToken();
        var hash = TokenHash.Sha256Hex(plain);
        var now = DateTime.UtcNow;

        // Invalidate prior unused reset tokens so only the latest email link works.
        await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && !t.IsUsed)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsUsed, true), cancellationToken);

        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAt = now.AddHours(_app.PasswordResetTokenHours),
            IsUsed = false,
            CreatedAt = now
        });
        await _db.SaveChangesAsync(cancellationToken);

        var baseUrl = _app.FrontendBaseUrl.TrimEnd('/');
        var link = $"{baseUrl}/auth/reset-password?token={Uri.EscapeDataString(plain)}";

        await _email.SendAsync(
            user.Email,
            "Скидання пароля — Файно натурально",
            $"Щоб встановити новий пароль, відкрийте посилання (дійсне {_app.PasswordResetTokenHours} год):\n{link}",
            cancellationToken);
    }

    public async Task ResetPasswordAsync(
        ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var hash = TokenHash.Sha256Hex(request.Token);
        var now = DateTime.UtcNow;

        var stored = await _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);

        if (stored is null || stored.IsUsed || stored.ExpiresAt <= now)
        {
            throw new BadRequestException(
                "Посилання для скидання пароля недійсне або прострочене. Запросіть новий лист.");
        }

        stored.IsUsed = true;
        stored.User.PasswordHash = PasswordHasher.Hash(request.Password);
        stored.User.UpdatedAt = now;

        // Password change invalidates outstanding refresh sessions for this user.
        await _db.RefreshTokens
            .Where(t => t.UserId == stored.UserId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), cancellationToken);

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserDto> GetMeAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("Користувача не знайдено.");

        return UserMapping.ToDto(user);
    }

    public async Task<UserDto> UpdateMeAsync(
        int userId,
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("Користувача не знайдено.");

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Phone = string.IsNullOrWhiteSpace(request.Phone)
            ? null
            : request.Phone.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return UserMapping.ToDto(user);
    }

    public async Task<DeliveryAddressDto?> GetDeliveryAddressAsync(
        int userId,
        CancellationToken cancellationToken)
    {
        var address = await _db.UserDeliveryAddresses
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == userId, cancellationToken);

        return address is null ? null : MapAddress(address);
    }

    public async Task<DeliveryAddressDto> SaveDeliveryAddressAsync(
        int userId,
        SaveDeliveryAddressRequest request,
        CancellationToken cancellationToken)
    {
        if (!await _db.Users.AnyAsync(u => u.Id == userId, cancellationToken))
        {
            throw new NotFoundException("Користувача не знайдено.");
        }

        var summary = string.IsNullOrWhiteSpace(request.Summary)
            ? $"{request.CityName.Trim()}, {request.BranchLabel.Trim()}"
            : request.Summary.Trim();

        var now = DateTime.UtcNow;
        var existing = await _db.UserDeliveryAddresses
            .FirstOrDefaultAsync(a => a.UserId == userId, cancellationToken);

        if (existing is null)
        {
            existing = new UserDeliveryAddress
            {
                UserId = userId,
                CityId = request.CityId.Trim(),
                CityName = request.CityName.Trim(),
                CityRegion = string.IsNullOrWhiteSpace(request.CityRegion)
                    ? null
                    : request.CityRegion.Trim(),
                BranchId = request.BranchId.Trim(),
                BranchLabel = request.BranchLabel.Trim(),
                Summary = summary,
                UpdatedAt = now
            };
            _db.UserDeliveryAddresses.Add(existing);
        }
        else
        {
            existing.CityId = request.CityId.Trim();
            existing.CityName = request.CityName.Trim();
            existing.CityRegion = string.IsNullOrWhiteSpace(request.CityRegion)
                ? null
                : request.CityRegion.Trim();
            existing.BranchId = request.BranchId.Trim();
            existing.BranchLabel = request.BranchLabel.Trim();
            existing.Summary = summary;
            existing.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return MapAddress(existing);
    }

    private async Task<AuthTokensResponse> IssueAuthTokensAsync(
        User user,
        CancellationToken cancellationToken)
    {
        var access = _tokens.CreateAccessToken(user);
        var (plain, hash, expires) = _tokens.CreateRefreshToken();
        var now = DateTime.UtcNow;

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenFamily = Guid.NewGuid(),
            TokenHash = hash,
            ExpiresAt = expires,
            CreatedAt = now
        });
        await _db.SaveChangesAsync(cancellationToken);

        return new AuthTokensResponse(access, plain, UserMapping.ToDto(user));
    }

    private async Task RevokeTokenFamilyAsync(
        Guid tokenFamily,
        DateTime revokedAt,
        CancellationToken cancellationToken)
    {
        await _db.RefreshTokens
            .Where(t => t.TokenFamily == tokenFamily && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, revokedAt), cancellationToken);
    }

    private static DeliveryAddressDto MapAddress(UserDeliveryAddress a) => new(
        a.CityId,
        a.CityName,
        a.CityRegion,
        a.BranchId,
        a.BranchLabel,
        a.Summary);

    private static string NormalizeEmail(string email) =>
        email.Trim().ToLowerInvariant();

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}

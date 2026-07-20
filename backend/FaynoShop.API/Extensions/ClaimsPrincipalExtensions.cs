using System.Security.Claims;
using FaynoShop.API.Exceptions;

namespace FaynoShop.API.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int GetRequiredUserId(this ClaimsPrincipal user)
    {
        if (!TryGetUserId(user, out var userId))
        {
            throw new UnauthorizedException("Необхідна авторизація.");
        }

        return userId;
    }

    /// <summary>
    /// Optional auth for public cart endpoints: returns the JWT user id when authenticated.
    /// </summary>
    public static bool TryGetUserId(this ClaimsPrincipal user, out int userId)
    {
        userId = 0;

        if (user.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");

        return int.TryParse(raw, out userId) && userId > 0;
    }
}

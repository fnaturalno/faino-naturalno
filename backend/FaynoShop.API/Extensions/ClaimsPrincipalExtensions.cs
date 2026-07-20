using System.Security.Claims;
using FaynoShop.API.Exceptions;

namespace FaynoShop.API.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int GetRequiredUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");

        if (!int.TryParse(raw, out var userId) || userId <= 0)
        {
            throw new UnauthorizedException("Необхідна авторизація.");
        }

        return userId;
    }
}

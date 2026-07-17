namespace FaynoShop.API.Constants;

/// <summary>
/// Anonymous cart session contract for the frontend.
/// Generate a UUID (lowercase hex 8-4-4-4-12), persist it in localStorage,
/// and send it on every cart mutation via this header.
/// </summary>
public static class CartSessionHeaders
{
    /// <summary>Request header name: X-Cart-Session-Id</summary>
    public const string SessionId = "X-Cart-Session-Id";

    /// <summary>UUID string length (e.g. crypto.randomUUID()).</summary>
    public const int MaxLength = 36;
}

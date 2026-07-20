namespace FaynoShop.API.DTOs.Auth;

public sealed record UserDto(
    int Id,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    DateTime CreatedAt,
    bool IsAdmin);

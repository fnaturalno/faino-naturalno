namespace FaynoShop.API.Exceptions;

public sealed class BadRequestException : AppException
{
    public BadRequestException(string message)
        : base(message, StatusCodes.Status400BadRequest)
    {
    }
}

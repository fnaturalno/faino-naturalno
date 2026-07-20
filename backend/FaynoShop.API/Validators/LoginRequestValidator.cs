using FaynoShop.API.DTOs.Auth;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email є обов'язковим.")
            .EmailAddress().WithMessage("Некоректний формат email.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Пароль є обов'язковим.")
            .MaximumLength(128).WithMessage("Пароль не може перевищувати 128 символів.");
    }
}

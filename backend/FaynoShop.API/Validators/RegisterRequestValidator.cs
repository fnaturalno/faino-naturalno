using FaynoShop.API.DTOs.Auth;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Ім'я є обов'язковим.")
            .MaximumLength(100).WithMessage("Ім'я не може перевищувати 100 символів.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Прізвище є обов'язковим.")
            .MaximumLength(100).WithMessage("Прізвище не може перевищувати 100 символів.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email є обов'язковим.")
            .EmailAddress().WithMessage("Некоректний формат email.")
            .MaximumLength(256).WithMessage("Email не може перевищувати 256 символів.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Пароль є обов'язковим.")
            .MinimumLength(8).WithMessage("Пароль має містити щонайменше 8 символів.")
            .MaximumLength(128).WithMessage("Пароль не може перевищувати 128 символів.");
    }
}

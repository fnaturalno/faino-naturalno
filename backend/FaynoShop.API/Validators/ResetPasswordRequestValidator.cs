using FaynoShop.API.DTOs.Auth;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Токен скидання пароля є обов'язковим.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Пароль є обов'язковим.")
            .MinimumLength(8).WithMessage("Пароль має містити щонайменше 8 символів.")
            .MaximumLength(128).WithMessage("Пароль не може перевищувати 128 символів.");
    }
}

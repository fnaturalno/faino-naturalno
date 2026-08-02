using FaynoShop.API.DTOs.Auth;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Поточний пароль є обов'язковим.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Новий пароль є обов'язковим.")
            .MinimumLength(8).WithMessage("Пароль має містити щонайменше 8 символів.")
            .MaximumLength(128).WithMessage("Пароль не може перевищувати 128 символів.");
    }
}

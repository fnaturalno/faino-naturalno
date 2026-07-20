using System.Text.RegularExpressions;
using FaynoShop.API.DTOs.Auth;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    private static readonly Regex UaPhone = new(@"^\+380\d{9}$", RegexOptions.Compiled);

    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Ім'я є обов'язковим.")
            .MaximumLength(100).WithMessage("Ім'я не може перевищувати 100 символів.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Прізвище є обов'язковим.")
            .MaximumLength(100).WithMessage("Прізвище не може перевищувати 100 символів.");

        RuleFor(x => x.Phone)
            .MaximumLength(20).WithMessage("Телефон не може перевищувати 20 символів.")
            .Must(phone => string.IsNullOrWhiteSpace(phone) || UaPhone.IsMatch(phone.Trim()))
            .WithMessage("Телефон має бути у форматі +380XXXXXXXXX.");
    }
}

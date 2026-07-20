using System.Text.RegularExpressions;
using FaynoShop.API.DTOs.Orders;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class PlaceOrderRequestValidator : AbstractValidator<PlaceOrderRequest>
{
    private static readonly Regex UaPhone = new(@"^\+380\d{9}$", RegexOptions.Compiled);

    public PlaceOrderRequestValidator()
    {
        // Keep each part ≤50 so RecipientName ("{first} {last}") stays within DB max 200.
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Ім'я є обов'язковим.")
            .MaximumLength(50).WithMessage("Ім'я не може перевищувати 50 символів.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Прізвище є обов'язковим.")
            .MaximumLength(50).WithMessage("Прізвище не може перевищувати 50 символів.");

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("Телефон є обов'язковим.")
            .Must(phone => phone is not null && UaPhone.IsMatch(phone.Trim()))
            .WithMessage("Телефон має бути у форматі +380XXXXXXXXX.")
            .MaximumLength(20).WithMessage("Телефон не може перевищувати 20 символів.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email є обов'язковим.")
            .EmailAddress().WithMessage("Некоректний формат email.")
            .MaximumLength(256).WithMessage("Email не може перевищувати 256 символів.");

        RuleFor(x => x.CityId)
            .NotEmpty().WithMessage("Оберіть місто.")
            .MaximumLength(64);

        RuleFor(x => x.CityName)
            .NotEmpty().WithMessage("Назва міста є обов'язковою.")
            .MaximumLength(200);

        RuleFor(x => x.CityRegion)
            .MaximumLength(200)
            .When(x => x.CityRegion is not null);

        RuleFor(x => x.BranchId)
            .NotEmpty().WithMessage("Оберіть відділення.")
            .MaximumLength(64);

        RuleFor(x => x.BranchLabel)
            .NotEmpty().WithMessage("Назва відділення є обов'язковою.")
            .MaximumLength(300);

        RuleFor(x => x.DeliveryAddress)
            .NotEmpty().WithMessage("Адреса доставки є обов'язковою.")
            .MaximumLength(500).WithMessage("Адреса доставки не може перевищувати 500 символів.");

        RuleFor(x => x.Comment)
            .MaximumLength(1000).WithMessage("Коментар не може перевищувати 1000 символів.")
            .When(x => x.Comment is not null);
    }
}

using FaynoShop.API.DTOs.Auth;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class SaveDeliveryAddressRequestValidator : AbstractValidator<SaveDeliveryAddressRequest>
{
    public SaveDeliveryAddressRequestValidator()
    {
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

        RuleFor(x => x.Summary)
            .MaximumLength(500)
            .When(x => x.Summary is not null);
    }
}

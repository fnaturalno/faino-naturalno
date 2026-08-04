using FaynoShop.API.DTOs.Categories;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class SaveCategoryRequestValidator : AbstractValidator<SaveCategoryRequest>
{
    public SaveCategoryRequestValidator()
    {
        RuleFor(x => x.NameUk).NotEmpty().WithMessage("Вкажіть назву категорії.").MaximumLength(100);
        RuleFor(x => x.NameEn).MaximumLength(100).WithMessage("Англійська назва занадто довга.")
            .When(x => !string.IsNullOrWhiteSpace(x.NameEn));
        RuleFor(x => x.Slug).MaximumLength(100).When(x => !string.IsNullOrWhiteSpace(x.Slug));
        RuleFor(x => x.DescriptionUk).MaximumLength(2_000);
        RuleFor(x => x.DescriptionEn).MaximumLength(2_000);
        RuleFor(x => x.ParentId).GreaterThan(0).When(x => x.ParentId.HasValue);
    }
}

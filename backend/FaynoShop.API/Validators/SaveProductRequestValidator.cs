using FaynoShop.API.Constants;
using FaynoShop.API.DTOs.Products;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class SaveProductRequestValidator : AbstractValidator<SaveProductRequest>
{
    public SaveProductRequestValidator()
    {
        RuleFor(x => x.NameUk).NotEmpty().WithMessage("Вкажіть назву товару.").MaximumLength(200);
        RuleFor(x => x.NameEn).MaximumLength(200).WithMessage("Англійська назва занадто довга.")
            .When(x => !string.IsNullOrWhiteSpace(x.NameEn));
        RuleFor(x => x.Slug).MaximumLength(200).WithMessage("Slug не може перевищувати 200 символів.")
            .When(x => !string.IsNullOrWhiteSpace(x.Slug));
        RuleFor(x => x.CategoryId).GreaterThan(0).WithMessage("Оберіть категорію.");
        RuleFor(x => x.ShortDescriptionUk).MaximumLength(500).WithMessage("Короткий опис занадто довгий.");
        RuleFor(x => x.ShortDescriptionEn).MaximumLength(500).WithMessage("Англійський короткий опис занадто довгий.");
        RuleFor(x => x.DescriptionUk).MaximumLength(10_000).WithMessage("Повний опис занадто довгий.");
        RuleFor(x => x.DescriptionEn).MaximumLength(10_000).WithMessage("Англійський повний опис занадто довгий.");
        RuleFor(x => x.ImageUrl).MaximumLength(500).WithMessage("URL зображення занадто довгий.");
        RuleForEach(x => x.ImageUrls).NotEmpty().WithMessage("URL зображення не може бути порожнім.")
            .MaximumLength(500).WithMessage("URL зображення занадто довгий.");
        RuleFor(x => x.ImageUrls).Must(urls => urls is null || urls.Count <= 20)
            .WithMessage("Галерея може містити не більше 20 зображень.");

        RuleFor(x => x.Strength)
            .InclusiveBetween(ProductStrength.Min, ProductStrength.Max)
            .WithMessage($"Міцність має бути від {ProductStrength.Min} до {ProductStrength.Max}.")
            .When(x => x.Strength.HasValue);

        RuleFor(x => x.Variants)
            .Must(variants => variants is null || variants.Count <= PredefinedWeights.All.Count)
            .WithMessage($"Товар може мати не більше {PredefinedWeights.All.Count} фасувань.");

        RuleFor(x => x.Variants)
            .Must(HaveUniquePackagings)
            .WithMessage("Фасування не повинні повторюватися.")
            .When(x => x.Variants is { Count: > 0 });

        RuleFor(x => x)
            .Must(x => !x.IsActive || HasAtLeastOneActivePricedVariant(x.Variants))
            .WithMessage("Активний товар потребує хоча б одного активного фасування з ціною.");

        RuleForEach(x => x.Variants).ChildRules(variant =>
        {
            variant.RuleFor(v => v.Price)
                .GreaterThan(0)
                .WithMessage("Ціна фасування має бути більшою за нуль.");

            variant.RuleFor(v => v.WeightUnit)
                .NotEmpty()
                .WithMessage("Вкажіть одиницю фасування.");

            variant.RuleFor(v => v)
                .Must(v => !string.IsNullOrWhiteSpace(v.WeightUnit)
                    && PredefinedWeights.IsAllowed(v.Weight, v.WeightUnit))
                .WithMessage("Фасування має відповідати одному з дозволених: 10г, 50г, 100г, 250г, 500г, 1кг, 1шт.");
        });
    }

    private static bool HaveUniquePackagings(IReadOnlyList<SaveProductVariantRequest>? variants)
    {
        if (variants is null || variants.Count == 0)
        {
            return true;
        }

        return variants
            .Select(v => (v.Weight, Unit: v.WeightUnit.Trim()))
            .Distinct()
            .Count() == variants.Count;
    }

    private static bool HasAtLeastOneActivePricedVariant(IReadOnlyList<SaveProductVariantRequest>? variants) =>
        variants is not null && variants.Any(v => v.IsActive && v.Price > 0);
}

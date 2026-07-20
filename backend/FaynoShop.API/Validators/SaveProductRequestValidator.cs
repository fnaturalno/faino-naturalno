using FaynoShop.API.DTOs.Products;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class SaveProductRequestValidator : AbstractValidator<SaveProductRequest>
{
    private static readonly string[] AllowedWeightUnits = ["г", "кг", "мл", "л", "шт"];

    public SaveProductRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Вкажіть назву товару.").MaximumLength(200);
        RuleFor(x => x.Slug).MaximumLength(200).WithMessage("Slug не може перевищувати 200 символів.")
            .When(x => !string.IsNullOrWhiteSpace(x.Slug));
        RuleFor(x => x.CategoryId).GreaterThan(0).WithMessage("Оберіть категорію.");
        RuleFor(x => x.ShortDescription).MaximumLength(500).WithMessage("Короткий опис занадто довгий.");
        RuleFor(x => x.Description).MaximumLength(10_000).WithMessage("Повний опис занадто довгий.");
        RuleFor(x => x.Price).GreaterThan(0).WithMessage("Ціна має бути більшою за нуль.");
        RuleFor(x => x.OldPrice).GreaterThan(0).WithMessage("Стара ціна має бути більшою за нуль.")
            .When(x => x.OldPrice.HasValue);
        RuleFor(x => x.Weight).GreaterThan(0).WithMessage("Вага має бути більшою за нуль.")
            .When(x => x.Weight.HasValue);
        RuleFor(x => x.WeightUnit)
            .Must(unit => string.IsNullOrWhiteSpace(unit) || AllowedWeightUnits.Contains(unit.Trim()))
            .WithMessage("Одиниця виміру має бути: г, кг, мл, л або шт.");
        RuleFor(x => x.StockQuantity).GreaterThanOrEqualTo(0).WithMessage("Залишок не може бути від'ємним.");
        RuleFor(x => x.ImageUrl).MaximumLength(500).WithMessage("URL зображення занадто довгий.");
        RuleForEach(x => x.ImageUrls).NotEmpty().WithMessage("URL зображення не може бути порожнім.")
            .MaximumLength(500).WithMessage("URL зображення занадто довгий.");
        RuleFor(x => x.ImageUrls).Must(urls => urls is null || urls.Count <= 20)
            .WithMessage("Галерея може містити не більше 20 зображень.");
    }
}

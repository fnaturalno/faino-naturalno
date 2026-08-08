using FaynoShop.API.DTOs.News;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class SaveNewsPostRequestValidator : AbstractValidator<SaveNewsPostRequest>
{
    public SaveNewsPostRequestValidator()
    {
        RuleFor(x => x.TitleUk)
            .NotEmpty().WithMessage("Вкажіть заголовок новини.")
            .MaximumLength(300);

        RuleFor(x => x.TitleEn)
            .MaximumLength(300).WithMessage("Англійський заголовок занадто довгий.")
            .When(x => !string.IsNullOrWhiteSpace(x.TitleEn));

        RuleFor(x => x.Slug)
            .MaximumLength(300).WithMessage("Slug не може перевищувати 300 символів.")
            .When(x => !string.IsNullOrWhiteSpace(x.Slug));

        RuleFor(x => x.ExcerptUk).MaximumLength(500);
        RuleFor(x => x.ExcerptEn).MaximumLength(500);

        RuleFor(x => x.BodyUk)
            .NotEmpty().WithMessage("Для публікації потрібен текст новини (UK).")
            .When(x => x.IsPublished);

        RuleFor(x => x.CoverImageUrl)
            .MaximumLength(500).WithMessage("URL обкладинки занадто довгий.")
            .When(x => !string.IsNullOrWhiteSpace(x.CoverImageUrl));
    }
}

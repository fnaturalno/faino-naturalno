using FaynoShop.API.DTOs.Cart;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class AddCartItemRequestValidator : AbstractValidator<AddCartItemRequest>
{
    public AddCartItemRequestValidator()
    {
        RuleFor(x => x.ProductId)
            .GreaterThan(0)
            .WithMessage("Ідентифікатор товару є обов'язковим.");

        RuleFor(x => x.Quantity)
            .Must(q => q is null or 1)
            .WithMessage("Каталог додає рівно одну одиницю товару.");
    }
}

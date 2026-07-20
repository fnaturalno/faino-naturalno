using FaynoShop.API.Constants;
using FaynoShop.API.DTOs.Cart;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class UpdateCartItemRequestValidator : AbstractValidator<UpdateCartItemRequest>
{
    public UpdateCartItemRequestValidator()
    {
        RuleFor(x => x.Quantity)
            .InclusiveBetween(1, CartLimits.MaxLineQuantity)
            .WithMessage($"Кількість має бути від 1 до {CartLimits.MaxLineQuantity}.");
    }
}

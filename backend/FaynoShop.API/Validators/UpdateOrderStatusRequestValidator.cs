using FaynoShop.API.DTOs.Orders;
using FaynoShop.API.Models;
using FluentValidation;

namespace FaynoShop.API.Validators;

public sealed class UpdateOrderStatusRequestValidator : AbstractValidator<UpdateOrderStatusRequest>
{
    public UpdateOrderStatusRequestValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(status => Enum.TryParse<OrderStatus>(status, true, out _))
            .WithMessage("Вкажіть коректний статус замовлення.");
    }
}

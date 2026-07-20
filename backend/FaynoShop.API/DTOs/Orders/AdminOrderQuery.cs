namespace FaynoShop.API.DTOs.Orders;

public sealed class AdminOrderQuery
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public int? Page { get; set; }
    public int? PageSize { get; set; }
}

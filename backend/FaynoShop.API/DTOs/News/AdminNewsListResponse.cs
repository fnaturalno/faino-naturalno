namespace FaynoShop.API.DTOs.News;

public sealed record AdminNewsListResponse(
    IReadOnlyList<AdminNewsListItemDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

namespace FaynoShop.API.DTOs.News;

public sealed record NewsListResponse(
    IReadOnlyList<NewsListItemDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

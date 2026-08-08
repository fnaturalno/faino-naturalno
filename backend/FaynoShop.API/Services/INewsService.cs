using FaynoShop.API.DTOs.News;

namespace FaynoShop.API.Services;

public interface INewsService
{
    Task<NewsListResponse> GetPublishedAsync(
        NewsQuery query,
        string locale,
        CancellationToken cancellationToken);

    Task<NewsDetailDto> GetPublishedBySlugAsync(
        string slug,
        string locale,
        CancellationToken cancellationToken);

    Task<AdminNewsListResponse> GetAdminListAsync(
        AdminNewsQuery query,
        CancellationToken cancellationToken);

    Task<AdminNewsDto> GetForAdminAsync(int id, CancellationToken cancellationToken);

    Task<AdminNewsDto> CreateAsync(SaveNewsPostRequest request, CancellationToken cancellationToken);

    Task<AdminNewsDto> UpdateAsync(int id, SaveNewsPostRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);
}

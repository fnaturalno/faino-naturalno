using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FaynoShop.API.DTOs.Shipping;
using FaynoShop.API.Exceptions;
using FaynoShop.API.Options;
using Microsoft.Extensions.Options;

namespace FaynoShop.API.Services;

/// <summary>
/// Live Nova Poshta API provider (https://api.novaposhta.ua/v2.0/json/).
/// Registered only when <see cref="NovaPoshtaOptions.ApiKey"/> is configured.
/// Contract matches <see cref="INovaPoshtaProvider"/> so the frontend is unchanged.
/// </summary>
public sealed class ApiNovaPoshtaProvider : INovaPoshtaProvider
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly ILogger<ApiNovaPoshtaProvider> _logger;

    public string ProviderName => "api";

    public ApiNovaPoshtaProvider(
        HttpClient http,
        IOptions<NovaPoshtaOptions> options,
        ILogger<ApiNovaPoshtaProvider> logger)
    {
        _http = http;
        _apiKey = options.Value.ApiKey!.Trim();
        _logger = logger;
    }

    public async Task<IReadOnlyList<NpCityDto>> SearchCitiesAsync(
        string query,
        CancellationToken cancellationToken)
    {
        var q = (query ?? string.Empty).Trim();
        var payload = new NpRequest
        {
            ApiKey = _apiKey,
            ModelName = "Address",
            CalledMethod = "searchSettlements",
            MethodProperties = new Dictionary<string, object>
            {
                ["CityName"] = q,
                ["Limit"] = 20
            }
        };

        var root = await PostAsync(payload, cancellationToken);
        var cities = new List<NpCityDto>();

        if (root?.Data is not { Count: > 0 })
        {
            return cities;
        }

        foreach (var block in root.Data)
        {
            if (block.Addresses is null)
            {
                continue;
            }

            foreach (var a in block.Addresses)
            {
                if (string.IsNullOrWhiteSpace(a.Ref) || string.IsNullOrWhiteSpace(a.Present))
                {
                    continue;
                }

                cities.Add(new NpCityDto(a.Ref, a.MainDescription ?? a.Present, a.Area));
            }
        }

        return cities;
    }

    public async Task<IReadOnlyList<NpBranchDto>> GetBranchesAsync(
        string cityId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(cityId))
        {
            throw new BadRequestException("Параметр cityId є обов'язковим.");
        }

        var payload = new NpRequest
        {
            ApiKey = _apiKey,
            ModelName = "Address",
            CalledMethod = "getWarehouses",
            MethodProperties = new Dictionary<string, object>
            {
                ["CityRef"] = cityId.Trim(),
                ["Limit"] = 500
            }
        };

        var root = await PostAsync(payload, cancellationToken);
        if (root?.Data is null)
        {
            return Array.Empty<NpBranchDto>();
        }

        return root.Data
            .Where(w => !string.IsNullOrWhiteSpace(w.Ref) && !string.IsNullOrWhiteSpace(w.Description))
            .Select(w => new NpBranchDto(
                w.Ref!,
                w.Description!,
                w.CategoryOfWarehouse))
            .ToList();
    }

    private async Task<NpResponse?> PostAsync(NpRequest request, CancellationToken cancellationToken)
    {
        using var response = await _http.PostAsJsonAsync(string.Empty, request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var root = await response.Content.ReadFromJsonAsync<NpResponse>(JsonOptions, cancellationToken);
        if (root is { Success: false } && root.Errors is { Count: > 0 })
        {
            _logger.LogWarning("Nova Poshta API errors: {Errors}", string.Join("; ", root.Errors));
            throw new BadRequestException("Помилка сервісу Нової Пошти. Спробуйте пізніше.");
        }

        return root;
    }

    private sealed class NpRequest
    {
        [JsonPropertyName("apiKey")]
        public string ApiKey { get; set; } = string.Empty;

        [JsonPropertyName("modelName")]
        public string ModelName { get; set; } = string.Empty;

        [JsonPropertyName("calledMethod")]
        public string CalledMethod { get; set; } = string.Empty;

        [JsonPropertyName("methodProperties")]
        public Dictionary<string, object> MethodProperties { get; set; } = new();
    }

    private sealed class NpResponse
    {
        public bool Success { get; set; }
        public List<string>? Errors { get; set; }
        public List<NpDataItem>? Data { get; set; }
    }

    private sealed class NpDataItem
    {
        // searchSettlements
        public List<NpAddressHit>? Addresses { get; set; }

        // getWarehouses (flat on data items)
        public string? Ref { get; set; }
        public string? Description { get; set; }
        public string? CategoryOfWarehouse { get; set; }
    }

    private sealed class NpAddressHit
    {
        public string? Ref { get; set; }
        public string? Present { get; set; }
        public string? MainDescription { get; set; }
        public string? Area { get; set; }
    }
}

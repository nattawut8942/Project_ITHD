using System.Net.Http.Json;
using HelpDeskApi.Models;

namespace HelpDeskApi.Services;

/// <summary>
/// Talks to the existing Stock system's REST API (backend/src/controller/productController.js).
/// Calls are server-to-server from the Helpdesk backend, so the Stock system's CORS policy
/// (which likely only allows its own frontend's origin) never comes into play.
/// </summary>
public class StockApiService
{
    private readonly HttpClient _http;

    public StockApiService(IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _http = httpClientFactory.CreateClient();
        var baseUrl = config["StockApi:BaseUrl"]?.TrimEnd('/')
            ?? throw new InvalidOperationException("Missing StockApi:BaseUrl in appsettings.json");
        _http.BaseAddress = new Uri(baseUrl + "/");
        _http.Timeout = TimeSpan.FromSeconds(10);
    }

    /// <summary>GET /products - returns the raw product list (Stock returns a bare array, not wrapped).</summary>
    public async Task<List<StockProductDto>> GetProductsAsync()
    {
        var result = await _http.GetFromJsonAsync<List<StockProductDto>>("products");
        return result ?? new List<StockProductDto>();
    }

    /// <summary>GET /device-types - the categories used to group products (e.g. "Storage", "Asset").</summary>
    public async Task<List<StockDeviceTypeDto>> GetDeviceTypesAsync()
    {
        var result = await _http.GetFromJsonAsync<List<StockDeviceTypeDto>>("types");
        return result ?? new List<StockDeviceTypeDto>();
    }

    /// <summary>
    /// POST /products/withdraw - deducts stock and logs an OUT transaction on the Stock side.
    /// Stock's own controller already validates sufficient quantity and Asset S/N requirements,
    /// so this just forwards the call and reports success/failure.
    /// </summary>
    public async Task<StockWithdrawResult> WithdrawAsync(StockWithdrawRequest request)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("products/withdraw", request);
            if (response.IsSuccessStatusCode)
                return new StockWithdrawResult(true, null);

            // Stock's error responses use { error: "..." } rather than Helpdesk's { message: "..." }.
            string? errorMessage = null;
            try
            {
                var body = await response.Content.ReadFromJsonAsync<Dictionary<string, object?>>();
                errorMessage = body != null && body.TryGetValue("error", out var e) ? e?.ToString() : null;
            }
            catch { /* non-JSON error body - fall through to status code message */ }

            return new StockWithdrawResult(false, errorMessage ?? $"Stock API returned {(int)response.StatusCode}");
        }
        catch (Exception ex)
        {
            return new StockWithdrawResult(false, $"Cannot reach Stock system: {ex.Message}");
        }
    }
}

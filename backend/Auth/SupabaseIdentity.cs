using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace WorldEventAlerts.Auth;

public sealed class SupabaseSettings
{
    public string Url { get; init; } = "";
    public string PublishableKey { get; init; } = "";
    public string SecretKey { get; init; } = "";
    public string BrowserKey => PublishableKey.StartsWith("sb_publishable_", StringComparison.Ordinal)
        ? PublishableKey
        : "";
}

public sealed record SupabaseAppMetadata([property: JsonPropertyName("app_role")] string? AppRole);

public sealed record SupabaseUser(
    string Id,
    [property: JsonPropertyName("email_confirmed_at")] string? EmailConfirmedAt,
    [property: JsonPropertyName("app_metadata")] SupabaseAppMetadata? AppMetadata);

public sealed class SupabaseIdentity(HttpClient client, IOptions<SupabaseSettings> settings)
{
    public async Task<SupabaseUser?> VerifyAsync(string token, CancellationToken cancellationToken)
    {
        SupabaseSettings config = settings.Value;
        if (string.IsNullOrWhiteSpace(config.BrowserKey) ||
            !Uri.TryCreate(config.Url, UriKind.Absolute, out Uri? baseUri) ||
            baseUri.Scheme != Uri.UriSchemeHttps)
            return null;

        using HttpRequestMessage request = new(HttpMethod.Get, new Uri(baseUri, "/auth/v1/user"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("apikey", config.BrowserKey);
        using HttpResponseMessage response = await client.SendAsync(request, cancellationToken);
        return response.IsSuccessStatusCode
            ? await response.Content.ReadFromJsonAsync<SupabaseUser>(cancellationToken)
            : null;
    }
}

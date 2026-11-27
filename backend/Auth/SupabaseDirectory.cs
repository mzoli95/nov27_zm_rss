using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace WorldEventAlerts.Auth;

public sealed record DirectoryUser(Guid Id, string? Email,
    [property: JsonPropertyName("email_confirmed_at")] string? EmailConfirmedAt,
    [property: JsonPropertyName("app_metadata")] SupabaseAppMetadata? Metadata);
public sealed record DirectoryPage(DirectoryUser[] Users, long? Total);

public sealed class SupabaseDirectory(HttpClient client, IOptions<SupabaseSettings> options)
{
    public bool IsConfigured => options.Value.SecretKey.StartsWith("sb_secret_", StringComparison.Ordinal) &&
        Uri.TryCreate(options.Value.Url, UriKind.Absolute, out Uri? uri) && uri.Scheme == Uri.UriSchemeHttps;

    public async Task<IResult> ListAsync(int? page, string? search, CancellationToken token)
    {
        if (!IsConfigured) return Results.Problem("Configure Supabase.SecretKey on the backend.", statusCode: 503);
        if (search?.Length > 200) return Results.BadRequest(new { message = "Use up to 200 characters." });
        const int size = 20;
        int current = Math.Clamp(page ?? 1, 1, 100_000);
        try
        {
            string filter = string.IsNullOrWhiteSpace(search) ? "" : "&filter=" + Uri.EscapeDataString(search.Trim());
            DirectoryPage? result = await GetAsync<DirectoryPage>(
                $"/auth/v1/admin/users?page={current}&per_page={size}{filter}", token);
            if (result?.Users is null) return Results.Problem("Supabase returned an invalid user list.", statusCode: 502);
            return Results.Ok(new
            {
                page = current,
                pageSize = size,
                total = result.Total,
                items = result.Users.Select(user => new { user.Id, user.Email,
                    role = user.Metadata?.AppRole == nameof(AppRole.Admin) ? AppRole.Admin : AppRole.User })
            });
        }
        catch (Exception error) when (IsFailure(error, token))
        {
            return Results.Problem("The Supabase user list is unavailable.", statusCode: 502);
        }
    }

    public Task<DirectoryUser?> FindAsync(Guid userId, CancellationToken token) =>
        GetAsync<DirectoryUser>($"/auth/v1/admin/users/{userId}", token);

    private async Task<T?> GetAsync<T>(string path, CancellationToken token)
    {
        using HttpRequestMessage request = new(HttpMethod.Get, new Uri(new Uri(options.Value.Url), path));
        request.Headers.Add("apikey", options.Value.SecretKey);
        using HttpResponseMessage response = await client.SendAsync(request, token);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return default;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(token);
    }

    internal static bool IsFailure(Exception error, CancellationToken token) =>
        !token.IsCancellationRequested &&
        error is (HttpRequestException or System.Text.Json.JsonException or OperationCanceledException);
}

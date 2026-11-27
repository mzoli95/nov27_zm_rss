using System.Net;
using System.Security.Claims;
using Microsoft.Extensions.Options;

namespace WorldEventAlerts.Auth;

public sealed record ChangeRoleRequest(string Role);

public sealed class RoleAdministration(HttpClient client, IOptions<SupabaseSettings> settings)
{
    public async Task<IResult> ChangeRoleAsync(Guid id, ChangeRoleRequest request,
        ClaimsPrincipal actor, CancellationToken cancellationToken)
    {
        if (request.Role is not (nameof(AppRole.User) or nameof(AppRole.Admin)))
            return Results.BadRequest(new { message = "Choose User or Admin." });
        if (request.Role == nameof(AppRole.User) &&
            Guid.TryParse(actor.FindFirstValue(ClaimTypes.NameIdentifier), out Guid actorId) && id == actorId)
            return Results.BadRequest(new { message = "You cannot remove your own admin role." });

        SupabaseSettings config = settings.Value;
        if (!config.SecretKey.StartsWith("sb_secret_", StringComparison.Ordinal) ||
            !Uri.TryCreate(config.Url, UriKind.Absolute, out Uri? uri) ||
            uri.Scheme != Uri.UriSchemeHttps)
            return Results.Problem("Configure the server-side Supabase secret key.", statusCode: 503);

        using HttpRequestMessage update = new(HttpMethod.Put, new Uri(uri, $"/auth/v1/admin/users/{id}"));
        update.Headers.Add("apikey", config.SecretKey);
        update.Content = JsonContent.Create(new { app_metadata = new { app_role = request.Role } });
        try
        {
            using HttpResponseMessage response = await client.SendAsync(update, cancellationToken);
            if (response.IsSuccessStatusCode) return Results.NoContent();
            if (response.StatusCode == HttpStatusCode.NotFound) return Results.NotFound();
            return Results.Problem("Supabase rejected the role update.", statusCode: 502);
        }
        catch (Exception error) when (error is HttpRequestException ||
            error is OperationCanceledException && !cancellationToken.IsCancellationRequested)
        {
            return Results.Problem("Supabase is unavailable.", statusCode: 502);
        }
    }
}

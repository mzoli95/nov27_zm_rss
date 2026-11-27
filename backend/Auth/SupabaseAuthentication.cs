using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace WorldEventAlerts.Auth;

public sealed class SupabaseAuthentication(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IServiceProvider services) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!AuthenticationHeaderValue.TryParse(Request.Headers.Authorization, out var header) ||
            !header.Scheme.Equals("Bearer", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(header.Parameter))
            return AuthenticateResult.NoResult();

        try
        {
            var user = await services.GetRequiredService<SupabaseIdentity>()
                .VerifyAsync(header.Parameter, Context.RequestAborted);
            if (user is null || !Guid.TryParse(user.Id, out _) || user.EmailConfirmedAt is null)
                return AuthenticateResult.Fail("A verified account is required.");

            var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, user.Id) };
            var config = services.GetRequiredService<IOptions<SupabaseSettings>>().Value;
            if (config.AdminUserIds.Contains(user.Id, StringComparer.OrdinalIgnoreCase))
                claims.Add(new Claim(ClaimTypes.Role, "admin"));

            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name));
            return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
        }
        catch (Exception error) when (error is HttpRequestException or System.Text.Json.JsonException ||
            error is OperationCanceledException && !Context.RequestAborted.IsCancellationRequested)
        {
            Logger.LogWarning("Supabase verification unavailable ({ErrorType})", error.GetType().Name);
            return AuthenticateResult.Fail("Authentication is temporarily unavailable.");
        }
    }
}

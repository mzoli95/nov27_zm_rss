using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Auth;
using WorldEventAlerts.Feed;

var builder = WebApplication.CreateBuilder(args);
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true);
builder.Services.Configure<SupabaseSettings>(builder.Configuration.GetSection("Supabase"));
builder.Services.AddHttpClient<SupabaseIdentity>(client => client.Timeout = TimeSpan.FromSeconds(8));
builder.Services.AddAuthentication("Supabase")
    .AddScheme<AuthenticationSchemeOptions, SupabaseAuthentication>("Supabase", _ => { });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(nameof(AppRole.Admin), policy => policy.RequireRole(nameof(AppRole.Admin)));
builder.Services.AddDbContext<FeedDb>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("App")));

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

{
    await using var scope = app.Services.CreateAsyncScope();
    var database = scope.ServiceProvider.GetRequiredService<FeedDb>();
    await database.Database.MigrateAsync();
    if (app.Environment.IsDevelopment()) await DemoArticles.InitializeAsync(database);
}

app.MapGet("/api/config", (Microsoft.Extensions.Options.IOptions<SupabaseSettings> settings) =>
    Results.Ok(new
    {
        supabaseUrl = settings.Value.Url,
        supabasePublishableKey = settings.Value.BrowserKey
    })).AllowAnonymous();

var api = app.MapGroup("/api").RequireAuthorization();
api.MapGet("/feed", FeedEndpoints.Read);
api.MapGet("/admin/access", () => Results.NoContent()).RequireAuthorization(nameof(AppRole.Admin));
app.Run();

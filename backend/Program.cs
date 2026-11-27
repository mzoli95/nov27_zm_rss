using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Auth;
using WorldEventAlerts.Feed;
using WorldEventAlerts.News;
using WorldEventAlerts.Delivery;
using System.Text.Json.Serialization;
using Hangfire;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true);
builder.Services.Configure<SupabaseSettings>(builder.Configuration.GetSection("Supabase"));
builder.Services.Configure<NewsOptions>(builder.Configuration.GetSection("News"));
builder.Services.Configure<NotificationOptions>(builder.Configuration.GetSection("Notifications"));
IDataProtectionBuilder protection = builder.Services.AddDataProtection()
    .SetApplicationName("WorldEventAlerts")
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, ".keys")));
if (OperatingSystem.IsWindows()) protection.ProtectKeysWithDpapi();
builder.Services.AddScoped<ProviderSettings>();
builder.Services.AddScoped<MessageTemplateSettings>();
builder.Services.AddScoped<DeliveryTest>();
builder.Services.AddHangfire(configuration => configuration.UseInMemoryStorage());
builder.Services.AddHangfireServer(options => options.WorkerCount = 1);
builder.Services.AddScoped<NewsJobs>();
builder.Services.AddScoped<NewsSchedules>();
builder.Services.AddScoped<INotificationSender, EmailSender>();
builder.Services.AddHttpClient<SlackSender>(client => client.Timeout = TimeSpan.FromSeconds(8))
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false })
    .RemoveAllLoggers();
builder.Services.AddScoped<INotificationSender>(services => services.GetRequiredService<SlackSender>());
builder.Services.AddScoped<DeliveryEndpoints>();
builder.Services.AddScoped<DeliveryBatch>();
builder.Services.AddHostedService<DeliveryWorker>();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false)));
builder.Services.AddSingleton<ImportGate>();
builder.Services.AddScoped<SourcePolicy>();
builder.Services.AddHttpClient<NewsImporter>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(12);
    client.MaxResponseContentBufferSize = 2_000_000;
}).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
builder.Services.AddHttpClient<SupabaseIdentity>(client => client.Timeout = TimeSpan.FromSeconds(8));
builder.Services.AddHttpClient<RoleAdministration>(client => client.Timeout = TimeSpan.FromSeconds(8))
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
builder.Services.AddHttpClient<SupabaseDirectory>(client => client.Timeout = TimeSpan.FromSeconds(8))
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false })
    .RemoveAllLoggers();
builder.Services.AddAuthentication("Supabase")
    .AddScheme<AuthenticationSchemeOptions, SupabaseAuthentication>("Supabase", _ => { });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(nameof(AppRole.Admin), policy => policy.RequireRole(nameof(AppRole.Admin)));
builder.Services.AddDbContext<FeedDb>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("App")));

WebApplication app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

{
    await using AsyncServiceScope scope = app.Services.CreateAsyncScope();
    FeedDb database = scope.ServiceProvider.GetRequiredService<FeedDb>();
    await database.Database.MigrateAsync();
    await NewsDefaults.InitializeAsync(database);
    if (app.Environment.IsDevelopment()) await DemoArticles.InitializeAsync(database);
    NewsSchedules schedules = scope.ServiceProvider.GetRequiredService<NewsSchedules>();
    schedules.Apply(await schedules.ReadAsync(CancellationToken.None));
}

NewsOptions news = app.Services.GetRequiredService<IOptions<NewsOptions>>().Value;
IBackgroundJobClient jobs = app.Services.GetRequiredService<IBackgroundJobClient>();
if (news.Enabled)
    jobs.Enqueue<NewsJobs>(job => job.ImportAsync(CancellationToken.None));
jobs.Enqueue<NewsJobs>(job => job.ArchiveAsync(CancellationToken.None));

app.MapGet("/api/config", (Microsoft.Extensions.Options.IOptions<SupabaseSettings> settings) =>
    Results.Ok(new
    {
        supabaseUrl = settings.Value.Url,
        supabasePublishableKey = settings.Value.BrowserKey
    })).AllowAnonymous();

RouteGroupBuilder api = app.MapGroup("/api").RequireAuthorization();
RouteGroupBuilder schedule = api.MapGroup("/admin/schedules").RequireAuthorization(nameof(AppRole.Admin));
schedule.MapGet("", (NewsSchedules schedules, CancellationToken token) => schedules.ViewAsync(token));
schedule.MapPut("", (ScheduleIntervals intervals, NewsSchedules schedules, CancellationToken token) =>
    schedules.SaveAsync(intervals, token));
api.MapGet("/feed", FeedEndpoints.Read);
api.MapPut("/feed/{id:int}/like", FeedEndpoints.SetLike);
api.MapGet("/profile/preferences", PreferencesEndpoints.Read);
api.MapPut("/profile/preferences", PreferencesEndpoints.Write);
api.MapGet("/profile/channels", (DeliveryEndpoints delivery, System.Security.Claims.ClaimsPrincipal actor,
    CancellationToken token) => delivery.PreferencesAsync(actor, token));
api.MapPut("/profile/channels", (ChannelPreferencesInput input, DeliveryEndpoints delivery,
    System.Security.Claims.ClaimsPrincipal actor, CancellationToken token) => delivery.SaveAsync(input, actor, token));
RouteGroupBuilder channels = api.MapGroup("/admin/channels").RequireAuthorization(nameof(AppRole.Admin));
RouteGroupBuilder templates = api.MapGroup("/admin/message-template").RequireAuthorization(nameof(AppRole.Admin));
templates.MapGet("", (MessageTemplateSettings settings, CancellationToken token) => settings.ReadAsync(token));
templates.MapPut("", (MessageTemplate template, MessageTemplateSettings settings, CancellationToken token) =>
    settings.SaveAsync(template, token));
templates.MapDelete("", async (MessageTemplateSettings settings, CancellationToken token) =>
{
    await settings.ResetAsync(token);
    return Results.NoContent();
});
channels.MapGet("/", (DeliveryEndpoints delivery, CancellationToken token) => delivery.AdminAsync(token));
channels.MapPut("/{channel}", (string channel, ChannelSettingsInput input, DeliveryEndpoints delivery,
    CancellationToken token) => delivery.SetChannelAsync(channel, input, token));
channels.MapPost("/{channel}/test", DeliveryTest.SendAsync);
channels.MapGet("/{channel}/config", (string channel, ProviderSettings settings) =>
    ProviderSettings.Fields(channel).Length == 0 ? Results.NotFound() : Results.Ok(settings.SafeView(channel)));
channels.MapPut("/{channel}/config", (string channel, ProviderConfigInput input, ProviderSettings settings,
    CancellationToken token) => settings.SaveAsync(channel, input, token));
api.MapGet("/topics", () => NewsTopics.All);
api.MapGet("/notifications", NotificationsEndpoints.Read);
api.MapPost("/notifications/read", NotificationsEndpoints.MarkRead);
RouteGroupBuilder sources = api.MapGroup("/admin/sources").RequireAuthorization(nameof(AppRole.Admin));
sources.MapGet("/", SourceEndpoints.Read);
sources.MapPost("/", SourceEndpoints.Create);
sources.MapPut("/{id:int}", SourceEndpoints.Update);
sources.MapDelete("/{id:int}", SourceEndpoints.Delete);
sources.MapPut("/{id:int}/availability", SourceEndpoints.SetAvailability);
sources.MapPost("/test", (SourceUpdate input, NewsImporter importer, CancellationToken token) =>
    importer.TestAsync(input, token));
sources.MapPost("/{id:int}/run", async (int id, NewsImporter importer, CancellationToken token) =>
{
    ImportResult result = await importer.RunAsync(id, token);
    return result.Error is null ? Results.Ok(result) : Results.BadRequest(new { message = result.Error });
});
api.MapGet("/admin/access", (System.Security.Claims.ClaimsPrincipal actor) =>
    Results.Ok(new { isAdmin = actor.IsInRole(nameof(AppRole.Admin)) }));
api.MapGet("/admin/users", (int? page, string? search, SupabaseDirectory directory, CancellationToken token) =>
    directory.ListAsync(page, search, token)).RequireAuthorization(nameof(AppRole.Admin));
api.MapPut("/admin/users/{id:guid}/role",
    (Guid id, ChangeRoleRequest request, RoleAdministration roles,
        System.Security.Claims.ClaimsPrincipal actor, CancellationToken cancellationToken) =>
        roles.ChangeRoleAsync(id, request, actor, cancellationToken))
    .RequireAuthorization(nameof(AppRole.Admin));
app.Run();

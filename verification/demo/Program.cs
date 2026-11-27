using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using WorldEventAlerts.Auth;
using WorldEventAlerts.Delivery;
using WorldEventAlerts.Feed;
using WorldEventAlerts.News;

using SqliteConnection connection = new("Data Source=:memory:");
await connection.OpenAsync();
await using FeedDb db = new(new DbContextOptionsBuilder<FeedDb>().UseSqlite(connection).Options);
await db.Database.MigrateAsync();
Guid matched = Guid.NewGuid();
Guid unmatched = Guid.NewGuid();
NewsSource source = new() { Name = "Fixture", Url = "https://feeds.bbci.co.uk/example.xml" };
db.NewsSources.Add(source);
await db.SaveChangesAsync();
db.SourceTopics.Add(new(source.Id, NewsTopics.General, ""));
db.UserTopics.Add(new(matched, NewsTopics.General));
db.UserTopics.Add(new(unmatched, NewsTopics.Crypto));
db.UserLabels.Add(new(matched, "unrelated"));
db.ChannelPreferences.Add(new(matched, DeliveryChannels.Slack, true));
await db.SaveChangesAsync();

bool includeMatch = false;
using HttpClient rss = new(new FixtureHandler(() => new(HttpStatusCode.OK)
{
    Content = new StringContent("<rss><channel>" + Item("baseline") +
        (includeMatch ? Item("new") : "") + "</channel></rss>", Encoding.UTF8, "application/rss+xml")
}));
RecordingSender email = new(DeliveryChannels.Email);
RecordingSender slack = new(DeliveryChannels.Slack);
INotificationSender[] senders = [email, slack];
NewsImporter importer = new(db, rss, new SourcePolicy(Options.Create(new NewsOptions())), new ImportGate(), senders);
Ensure(await importer.RunAsync(source.Id, default) == new ImportResult(1, null), "initial RSS import");
Ensure(await db.ArticleAlerts.CountAsync() == 0, "silent first import");
includeMatch = true;
Ensure(await importer.RunAsync(source.Id, default) == new ImportResult(1, null), "new RSS item");
Ensure(await importer.RunAsync(source.Id, default) == new ImportResult(0, null), "duplicate replay");
Ensure(await db.ArticleAlerts.CountAsync() == 1 &&
    await db.ArticleAlerts.AnyAsync(alert => alert.UserId == matched && !alert.Read), "one matching unread alert");
Ensure(await db.DeliveryAttempts.CountAsync() == 2, "one attempt per enabled channel");

await db.DeliveryAttempts.ExecuteUpdateAsync(update =>
    update.SetProperty(item => item.UpdatedAt, DateTime.UtcNow.AddHours(-1)));
db.ChangeTracker.Clear();
using HttpClient auth = new(new FixtureHandler(() => new(HttpStatusCode.OK)
{
    Content = JsonContent.Create(new { id = matched, email = "review@example.invalid", email_confirmed_at = "2026-11-27" })
}));
SupabaseDirectory directory = new(auth, Options.Create(new SupabaseSettings {
    Url = "https://supabase.example.invalid", SecretKey = "sb_secret_fixture_only"
}));
DeliveryBatch batch = new(db, directory, senders, NullLogger<DeliveryBatch>.Instance,
    new MessageTemplateSettings(db, new EphemeralDataProtectionProvider()));
await batch.RunAsync(default);
await batch.RunAsync(default);
Ensure(email.Messages.Count == 1 && slack.Messages.Count == 1, "one message per channel across worker replays");
Ensure(email.Messages.Concat(slack.Messages).All(message =>
    message.Email == "review@example.invalid" && message.Articles.Count == 1 &&
    message.Articles[0].Url == "https://www.bbc.com/news/articles/new"), "correct recipient and link");
Ensure(await db.DeliveryAttempts.CountAsync(item => item.Status == DeliveryStatus.Accepted) == 2,
    "both attempts accepted by fixture senders");

static string Item(string id) =>
    $"<item><title>Fixture {id}</title><link>https://www.bbc.com/news/articles/{id}</link>" +
    $"<pubDate>{DateTime.UtcNow:R}</pubDate></item>";

static void Ensure(bool passed, string check)
{
    if (!passed) throw new InvalidOperationException("Failed: " + check);
    Console.WriteLine("PASS " + check);
}

sealed class FixtureHandler(Func<HttpResponseMessage> response) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) =>
        Task.FromResult(response());
}

sealed class RecordingSender(string channel) : INotificationSender
{
    public string Channel => channel;
    public bool Configured => true;
    public bool EnabledByDefault => true;
    public List<DeliveryMessage> Messages { get; } = [];

    public Task<DeliveryStatus> SendAsync(DeliveryMessage message, CancellationToken token)
    {
        Messages.Add(message);
        return Task.FromResult(DeliveryStatus.Accepted);
    }
}

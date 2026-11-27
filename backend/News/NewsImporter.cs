using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.News;

public sealed class ImportGate
{
    public SemaphoreSlim Lock { get; } = new(1, 1);
}

public sealed record ImportResult(int Added, string? Error);

public sealed class NewsImporter(FeedDb db, HttpClient http, SourcePolicy policy, ImportGate gate)
{
    public async Task<ImportResult> RunAsync(int id, CancellationToken token)
    {
        if (!await gate.Lock.WaitAsync(0, token)) return new ImportResult(0, "An import is already running.");
        try
        {
            NewsSource? source = await db.NewsSources.FindAsync([id], token);
            if (source is null) return new ImportResult(0, "Source not found.");

            try
            {
                int added = await ImportAsync(source, token);
                source.LastSuccess = DateTime.UtcNow;
                source.Status = $"Imported {added} new items.";
                await db.SaveChangesAsync(token);
                return new ImportResult(added, null);
            }
            catch (Exception error) when ((error is HttpRequestException or IOException or
                System.Xml.XmlException or System.Text.Json.JsonException or InvalidOperationException or
                KeyNotFoundException or ArgumentOutOfRangeException or DbUpdateException ||
                error is OperationCanceledException) && !token.IsCancellationRequested)
            {
                db.ChangeTracker.Clear();
                source = await db.NewsSources.FindAsync([id], token);
                if (source is not null)
                {
                    source.Status = "Import failed. Check the source URL and response format.";
                    await db.SaveChangesAsync(token);
                }
                return new ImportResult(0, "The source could not be imported.");
            }
        }
        finally { gate.Lock.Release(); }
    }

    private async Task<int> ImportAsync(NewsSource source, CancellationToken token)
    {
        if (!policy.IsAllowed(source.Url, source.Kind)) throw new InvalidOperationException();
        List<SourceTopic> mappings = await db.SourceTopics.Where(link => link.SourceId == source.Id).ToListAsync(token);
        if (mappings.Count == 0) return 0;
        using HttpResponseMessage response = await http.GetAsync(source.Url, token);
        response.EnsureSuccessStatusCode();
        await using Stream body = await response.Content.ReadAsStreamAsync(token);
        IReadOnlyList<NewsItem> items = await NewsReader.ReadAsync(body, source.Kind, token);
        if (items.Count == 0) return 0;

        int added = 0;
        await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction =
            await db.Database.BeginTransactionAsync(token);
        foreach (NewsItem item in items)
        {
            bool inserted = false;
            string[] topics = mappings.Where(mapping => Matches(mapping, item))
                .Select(mapping => mapping.Topic).ToArray();
            if (topics.Length == 0) continue;

            string canonical = CanonicalUrl(item.Url);
            ImportedArticle? known = await db.ImportedArticles.FindAsync([canonical], token);
            if (known is null)
            {
                string headline = System.Text.RegularExpressions.Regex.Replace(item.Title, @"\s+", " ").ToLowerInvariant();
                string day = item.PublishedAt.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
                int? existing = await db.ImportedArticles.Where(row => row.HeadlineKey == headline && row.Day == day)
                    .Select(row => (int?)row.ArticleId).FirstOrDefaultAsync(token);
                if (existing is null)
                {
                    Article entry = new(0, item.Title, item.Description, topics[0], source.Name,
                        item.ImageUrl, item.Url, item.PublishedAt);
                    db.Articles.Add(entry);
                    await db.SaveChangesAsync(token);
                    existing = entry.Id;
                    added++;
                    inserted = true;
                }
                known = new ImportedArticle(canonical, existing.Value, headline, day);
                db.ImportedArticles.Add(known);
                await db.SaveChangesAsync(token);
            }

            bool changedTopics = false;
            foreach (string topic in topics)
                changedTopics |= await db.Database.ExecuteSqlAsync($"""
                    INSERT INTO ArticleTopics (ArticleId, Topic) VALUES ({known.ArticleId}, {topic})
                    ON CONFLICT (ArticleId, Topic) DO NOTHING
                    """, token) > 0;
            if (!inserted && item.ImageUrl is not null)
                await db.Articles.Where(row => row.Id == known.ArticleId && row.ImageUrl == null)
                    .ExecuteUpdateAsync(update => update.SetProperty(row => row.ImageUrl, item.ImageUrl), token);
            if (changedTopics && source.LastSuccess is not null)
                await CreateAlertsAsync(known.ArticleId, token);
        }
        await transaction.CommitAsync(token);
        return added;
    }

    private Task<int> CreateAlertsAsync(int articleId, CancellationToken token) => db.Database.ExecuteSqlAsync($"""
        INSERT INTO ArticleAlerts (UserId, ArticleId, CreatedAt, Read)
        SELECT audience.UserId, a.Id, {DateTime.UtcNow}, 0
        FROM Articles a
        CROSS JOIN (SELECT UserId FROM UserTopics UNION SELECT UserId FROM UserLabels) audience
        WHERE a.Id = {articleId}
          AND (EXISTS (SELECT 1 FROM UserTopics ut JOIN ArticleTopics t ON t.Topic = ut.Topic
              WHERE ut.UserId = audience.UserId AND t.ArticleId = a.Id)
            OR NOT EXISTS (SELECT 1 FROM UserTopics ut WHERE ut.UserId = audience.UserId))
          AND (NOT EXISTS (SELECT 1 FROM UserLabels label WHERE label.UserId = audience.UserId)
            OR EXISTS (SELECT 1 FROM UserLabels label WHERE label.UserId = audience.UserId
                AND (instr(lower(a.Title), label.Label) > 0 OR instr(lower(a.Description), label.Label) > 0)))
        ON CONFLICT (UserId, ArticleId) DO NOTHING
        """, token);

    private static bool Matches(SourceTopic mapping, NewsItem item) =>
        string.IsNullOrWhiteSpace(mapping.Keywords) ||
        mapping.Keywords.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Any(keyword => item.Title.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                item.Description.Contains(keyword, StringComparison.OrdinalIgnoreCase));

    public static string CanonicalUrl(string url)
    {
        UriBuilder builder = new(url) { Fragment = "", Scheme = "https", Port = -1 };
        builder.Path = builder.Path.TrimEnd('/');
        builder.Query = string.Join('&', builder.Query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Where(part => !part.StartsWith("utm_", StringComparison.OrdinalIgnoreCase) &&
                !part.StartsWith("fbclid=", StringComparison.OrdinalIgnoreCase) &&
                !part.StartsWith("gclid=", StringComparison.OrdinalIgnoreCase))
            .Order(StringComparer.Ordinal));
        return builder.Uri.AbsoluteUri;
    }
}

public sealed class NewsWorker(IServiceScopeFactory scopes, IOptions<NewsOptions> settings,
    ILogger<NewsWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!settings.Value.Enabled) return;
        using PeriodicTimer timer = new(TimeSpan.FromMinutes(Math.Clamp(settings.Value.PollingIntervalMinutes, 5, 1440)));
        do
        {
            await using AsyncServiceScope scope = scopes.CreateAsyncScope();
            FeedDb db = scope.ServiceProvider.GetRequiredService<FeedDb>();
            int[] sources = await db.NewsSources.Select(source => source.Id).ToArrayAsync(stoppingToken);
            NewsImporter importer = scope.ServiceProvider.GetRequiredService<NewsImporter>();
            foreach (int id in sources)
            {
                ImportResult result = await importer.RunAsync(id, stoppingToken);
                if (result.Error is not null) logger.LogWarning("Import failed for source {SourceId}", id);
                db.ChangeTracker.Clear();
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}

using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.News;

public sealed class NewsJobs(FeedDb db, NewsImporter importer, ILogger<NewsJobs> logger)
{
    public async Task ImportAsync(CancellationToken token)
    {
        int[] ids = await db.NewsSources.Where(source => source.Enabled)
            .OrderBy(source => source.Id).Select(source => source.Id).ToArrayAsync(token);
        foreach (int id in ids)
        {
            ImportResult result = await importer.RunAsync(id, token);
            if (result.Error is not null)
                logger.LogWarning("Scheduled import for source {SourceId}: {Outcome}", id, result.Error);
            db.ChangeTracker.Clear();
        }
    }

    public async Task ArchiveAsync(CancellationToken token)
    {
        DateTime cutoff = DateTime.UtcNow.AddDays(-7);
        int affected = await db.Articles.Where(article => !article.Archived && article.PublishedAt < cutoff)
            .ExecuteUpdateAsync(update => update
                .SetProperty(article => article.Archived, true)
                .SetProperty(article => article.Description, "")
                .SetProperty(article => article.ImageUrl, (string?)null), token);
        if (affected == 0) return;
        logger.LogInformation("Archived {Count} articles older than seven days", affected);
        await db.Database.ExecuteSqlRawAsync("VACUUM", token);
    }
}

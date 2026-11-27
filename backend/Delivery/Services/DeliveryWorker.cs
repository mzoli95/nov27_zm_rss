using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Auth;
using WorldEventAlerts.Feed;
using WorldEventAlerts.News;

namespace WorldEventAlerts.Delivery;

public sealed class DeliveryWorker(IServiceScopeFactory scopes, ILogger<DeliveryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken token)
    {
        await using (AsyncServiceScope scope = scopes.CreateAsyncScope())
        {
            FeedDb db = scope.ServiceProvider.GetRequiredService<FeedDb>();
            await db.DeliveryAttempts.Where(item => item.Status == DeliveryStatus.Sending)
                .ExecuteUpdateAsync(update => update.SetProperty(item => item.Status, DeliveryStatus.Ambiguous)
                    .SetProperty(item => item.UpdatedAt, DateTime.UtcNow), token);
        }

        using PeriodicTimer timer = new(TimeSpan.FromSeconds(10));
        do
        {
            await using AsyncServiceScope scope = scopes.CreateAsyncScope();
            DeliveryBatch batch = scope.ServiceProvider.GetRequiredService<DeliveryBatch>();
            try { await batch.RunAsync(token); }
            catch (Exception error) when (!token.IsCancellationRequested)
            {
                logger.LogError("Delivery batch failed ({ErrorType})", error.GetType().Name);
            }
        }
        while (await timer.WaitForNextTickAsync(token));
    }
}

public sealed class DeliveryBatch(FeedDb db, SupabaseDirectory directory, IEnumerable<INotificationSender> senders,
    ILogger<DeliveryBatch> logger,
    MessageTemplateSettings templates)
{
    private static readonly TimeSpan DigestWindow = TimeSpan.FromMinutes(30);
    private const int MaxArticlesPerMessage = 40;
    private const int EmailLimit = 5;

    private sealed record DigestCandidate(DeliveryAttempt Attempt, DeliveryArticle Article);

    public async Task RunAsync(CancellationToken token)
    {
        DateTime cutoff = WindowStart(DateTime.UtcNow);
        MessageTemplate? template = null;
        for (int index = 0; index < 10; index++)
        {
            DeliveryAttempt? oldest = await db.DeliveryAttempts.AsNoTracking()
                .Where(item => item.Status == DeliveryStatus.Pending && item.UpdatedAt < cutoff)
                .OrderBy(item => item.UpdatedAt).ThenBy(item => item.ArticleId).FirstOrDefaultAsync(token);
            if (oldest is null) return;

            DateTime from = WindowStart(oldest.UpdatedAt);
            DateTime until = from + DigestWindow;
            IQueryable<DeliveryAttempt> pending = db.DeliveryAttempts.Where(item =>
                    item.UserId == oldest.UserId && item.Channel == oldest.Channel &&
                    item.Status == DeliveryStatus.Pending && item.UpdatedAt >= from && item.UpdatedAt < until);
            bool email = oldest.Channel == DeliveryChannels.Email;
            IQueryable<Article> active = db.Articles.Where(article =>
                !article.Archived && pending.Any(attempt => attempt.ArticleId == article.Id));
            DigestCandidate[] candidates = await pending.Join(active, attempt => attempt.ArticleId, article => article.Id,
                    (attempt, article) => new { Attempt = attempt, Article = article })
                .OrderByDescending(row => row.Article.PublishedAt).ThenByDescending(row => row.Article.Id)
                .Take(MaxArticlesPerMessage)
                .Select(row => new DigestCandidate(row.Attempt, new DeliveryArticle(row.Article.Title, row.Article.Url)))
                .ToArrayAsync(token);
            if (candidates.Length == 0)
            {
                await SetPendingStatusAsync(pending, DeliveryStatus.Skipped, token);
                continue;
            }

            DigestCandidate[] selected = email
                ? candidates.DistinctBy(item => NewsImporter.CanonicalUrl(item.Article.Url)).Take(EmailLimit).ToArray()
                : candidates;
            int? total = email ? await active.CountAsync(token) : null;
            DeliveryLabel[] labels = email ? await GetTopLabelsAsync(oldest.UserId, active, token) : [];
            DeliveryAttempt[] group = selected.Select(item => item.Attempt).ToArray();
            await ClaimAsync(pending, group, email, token);
            DeliveryStatus status;
            try
            {
                DeliveryArticle[] articles = selected.Select(item => item.Article).ToArray();
                template ??= await templates.ReadAsync(token);
                status = await SendAsync(oldest, new DeliveryMessage("", articles, labels, total, template), token);
            }
            catch (Exception error) when (!token.IsCancellationRequested)
            {
                status = DeliveryStatus.Ambiguous;
                logger.LogWarning("Delivery adapter failed ({ErrorType})", error.GetType().Name);
            }
            SetStatus(group, status);
            await db.SaveChangesAsync(token);
            logger.LogInformation("Digest delivery for {Count} articles, channel {Channel}: {Status}",
                group.Length, oldest.Channel, status);
            db.ChangeTracker.Clear();
        }
    }

    private async Task ClaimAsync(IQueryable<DeliveryAttempt> pending, DeliveryAttempt[] group,
        bool email, CancellationToken token)
    {
        await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction =
            await db.Database.BeginTransactionAsync(token);
        if (email)
        {
            int[] ids = group.Select(item => item.ArticleId).ToArray();
            await SetPendingStatusAsync(pending.Where(item => !ids.Contains(item.ArticleId)), DeliveryStatus.Omitted, token);
        }
        SetStatus(group, DeliveryStatus.Sending);
        await db.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
    }

    private Task<DeliveryLabel[]> GetTopLabelsAsync(Guid userId, IQueryable<Article> articles, CancellationToken token) =>
        db.UserLabels.Where(item => item.UserId == userId)
            .Select(label => new
            {
                label.Label,
                Matches = articles.Count(article =>
                    article.Title.ToLower().Contains(label.Label) || article.Description.ToLower().Contains(label.Label))
            })
            .Where(label => label.Matches > 0)
            .OrderByDescending(label => label.Matches).ThenBy(label => label.Label)
            .Take(EmailLimit).Select(label => new DeliveryLabel(label.Label, label.Matches)).ToArrayAsync(token);

    private static Task<int> SetPendingStatusAsync(IQueryable<DeliveryAttempt> pending, DeliveryStatus status,
        CancellationToken token) => pending.ExecuteUpdateAsync(update => update
            .SetProperty(item => item.Status, status).SetProperty(item => item.UpdatedAt, DateTime.UtcNow), token);

    private async Task<DeliveryStatus> SendAsync(DeliveryAttempt attempt, DeliveryMessage digest, CancellationToken token)
    {
        INotificationSender? sender = senders.FirstOrDefault(item => item.Channel == attempt.Channel);
        if (sender is null || !sender.Configured || !directory.IsConfigured) return DeliveryStatus.Skipped;

        ChannelState? state = await db.ChannelStates.AsNoTracking().SingleOrDefaultAsync(
            row => row.Channel == attempt.Channel, token);
        if (!(state?.Enabled ?? sender.EnabledByDefault)) return DeliveryStatus.Skipped;
        ChannelPreference? preference = await db.ChannelPreferences.AsNoTracking().SingleOrDefaultAsync(
            row => row.UserId == attempt.UserId && row.Channel == attempt.Channel, token);
        if (!(preference?.Enabled ?? attempt.Channel == DeliveryChannels.Email)) return DeliveryStatus.Skipped;

        DirectoryUser? recipient;
        try { recipient = await directory.FindAsync(attempt.UserId, token); }
        catch (Exception error) when (SupabaseDirectory.IsFailure(error, token)) { return DeliveryStatus.Failed; }
        if (recipient?.EmailConfirmedAt is null || string.IsNullOrWhiteSpace(recipient.Email))
            return DeliveryStatus.Skipped;
        if (await new AccountArchive(db).ContainsAsync(attempt.UserId, token))
            return DeliveryStatus.Skipped;
        return await sender.SendAsync(digest with { Email = recipient.Email }, token);
    }

    private static DateTime WindowStart(DateTime date) =>
        new(date.Ticks - date.Ticks % DigestWindow.Ticks, DateTimeKind.Utc);

    private static void SetStatus(IEnumerable<DeliveryAttempt> group, DeliveryStatus status)
    {
        DateTime now = DateTime.UtcNow;
        foreach (DeliveryAttempt attempt in group)
        {
            attempt.Status = status;
            attempt.UpdatedAt = now;
        }
    }
}

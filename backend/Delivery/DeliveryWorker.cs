using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Auth;
using WorldEventAlerts.Feed;

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
    ILogger<DeliveryBatch> logger)
{
    private static readonly TimeSpan DigestWindow = TimeSpan.FromMinutes(30);
    private const int MaxArticlesPerMessage = 40;

    public async Task RunAsync(CancellationToken token)
    {
        DateTime cutoff = WindowStart(DateTime.UtcNow);
        for (int index = 0; index < 10; index++)
        {
            DeliveryAttempt? oldest = await db.DeliveryAttempts.AsNoTracking()
                .Where(item => item.Status == DeliveryStatus.Pending && item.UpdatedAt < cutoff)
                .OrderBy(item => item.UpdatedAt).ThenBy(item => item.ArticleId).FirstOrDefaultAsync(token);
            if (oldest is null) return;

            DateTime from = WindowStart(oldest.UpdatedAt);
            DateTime until = from + DigestWindow;
            DeliveryAttempt[] group = await db.DeliveryAttempts.Where(item =>
                    item.UserId == oldest.UserId && item.Channel == oldest.Channel &&
                    item.Status == DeliveryStatus.Pending && item.UpdatedAt >= from && item.UpdatedAt < until)
                .OrderBy(item => item.UpdatedAt).ThenBy(item => item.ArticleId)
                .Take(MaxArticlesPerMessage).ToArrayAsync(token);
            if (group.Length == 0) continue;

            SetStatus(group, DeliveryStatus.Sending);
            await db.SaveChangesAsync(token);
            DeliveryStatus status;
            try { status = await SendAsync(group, token); }
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

    private async Task<DeliveryStatus> SendAsync(DeliveryAttempt[] group, CancellationToken token)
    {
        DeliveryAttempt attempt = group[0];
        INotificationSender? sender = senders.FirstOrDefault(item => item.Channel == attempt.Channel);
        if (sender is null || !sender.Configured || !directory.IsConfigured) return DeliveryStatus.Skipped;

        ChannelState? state = await db.ChannelStates.AsNoTracking().SingleOrDefaultAsync(
            row => row.Channel == attempt.Channel, token);
        if (!(state?.Enabled ?? sender.EnabledByDefault)) return DeliveryStatus.Skipped;
        ChannelPreference? preference = await db.ChannelPreferences.AsNoTracking().SingleOrDefaultAsync(
            row => row.UserId == attempt.UserId && row.Channel == attempt.Channel, token);
        if (!(preference?.Enabled ?? attempt.Channel == DeliveryChannels.Email)) return DeliveryStatus.Skipped;

        int[] ids = group.Select(item => item.ArticleId).ToArray();
        DeliveryArticle[] articles = await db.Articles.Where(item => ids.Contains(item.Id) && !item.Archived)
            .OrderByDescending(item => item.PublishedAt).ThenByDescending(item => item.Id)
            .Select(item => new DeliveryArticle(item.Title, item.Url)).ToArrayAsync(token);
        if (articles.Length == 0) return DeliveryStatus.Skipped;
        DirectoryUser? recipient;
        try { recipient = await directory.FindAsync(attempt.UserId, token); }
        catch (Exception error) when (SupabaseDirectory.IsFailure(error, token)) { return DeliveryStatus.Failed; }
        if (recipient?.EmailConfirmedAt is null || string.IsNullOrWhiteSpace(recipient.Email))
            return DeliveryStatus.Skipped;
        return await sender.SendAsync(new DeliveryMessage(recipient.Email, articles), token);
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

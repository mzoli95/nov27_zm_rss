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
    public async Task RunAsync(CancellationToken token)
    {
        DeliveryAttempt[] pending = await db.DeliveryAttempts.Where(item => item.Status == DeliveryStatus.Pending)
            .OrderBy(item => item.UpdatedAt).ThenBy(item => item.ArticleId).Take(10).ToArrayAsync(token);
        foreach (DeliveryAttempt attempt in pending)
        {
            attempt.Status = DeliveryStatus.Sending;
            attempt.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(token);
            try { attempt.Status = await SendAsync(attempt, token); }
            catch (Exception error) when (!token.IsCancellationRequested)
            {
                attempt.Status = DeliveryStatus.Ambiguous;
                logger.LogWarning("Delivery adapter failed ({ErrorType})", error.GetType().Name);
            }
            attempt.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(token);
            logger.LogInformation("Delivery for article {ArticleId}, channel {Channel}: {Status}",
                attempt.ArticleId, attempt.Channel, attempt.Status);
        }
    }

    private async Task<DeliveryStatus> SendAsync(DeliveryAttempt attempt, CancellationToken token)
    {
        INotificationSender? sender = senders.FirstOrDefault(item => item.Channel == attempt.Channel);
        if (sender is null || !sender.Configured || !directory.IsConfigured) return DeliveryStatus.Skipped;

        ChannelState? state = await db.ChannelStates.AsNoTracking().SingleOrDefaultAsync(
            row => row.Channel == attempt.Channel, token);
        if (!(state?.Enabled ?? sender.EnabledByDefault)) return DeliveryStatus.Skipped;
        ChannelPreference? preference = await db.ChannelPreferences.AsNoTracking().SingleOrDefaultAsync(
            row => row.UserId == attempt.UserId && row.Channel == attempt.Channel, token);
        if (!(preference?.Enabled ?? attempt.Channel == DeliveryChannels.Email)) return DeliveryStatus.Skipped;

        Article? article = await db.Articles.FindAsync([attempt.ArticleId], token);
        DirectoryUser? recipient;
        try { recipient = await directory.FindAsync(attempt.UserId, token); }
        catch (Exception error) when (SupabaseDirectory.IsFailure(error, token)) { return DeliveryStatus.Failed; }
        if (article is null || recipient?.EmailConfirmedAt is null || string.IsNullOrWhiteSpace(recipient.Email))
            return DeliveryStatus.Skipped;
        return await sender.SendAsync(new DeliveryMessage(recipient.Email, article.Title, article.Url), token);
    }
}

using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Delivery;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.Auth;

public sealed class AccountArchive(FeedDb db)
{
    public Task<bool> ContainsAsync(Guid userId, CancellationToken token) =>
        db.Database.SqlQuery<int>($"SELECT 1 AS Value FROM ArchivedAccounts WHERE UserId = {userId}").AnyAsync(token);

    public async Task ArchiveAsync(Guid userId, CancellationToken token)
    {
        await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction =
            await db.Database.BeginTransactionAsync(token);
        DateTime now = DateTime.UtcNow;
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO ArchivedAccounts (UserId, ArchivedAt) VALUES ({userId}, {now})
            ON CONFLICT (UserId) DO NOTHING
            """, token);
        await db.DeliveryAttempts.Where(item => item.UserId == userId && item.Status == DeliveryStatus.Pending)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.Status, DeliveryStatus.Skipped)
                .SetProperty(item => item.UpdatedAt, now), token);
        await transaction.CommitAsync(token);
    }
}

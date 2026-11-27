using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Feed;
using WorldEventAlerts.Auth;

namespace WorldEventAlerts.Delivery;

public sealed class DeliveryEndpoints(FeedDb db, IEnumerable<INotificationSender> senders, SupabaseDirectory directory)
{
    public async Task<IResult> PreferencesAsync(ClaimsPrincipal actor, CancellationToken token)
    {
        Guid userId = Guid.Parse(actor.FindFirstValue(ClaimTypes.NameIdentifier)!);
        Dictionary<string, bool> choices = await db.ChannelPreferences.Where(row => row.UserId == userId)
            .ToDictionaryAsync(row => row.Channel, row => row.Enabled, token);
        Dictionary<string, bool> states = await StatesAsync(token);
        return Results.Ok(senders.Select(sender => new
        {
            channel = sender.Channel,
            selected = choices.GetValueOrDefault(sender.Channel, sender.Channel == DeliveryChannels.Email),
            available = sender.Configured && directory.IsConfigured && states.GetValueOrDefault(sender.Channel, sender.EnabledByDefault)
        }));
    }

    public async Task<IResult> SaveAsync(ChannelPreferencesInput input, ClaimsPrincipal actor, CancellationToken token)
    {
        string[] known = senders.Select(sender => sender.Channel).ToArray();
        if (input.EnabledChannels is null || input.EnabledChannels.Length > known.Length ||
            input.EnabledChannels.Any(channel => !known.Contains(channel)))
            return Results.BadRequest(new { message = "Choose supported notification channels." });

        Guid userId = Guid.Parse(actor.FindFirstValue(ClaimTypes.NameIdentifier)!);
        Dictionary<string, bool> states = await StatesAsync(token);
        await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction =
            await db.Database.BeginTransactionAsync(token);
        foreach (INotificationSender sender in senders)
        {
            if (!sender.Configured || !directory.IsConfigured || !states.GetValueOrDefault(sender.Channel, sender.EnabledByDefault)) continue;
            bool enabled = input.EnabledChannels.Contains(sender.Channel);
            await db.Database.ExecuteSqlAsync($"""
                INSERT INTO ChannelPreferences (UserId, Channel, Enabled) VALUES ({userId}, {sender.Channel}, {enabled})
                ON CONFLICT (UserId, Channel) DO UPDATE SET Enabled = excluded.Enabled
                """, token);
        }
        await transaction.CommitAsync(token);
        return Results.NoContent();
    }

    public async Task<IResult> AdminAsync(CancellationToken token)
    {
        Dictionary<string, bool> states = await StatesAsync(token);
        return Results.Ok(new
        {
            channels = senders.Select(sender => new
            {
                sender.Channel, configured = sender.Configured && directory.IsConfigured,
                enabled = states.GetValueOrDefault(sender.Channel, sender.EnabledByDefault)
            }),
            recent = await db.DeliveryAttempts.OrderByDescending(item => item.UpdatedAt)
                .ThenBy(item => item.ArticleId).Take(30)
                .Select(item => new { item.ArticleId, item.Channel, item.Status, item.UpdatedAt }).ToArrayAsync(token)
        });
    }

    public async Task<IResult> SetChannelAsync(string channel, ChannelSettingsInput input, CancellationToken token)
    {
        INotificationSender? sender = senders.FirstOrDefault(item => item.Channel == channel);
        if (sender is null) return Results.NotFound();
        if (input.Enabled && (!sender.Configured || !directory.IsConfigured))
            return Results.BadRequest(new { message = "Configure the provider on the backend first." });
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO ChannelStates (Channel, Enabled) VALUES ({channel}, {input.Enabled})
            ON CONFLICT (Channel) DO UPDATE SET Enabled = excluded.Enabled
            """, token);
        return Results.NoContent();
    }

    private Task<Dictionary<string, bool>> StatesAsync(CancellationToken token) =>
        db.ChannelStates.ToDictionaryAsync(row => row.Channel, row => row.Enabled, token);
}

using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.News;

public static class PreferencesEndpoints
{
    public static async Task<IResult> Read(FeedDb db, ClaimsPrincipal actor, CancellationToken token)
    {
        Guid userId = Guid.Parse(actor.FindFirstValue(ClaimTypes.NameIdentifier)!);
        string[] topics = await db.UserTopics.Where(row => row.UserId == userId)
            .OrderBy(row => row.Topic).Select(row => row.Topic).ToArrayAsync(token);
        string[] labels = await db.UserLabels.Where(row => row.UserId == userId)
            .OrderBy(row => row.Label).Select(row => row.Label).ToArrayAsync(token);
        return Results.Ok(new { topics, labels, availableTopics = NewsTopics.All });
    }

    public static async Task<IResult> Write(Preferences input, FeedDb db, ClaimsPrincipal actor, CancellationToken token)
    {
        if (input.Topics is null || input.Labels is null ||
            input.Topics.Length > NewsTopics.All.Count || input.Labels.Length > 20 ||
            input.Topics.Any(topic => !NewsTopics.All.Contains(topic)) ||
            input.Labels.Any(label => string.IsNullOrWhiteSpace(label) || label.Trim().Length > 60))
            return Results.BadRequest(new { message = "Choose valid topics and up to 20 labels of 60 characters each." });

        Guid userId = Guid.Parse(actor.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction =
            await db.Database.BeginTransactionAsync(token);
        await db.UserTopics.Where(row => row.UserId == userId).ExecuteDeleteAsync(token);
        await db.UserLabels.Where(row => row.UserId == userId).ExecuteDeleteAsync(token);
        db.UserTopics.AddRange(input.Topics.Distinct().Select(item => new UserTopic(userId, item)));
        db.UserLabels.AddRange(input.Labels.Select(item => item.Trim().ToLowerInvariant()).Distinct()
            .Select(item => new UserLabel(userId, item)));
        await db.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return Results.NoContent();
    }
}

using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.News;

public static class SourceEndpoints
{
    public static async Task<IResult> Read(FeedDb db, CancellationToken token)
    {
        return Results.Ok(await db.NewsSources.OrderBy(source => source.Name).Select(source => new
        {
            source.Id, source.Name, source.Url, kind = source.Kind.ToString(), source.LastSuccess, source.Status,
            topics = db.SourceTopics.Where(link => link.SourceId == source.Id).OrderBy(link => link.Topic)
                .Select(link => new { link.Topic, link.Keywords }).ToArray()
        }).ToListAsync(token));
    }

    public static async Task<IResult> Add(SourceInput input, FeedDb db, SourcePolicy policy, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Trim().Length > 100 ||
            !NewsTopics.All.Contains(input.Topic) || !policy.IsAllowed(input.Url, input.Kind) ||
            input.Keywords?.Length > 300)
            return Results.BadRequest(new { message = "Enter an approved HTTPS source, a valid topic and optional keywords." });

        string url = new Uri(input.Url).AbsoluteUri;
        string keywords = input.Keywords?.Trim() ?? "";
        await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction =
            await db.Database.BeginTransactionAsync(token);
        NewsSource? source = await db.NewsSources.SingleOrDefaultAsync(row => row.Url == url, token);
        if (source is null)
        {
            source = new NewsSource { Name = input.Name.Trim(), Url = url, Kind = input.Kind };
            db.NewsSources.Add(source);
            await db.SaveChangesAsync(token);
        }
        else if (source.Kind != input.Kind)
            return Results.Conflict(new { message = "This URL is registered with a different source type." });

        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO SourceTopics (SourceId, Topic, Keywords) VALUES ({source.Id}, {input.Topic}, {keywords})
            ON CONFLICT (SourceId, Topic) DO UPDATE SET Keywords = excluded.Keywords
            """, token);
        await transaction.CommitAsync(token);
        return Results.NoContent();
    }
}

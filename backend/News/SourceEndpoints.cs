using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.News;

public static class SourceEndpoints
{
    public static async Task<IResult> Read(int? page, FeedDb db, CancellationToken token)
    {
        int current = Math.Clamp(page ?? 1, 1, 100_000);
        const int pageSize = 10;
        int total = await db.NewsSources.CountAsync(token);
        return Results.Ok(new { total, page = current, pageSize, items = await db.NewsSources
            .OrderBy(source => source.Name).ThenBy(source => source.Id).Skip((current - 1) * pageSize)
            .Take(pageSize).Select(source => new
        {
            source.Id, source.Name, source.Url, kind = source.Kind.ToString(), source.LastSuccess, source.Status,
            topics = db.SourceTopics.Where(link => link.SourceId == source.Id).OrderBy(link => link.Topic)
                .Select(link => new { link.Topic, link.Keywords }).ToArray()
        }).ToListAsync(token) });
    }

    public static async Task<IResult> Update(int id, SourceUpdate input, FeedDb db, SourcePolicy policy, CancellationToken token)
    {
        if (!Valid(input, policy)) return Results.BadRequest(new { message = "Enter a valid source and at least one topic." });
        await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction =
            await db.Database.BeginTransactionAsync(token);
        NewsSource? source = await db.NewsSources.FindAsync([id], token);
        if (source is null) return Results.NotFound();
        string url = new Uri(input.Url).AbsoluteUri;
        if (await db.NewsSources.AnyAsync(item => item.Id != id && item.Url == url, token))
            return Results.Conflict(new { message = "This source URL already exists." });
        if (source.Url != url || source.Kind != input.Kind)
        {
            source.LastSuccess = null;
            source.Status = null;
        }
        source.Name = input.Name.Trim();
        source.Url = url;
        source.Kind = input.Kind;
        await db.SourceTopics.Where(link => link.SourceId == id).ExecuteDeleteAsync(token);
        foreach (SourceMappingInput link in input.Topics)
            await db.Database.ExecuteSqlAsync($"""
                INSERT INTO SourceTopics (SourceId, Topic, Keywords)
                VALUES ({id}, {link.Topic}, {link.Keywords?.Trim() ?? ""})
                """, token);
        await db.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return Results.NoContent();
    }

    public static async Task<IResult> Delete(int id, FeedDb db, CancellationToken token) =>
        await db.NewsSources.Where(source => source.Id == id).ExecuteDeleteAsync(token) == 0
            ? Results.NotFound() : Results.NoContent();

    public static async Task<IResult> Create(SourceUpdate input, FeedDb db, SourcePolicy policy, CancellationToken token)
    {
        if (!Valid(input, policy)) return Results.BadRequest(new { message = "Enter a valid source and at least one topic." });
        string url = new Uri(input.Url).AbsoluteUri;
        await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction =
            await db.Database.BeginTransactionAsync(token);
        if (await db.NewsSources.AnyAsync(source => source.Url == url, token))
            return Results.Conflict(new { message = "This source URL already exists. Edit its topic assignments instead." });
        NewsSource source = new() { Name = input.Name.Trim(), Url = url, Kind = input.Kind };
        db.NewsSources.Add(source);
        await db.SaveChangesAsync(token);
        db.SourceTopics.AddRange(input.Topics.Select(link => new SourceTopic(source.Id, link.Topic, link.Keywords?.Trim() ?? "")));
        await db.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return Results.NoContent();
    }

    public static bool Valid(SourceUpdate input, SourcePolicy policy) =>
        !string.IsNullOrWhiteSpace(input.Name) && input.Name.Trim().Length <= 100 &&
        policy.IsAllowed(input.Url, input.Kind) && input.Topics is { Length: > 0 } &&
        input.Topics.Length <= NewsTopics.All.Count &&
        input.Topics.All(link => link is not null && NewsTopics.All.Contains(link.Topic) && (link.Keywords?.Length ?? 0) <= 300) &&
        input.Topics.Select(link => link.Topic).Distinct().Count() == input.Topics.Length;
}

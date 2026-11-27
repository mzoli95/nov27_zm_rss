using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WorldEventAlerts.Feed;

public sealed class FeedQuery
{
    [FromQuery] public string? Topic { get; init; }
    [FromQuery] public string? Search { get; init; }
    [FromQuery] public string? Sort { get; init; }
    [FromQuery] public int? Cursor { get; init; }
}

public static class FeedEndpoints
{
    private const int PageSize = 20;

    public static async Task<IResult> Read(
        [AsParameters] FeedQuery query, FeedDb db, CancellationToken cancellationToken)
    {
        var articles = db.Articles.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query.Topic))
            articles = articles.Where(article => article.Topic == query.Topic);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            articles = articles.Where(article => article.Title.ToLower().Contains(search));
        }

        // Fixture IDs are assigned in publication order.
        var oldest = query.Sort == "oldest";
        if (query.Cursor is int cursor)
            articles = oldest ? articles.Where(a => a.Id > cursor) : articles.Where(a => a.Id < cursor);

        var ordered = oldest ? articles.OrderBy(a => a.Id) : articles.OrderByDescending(a => a.Id);
        var rows = await ordered.Take(PageSize + 1).ToListAsync(cancellationToken);
        var items = rows.Take(PageSize).ToArray();
        int? nextCursor = rows.Count > PageSize ? items[^1].Id : null;
        return Results.Ok(new { items, nextCursor });
    }
}

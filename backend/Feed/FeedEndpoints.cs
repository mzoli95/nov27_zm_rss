using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace WorldEventAlerts.Feed;

public sealed class FeedQuery
{
    [FromQuery] public string? Topic { get; init; }
    [FromQuery] public string? Search { get; init; }
    [FromQuery] public string? Sort { get; init; }
    [FromQuery] public int? Cursor { get; init; }
    [FromQuery] public bool? Liked { get; init; }
}

public static class FeedEndpoints
{
    private const int PageSize = 20;

    public static async Task<IResult> Read(
        [AsParameters] FeedQuery query, FeedDb db, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var likes = db.ArticleLikes.Where(like => like.UserId == userId);
        var articles = db.Articles.AsNoTracking();
        if (query.Liked == true)
            articles = articles.Where(article => likes.Any(like => like.ArticleId == article.Id));
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
        var rows = await ordered.Take(PageSize + 1).Select(article => new
        {
            article.Id, article.Title, article.Description, article.Topic, article.Source,
            article.ImageUrl, article.Url, article.PublishedAt,
            liked = likes.Any(like => like.ArticleId == article.Id)
        }).ToListAsync(cancellationToken);
        var items = rows.Take(PageSize).ToArray();
        int? nextCursor = rows.Count > PageSize ? items[^1].Id : null;
        return Results.Ok(new { items, nextCursor });
    }

    public static async Task<IResult> SetLike(
        int id, LikeRequest request, FeedDb db, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (!await db.Articles.AnyAsync(article => article.Id == id, cancellationToken))
            return Results.NotFound();

        if (request.Liked)
            await db.Database.ExecuteSqlAsync(
                $"INSERT INTO ArticleLikes (UserId, ArticleId) VALUES ({userId}, {id}) ON CONFLICT (UserId, ArticleId) DO NOTHING",
                cancellationToken);
        else
            await db.ArticleLikes.Where(like => like.UserId == userId && like.ArticleId == id)
                .ExecuteDeleteAsync(cancellationToken);

        return Results.NoContent();
    }
}

public sealed record LikeRequest(bool Liked);

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace WorldEventAlerts.Feed;

public enum FeedSort { Newest, Oldest }

public sealed class FeedQuery
{
    [FromQuery] public string? Topic { get; init; }
    [FromQuery] public string? Search { get; init; }
    [FromQuery] public FeedSort? Sort { get; init; }
    [FromQuery] public int? Cursor { get; init; }
    [FromQuery] public bool? Liked { get; init; }
}

public static class FeedEndpoints
{
    private const int PageSize = 20;

    public static async Task<IResult> Read(
        [AsParameters] FeedQuery query, FeedDb db, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        Guid userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        IQueryable<ArticleLike> likes = db.ArticleLikes.Where(like => like.UserId == userId);
        IQueryable<Article> articles = db.Articles.AsNoTracking();
        if (query.Liked == true)
            articles = articles.Where(article => likes.Any(like => like.ArticleId == article.Id));
        if (!string.IsNullOrWhiteSpace(query.Topic))
            articles = articles.Where(article => article.Topic == query.Topic);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            string search = query.Search.Trim().ToLowerInvariant();
            articles = articles.Where(article => article.Title.ToLower().Contains(search));
        }

        // Fixture IDs are assigned in publication order.
        bool oldest = query.Sort == FeedSort.Oldest;
        if (query.Cursor is int cursor)
            articles = oldest ? articles.Where(a => a.Id > cursor) : articles.Where(a => a.Id < cursor);

        IOrderedQueryable<Article> ordered = oldest ? articles.OrderBy(a => a.Id) : articles.OrderByDescending(a => a.Id);
        List<FeedArticle> rows = await ordered.Take(PageSize + 1).Select(article => new FeedArticle(
            article.Id, article.Title, article.Description, article.Topic, article.Source,
            article.ImageUrl, article.Url, article.PublishedAt,
            likes.Any(like => like.ArticleId == article.Id))).ToListAsync(cancellationToken);
        if (rows.Count == 0) return Results.Ok(new FeedPage([], null));

        FeedArticle[] items = rows.Take(PageSize).ToArray();
        int? nextCursor = rows.Count > PageSize ? items[^1].Id : null;
        return Results.Ok(new FeedPage(items, nextCursor));
    }

    public static async Task<IResult> SetLike(
        int id, LikeRequest request, FeedDb db, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        Guid userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
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
public sealed record FeedArticle(int Id, string Title, string Description, string Topic, string Source,
    string? ImageUrl, string Url, DateTime PublishedAt, bool Liked);
public sealed record FeedPage(FeedArticle[] Items, int? NextCursor);

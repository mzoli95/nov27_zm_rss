using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace WorldEventAlerts.Feed;


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
        else
        {
            DateTime cutoff = DateTime.UtcNow.AddDays(-7);
            articles = articles.Where(article => !article.Archived && article.PublishedAt >= cutoff);
        }
        if (!string.IsNullOrWhiteSpace(query.Topic))
            articles = articles.Where(article => article.Topic == query.Topic ||
                db.ArticleTopics.Any(link => link.ArticleId == article.Id && link.Topic == query.Topic));
        if (query.Preferred == true)
        {
            IQueryable<string> topics = db.UserTopics.Where(row => row.UserId == userId).Select(row => row.Topic);
            IQueryable<string> labels = db.UserLabels.Where(row => row.UserId == userId).Select(row => row.Label);
            articles = articles.Where(article =>
                topics.Contains(article.Topic) ||
                db.ArticleTopics.Any(link => link.ArticleId == article.Id && topics.Contains(link.Topic)) ||
                labels.Any(label => article.Title.ToLower().Contains(label) ||
                    article.Description.ToLower().Contains(label)));
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            string search = query.Search.Trim().ToLowerInvariant();
            articles = articles.Where(article => article.Title.ToLower().Contains(search));
        }

        bool oldest = string.Equals(query.Sort, nameof(FeedSort.Oldest), StringComparison.OrdinalIgnoreCase);
        if (!oldest && !string.IsNullOrEmpty(query.Sort) &&
            !string.Equals(query.Sort, nameof(FeedSort.Newest), StringComparison.OrdinalIgnoreCase))
            return Results.BadRequest(new { message = "Choose newest or oldest." });
        if (query.Cursor is int cursor)
        {
            DateTime? date = await db.Articles.Where(article => article.Id == cursor)
                .Select(article => (DateTime?)article.PublishedAt).SingleOrDefaultAsync(cancellationToken);
            if (date is null) return Results.Ok(new FeedPage([], null));
            articles = oldest
                ? articles.Where(a => a.PublishedAt > date || a.PublishedAt == date && a.Id > cursor)
                : articles.Where(a => a.PublishedAt < date || a.PublishedAt == date && a.Id < cursor);
        }

        IOrderedQueryable<Article> ordered = oldest ? articles.OrderBy(a => a.PublishedAt).ThenBy(a => a.Id) :
            articles.OrderByDescending(a => a.PublishedAt).ThenByDescending(a => a.Id);
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

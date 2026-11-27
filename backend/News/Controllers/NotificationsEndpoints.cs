using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.News;

public static class NotificationsEndpoints
{
    public static async Task<IResult> Read(FeedDb db, ClaimsPrincipal actor, CancellationToken token)
    {
        Guid id = Guid.Parse(actor.FindFirstValue(ClaimTypes.NameIdentifier)!);
        IQueryable<ArticleAlert> alerts = db.ArticleAlerts.Where(alert => alert.UserId == id);
        int unread = await alerts.CountAsync(alert => !alert.Read, token);
        return Results.Ok(new
        {
            unread,
            items = await alerts.Join(db.Articles, alert => alert.ArticleId, article => article.Id,
                (alert, article) => new { article.Id, article.Title, article.Url, alert.CreatedAt, alert.Read })
                .OrderByDescending(alert => alert.CreatedAt).ThenByDescending(alert => alert.Id)
                .Take(50).ToListAsync(token)
        });
    }

    public static async Task<IResult> MarkRead(FeedDb db, ClaimsPrincipal actor, int? articleId, CancellationToken token)
    {
        Guid id = Guid.Parse(actor.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await db.ArticleAlerts.Where(alert => alert.UserId == id && !alert.Read &&
                (articleId == null || alert.ArticleId == articleId))
            .ExecuteUpdateAsync(update => update.SetProperty(alert => alert.Read, true), token);
        return Results.NoContent();
    }
}

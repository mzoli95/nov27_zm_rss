using Microsoft.EntityFrameworkCore;

namespace WorldEventAlerts.Feed;

public sealed record Article(
    int Id, string Title, string Description, string Topic, string Source,
    string? ImageUrl, string Url, DateTime PublishedAt);

public sealed class FeedDb(DbContextOptions<FeedDb> options) : DbContext(options)
{
    public DbSet<Article> Articles => Set<Article>();
}

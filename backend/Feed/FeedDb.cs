using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace WorldEventAlerts.Feed;

public sealed record Article(
    int Id, string Title, string Description, string Topic, string Source,
    string? ImageUrl, string Url, DateTime PublishedAt);

public sealed class FeedDb(DbContextOptions<FeedDb> options) : DbContext(options)
{
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ArticleLike> ArticleLikes => Set<ArticleLike>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        EntityTypeBuilder<ArticleLike> likes = modelBuilder.Entity<ArticleLike>();
        likes.HasKey(like => new { like.UserId, like.ArticleId });
        likes.HasOne<Article>().WithMany().HasForeignKey(like => like.ArticleId);
    }
}

public sealed record ArticleLike(Guid UserId, int ArticleId);

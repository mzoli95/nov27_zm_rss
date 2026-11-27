using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WorldEventAlerts.News;

namespace WorldEventAlerts.Feed;

public sealed record Article(
    int Id, string Title, string Description, string Topic, string Source,
    string? ImageUrl, string Url, DateTime PublishedAt);

public sealed class FeedDb(DbContextOptions<FeedDb> options) : DbContext(options)
{
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ArticleLike> ArticleLikes => Set<ArticleLike>();
    public DbSet<NewsSource> NewsSources => Set<NewsSource>();
    public DbSet<SourceTopic> SourceTopics => Set<SourceTopic>();
    public DbSet<UserTopic> UserTopics => Set<UserTopic>();
    public DbSet<UserLabel> UserLabels => Set<UserLabel>();
    public DbSet<ArticleTopic> ArticleTopics => Set<ArticleTopic>();
    public DbSet<ArticleAlert> ArticleAlerts => Set<ArticleAlert>();
    public DbSet<ImportedArticle> ImportedArticles => Set<ImportedArticle>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        EntityTypeBuilder<ArticleLike> likes = modelBuilder.Entity<ArticleLike>();
        likes.HasKey(like => new { like.UserId, like.ArticleId });
        likes.HasOne<Article>().WithMany().HasForeignKey(like => like.ArticleId);
        ConfigureNews(modelBuilder);
    }

    internal static void ConfigureNews(ModelBuilder model)
    {
        model.Entity<NewsSource>().ToTable("NewsSources").HasIndex(x => x.Url).IsUnique();
        model.Entity<SourceTopic>().ToTable("SourceTopics").HasKey(x => new { x.SourceId, x.Topic });
        model.Entity<SourceTopic>().HasOne<NewsSource>().WithMany().HasForeignKey(x => x.SourceId);
        model.Entity<UserTopic>().ToTable("UserTopics").HasKey(x => new { x.UserId, x.Topic });
        model.Entity<UserLabel>().ToTable("UserLabels").HasKey(x => new { x.UserId, x.Label });
        model.Entity<ArticleTopic>().ToTable("ArticleTopics").HasKey(x => new { x.ArticleId, x.Topic });
        model.Entity<ArticleTopic>().HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId);
        model.Entity<ArticleAlert>().ToTable("ArticleAlerts").HasKey(x => new { x.UserId, x.ArticleId });
        model.Entity<ArticleAlert>().HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId);
        model.Entity<ImportedArticle>().ToTable("ImportedArticles").HasKey(x => x.CanonicalUrl);
        model.Entity<ImportedArticle>().HasOne<Article>().WithMany().HasForeignKey(x => x.ArticleId);
        model.Entity<ImportedArticle>().HasIndex(x => new { x.HeadlineKey, x.Day });
    }
}

public sealed record ArticleLike(Guid UserId, int ArticleId);

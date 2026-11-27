using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace WorldEventAlerts.Feed.Migrations;

[DbContext(typeof(FeedDb))]
public sealed class FeedDbModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "11.0.0");
        modelBuilder.Entity("WorldEventAlerts.Feed.ArticleLike", entity =>
        {
            entity.Property<Guid>("UserId").HasColumnType("TEXT");
            entity.Property<int>("ArticleId").HasColumnType("INTEGER");
            entity.HasKey("UserId", "ArticleId");
            entity.HasIndex("ArticleId");
            entity.ToTable("ArticleLikes");
            entity.HasOne("WorldEventAlerts.Feed.Article", null)
                .WithMany().HasForeignKey("ArticleId").OnDelete(DeleteBehavior.Cascade).IsRequired();
        });
        modelBuilder.Entity("WorldEventAlerts.Feed.Article", entity =>
        {
            entity.Property<int>("Id").ValueGeneratedOnAdd().HasColumnType("INTEGER");
            entity.Property<string>("Title").IsRequired().HasColumnType("TEXT");
            entity.Property<string>("Description").IsRequired().HasColumnType("TEXT");
            entity.Property<string>("Topic").IsRequired().HasColumnType("TEXT");
            entity.Property<string>("Source").IsRequired().HasColumnType("TEXT");
            entity.Property<string>("ImageUrl").HasColumnType("TEXT");
            entity.Property<string>("Url").IsRequired().HasColumnType("TEXT");
            entity.Property<DateTime>("PublishedAt").HasColumnType("TEXT");
            entity.HasKey("Id");
            entity.ToTable("Articles");
        });
        modelBuilder.Entity("WorldEventAlerts.News.NewsSource", entity =>
        {
            entity.Property<int>("Id").ValueGeneratedOnAdd().HasColumnType("INTEGER");
            entity.Property<string>("Name").IsRequired().HasColumnType("TEXT");
            entity.Property<string>("Url").IsRequired().HasColumnType("TEXT");
            entity.Property<int>("Kind").HasColumnType("INTEGER");
            entity.Property<DateTime?>("LastSuccess").HasColumnType("TEXT");
            entity.Property<string>("Status").HasColumnType("TEXT");
            entity.HasKey("Id");
            entity.HasIndex("Url").IsUnique();
            entity.ToTable("NewsSources");
        });
        modelBuilder.Entity("WorldEventAlerts.News.SourceTopic", entity =>
        {
            entity.Property<int>("SourceId").HasColumnType("INTEGER");
            entity.Property<string>("Topic").HasColumnType("TEXT");
            entity.Property<string>("Keywords").IsRequired().HasColumnType("TEXT");
            entity.HasKey("SourceId", "Topic");
            entity.ToTable("SourceTopics");
            entity.HasOne("WorldEventAlerts.News.NewsSource", null)
                .WithMany().HasForeignKey("SourceId").OnDelete(DeleteBehavior.Cascade).IsRequired();
        });
        modelBuilder.Entity("WorldEventAlerts.News.UserTopic", entity =>
        {
            entity.Property<Guid>("UserId").HasColumnType("TEXT");
            entity.Property<string>("Topic").HasColumnType("TEXT");
            entity.HasKey("UserId", "Topic");
            entity.ToTable("UserTopics");
        });
        modelBuilder.Entity("WorldEventAlerts.News.UserLabel", entity =>
        {
            entity.Property<Guid>("UserId").HasColumnType("TEXT");
            entity.Property<string>("Label").HasColumnType("TEXT");
            entity.HasKey("UserId", "Label");
            entity.ToTable("UserLabels");
        });
        modelBuilder.Entity("WorldEventAlerts.News.ArticleTopic", entity =>
        {
            entity.Property<int>("ArticleId").HasColumnType("INTEGER");
            entity.Property<string>("Topic").HasColumnType("TEXT");
            entity.HasKey("ArticleId", "Topic");
            entity.ToTable("ArticleTopics");
            entity.HasOne("WorldEventAlerts.Feed.Article", null)
                .WithMany().HasForeignKey("ArticleId").OnDelete(DeleteBehavior.Cascade).IsRequired();
        });
        modelBuilder.Entity("WorldEventAlerts.News.ArticleAlert", entity =>
        {
            entity.Property<Guid>("UserId").HasColumnType("TEXT");
            entity.Property<int>("ArticleId").HasColumnType("INTEGER");
            entity.Property<DateTime>("CreatedAt").HasColumnType("TEXT");
            entity.Property<bool>("Read").HasColumnType("INTEGER");
            entity.HasKey("UserId", "ArticleId");
            entity.HasIndex("ArticleId");
            entity.ToTable("ArticleAlerts");
            entity.HasOne("WorldEventAlerts.Feed.Article", null)
                .WithMany().HasForeignKey("ArticleId").OnDelete(DeleteBehavior.Cascade).IsRequired();
        });
        modelBuilder.Entity("WorldEventAlerts.News.ImportedArticle", entity =>
        {
            entity.Property<string>("CanonicalUrl").HasColumnType("TEXT");
            entity.Property<int>("ArticleId").HasColumnType("INTEGER");
            entity.Property<string>("HeadlineKey").IsRequired().HasColumnType("TEXT");
            entity.Property<string>("Day").IsRequired().HasColumnType("TEXT");
            entity.HasKey("CanonicalUrl");
            entity.HasIndex("ArticleId");
            entity.HasIndex("HeadlineKey", "Day");
            entity.ToTable("ImportedArticles");
            entity.HasOne("WorldEventAlerts.Feed.Article", null)
                .WithMany().HasForeignKey("ArticleId").OnDelete(DeleteBehavior.Cascade).IsRequired();
        });
    }
}

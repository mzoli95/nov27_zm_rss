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
    }
}

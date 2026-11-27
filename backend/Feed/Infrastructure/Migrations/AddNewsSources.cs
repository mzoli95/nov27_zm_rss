using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace WorldEventAlerts.Feed.Migrations;

[DbContext(typeof(FeedDb))]
[Migration("20261127000300_AddNewsSources")]
public sealed class AddNewsSources : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE NewsSources (
                Id INTEGER PRIMARY KEY AUTOINCREMENT, Name TEXT NOT NULL, Url TEXT NOT NULL,
                Kind INTEGER NOT NULL, LastSuccess TEXT NULL, Status TEXT NULL);
            CREATE UNIQUE INDEX IX_NewsSources_Url ON NewsSources (Url);
            CREATE TABLE SourceTopics (
                SourceId INTEGER NOT NULL REFERENCES NewsSources(Id) ON DELETE CASCADE,
                Topic TEXT NOT NULL, Keywords TEXT NOT NULL, PRIMARY KEY (SourceId, Topic));
            CREATE TABLE UserTopics (UserId TEXT NOT NULL, Topic TEXT NOT NULL, PRIMARY KEY (UserId, Topic));
            CREATE TABLE UserLabels (UserId TEXT NOT NULL, Label TEXT NOT NULL, PRIMARY KEY (UserId, Label));
            CREATE TABLE ArticleTopics (
                ArticleId INTEGER NOT NULL REFERENCES Articles(Id) ON DELETE CASCADE,
                Topic TEXT NOT NULL, PRIMARY KEY (ArticleId, Topic));
            CREATE TABLE ArticleAlerts (
                UserId TEXT NOT NULL, ArticleId INTEGER NOT NULL REFERENCES Articles(Id) ON DELETE CASCADE,
                CreatedAt TEXT NOT NULL, Read INTEGER NOT NULL, PRIMARY KEY (UserId, ArticleId));
            CREATE INDEX IX_ArticleAlerts_ArticleId ON ArticleAlerts (ArticleId);
            CREATE TABLE ImportedArticles (
                CanonicalUrl TEXT NOT NULL PRIMARY KEY,
                ArticleId INTEGER NOT NULL REFERENCES Articles(Id) ON DELETE CASCADE,
                HeadlineKey TEXT NOT NULL, Day TEXT NOT NULL);
            CREATE INDEX IX_ImportedArticles_ArticleId ON ImportedArticles (ArticleId);
            CREATE INDEX IX_ImportedArticles_HeadlineKey_Day ON ImportedArticles (HeadlineKey, Day);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql("""
            DROP TABLE ImportedArticles;
            DROP TABLE ArticleAlerts;
            DROP TABLE ArticleTopics;
            DROP TABLE UserLabels;
            DROP TABLE UserTopics;
            DROP TABLE SourceTopics;
            DROP TABLE NewsSources;
            """);
}

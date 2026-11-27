using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace WorldEventAlerts.Feed.Migrations;

[DbContext(typeof(FeedDb))]
[Migration("20261127000400_AddDeliveryChannels")]
public sealed class AddDeliveryChannels : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql("""
            CREATE TABLE ChannelPreferences (
                UserId TEXT NOT NULL, Channel TEXT NOT NULL, Enabled INTEGER NOT NULL,
                PRIMARY KEY (UserId, Channel));
            CREATE TABLE ChannelStates (Channel TEXT NOT NULL PRIMARY KEY, Enabled INTEGER NOT NULL);
            CREATE TABLE DeliveryAttempts (
                UserId TEXT NOT NULL, ArticleId INTEGER NOT NULL REFERENCES Articles(Id) ON DELETE CASCADE,
                Channel TEXT NOT NULL, Status INTEGER NOT NULL, UpdatedAt TEXT NOT NULL,
                PRIMARY KEY (UserId, ArticleId, Channel));
            CREATE INDEX IX_DeliveryAttempts_ArticleId ON DeliveryAttempts (ArticleId);
            CREATE INDEX IX_DeliveryAttempts_Status_UpdatedAt ON DeliveryAttempts (Status, UpdatedAt);
            CREATE TABLE AppMarkers (Key TEXT NOT NULL PRIMARY KEY);
            INSERT INTO AppMarkers (Key) SELECT 'news-defaults'
                WHERE EXISTS (SELECT 1 FROM NewsSources);
            """);

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql("DROP TABLE AppMarkers; DROP TABLE DeliveryAttempts; DROP TABLE ChannelStates; DROP TABLE ChannelPreferences;");
}

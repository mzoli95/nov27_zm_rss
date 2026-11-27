using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace WorldEventAlerts.Feed.Migrations;

[DbContext(typeof(FeedDb))]
[Migration("20261127000500_AddSchedulingAndProviderConfig")]
public sealed class AddSchedulingAndProviderConfig : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql("""
            ALTER TABLE NewsSources ADD COLUMN Enabled INTEGER NOT NULL DEFAULT 1;
            ALTER TABLE Articles ADD COLUMN Archived INTEGER NOT NULL DEFAULT 0;
            CREATE TABLE StoredChannelConfigs (Channel TEXT NOT NULL PRIMARY KEY, ProtectedJson TEXT NOT NULL);
            """);

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql("""
            DROP TABLE StoredChannelConfigs;
            ALTER TABLE Articles DROP COLUMN Archived;
            ALTER TABLE NewsSources DROP COLUMN Enabled;
            """);
}

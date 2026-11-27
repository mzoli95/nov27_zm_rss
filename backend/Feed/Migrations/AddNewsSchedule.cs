using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace WorldEventAlerts.Feed.Migrations;

[DbContext(typeof(FeedDb))]
[Migration("20261127000600_AddNewsSchedule")]
public sealed class AddNewsSchedule : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql("""
            CREATE TABLE NewsSchedule (
                Id INTEGER NOT NULL PRIMARY KEY CHECK (Id = 1),
                ImportMinutes INTEGER NOT NULL,
                ArchiveMinutes INTEGER NOT NULL
            );
            """);

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.Sql("DROP TABLE NewsSchedule");
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace WorldEventAlerts.Feed.Migrations;

[DbContext(typeof(FeedDb))]
[Migration("20261127000100_InitialFeed")]
public sealed class InitialFeed : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Articles",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true),
                Title = table.Column<string>(nullable: false),
                Description = table.Column<string>(nullable: false),
                Topic = table.Column<string>(nullable: false),
                Source = table.Column<string>(nullable: false),
                ImageUrl = table.Column<string>(nullable: true),
                Url = table.Column<string>(nullable: false),
                PublishedAt = table.Column<DateTime>(nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_Articles", row => row.Id));
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropTable("Articles");
}

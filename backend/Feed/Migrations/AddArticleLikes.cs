using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace WorldEventAlerts.Feed.Migrations;

[DbContext(typeof(FeedDb))]
[Migration("20261127000200_AddArticleLikes")]
public sealed class AddArticleLikes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "ArticleLikes",
            columns: table => new
            {
                UserId = table.Column<Guid>(nullable: false),
                ArticleId = table.Column<int>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ArticleLikes", row => new { row.UserId, row.ArticleId });
                table.ForeignKey("FK_ArticleLikes_Articles_ArticleId", row => row.ArticleId,
                    "Articles", "Id", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.CreateIndex("IX_ArticleLikes_ArticleId", "ArticleLikes", "ArticleId");
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropTable("ArticleLikes");
}

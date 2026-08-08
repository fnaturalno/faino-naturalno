using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FaynoShop.API.Migrations
{
    /// <inheritdoc />
    public partial class NewsSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "news_posts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    title_uk = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    title_en = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    slug = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    excerpt_uk = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    excerpt_en = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    body_uk = table.Column<string>(type: "text", nullable: false),
                    body_en = table.Column<string>(type: "text", nullable: true),
                    cover_image_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    published_at = table.Column<DateTime>(type: "timestamptz", nullable: true),
                    is_published = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_featured = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamptz", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_news_posts", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_news_posts_is_featured",
                table: "news_posts",
                column: "is_featured");

            migrationBuilder.CreateIndex(
                name: "idx_news_posts_is_published_published_at",
                table: "news_posts",
                columns: new[] { "is_published", "published_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "idx_news_posts_slug",
                table: "news_posts",
                column: "slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "news_posts");
        }
    }
}

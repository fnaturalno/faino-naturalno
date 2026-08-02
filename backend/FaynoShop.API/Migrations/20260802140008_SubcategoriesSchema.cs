using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FaynoShop.API.Migrations
{
    /// <inheritdoc />
    public partial class SubcategoriesSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "parent_id",
                table: "categories",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_categories_parent_id",
                table: "categories",
                column: "parent_id");

            migrationBuilder.AddForeignKey(
                name: "fk_categories_categories_parent_id",
                table: "categories",
                column: "parent_id",
                principalTable: "categories",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_categories_categories_parent_id",
                table: "categories");

            migrationBuilder.DropIndex(
                name: "idx_categories_parent_id",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "parent_id",
                table: "categories");
        }
    }
}

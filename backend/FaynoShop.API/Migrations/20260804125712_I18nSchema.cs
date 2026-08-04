using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FaynoShop.API.Migrations
{
    /// <inheritdoc />
    public partial class I18nSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "short_description",
                table: "products",
                newName: "short_description_uk");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "products",
                newName: "name_uk");

            migrationBuilder.RenameColumn(
                name: "description",
                table: "products",
                newName: "description_uk");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "categories",
                newName: "name_uk");

            migrationBuilder.RenameColumn(
                name: "description",
                table: "categories",
                newName: "description_uk");

            migrationBuilder.AddColumn<string>(
                name: "description_en",
                table: "products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "products",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "short_description_en",
                table: "products",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "description_en",
                table: "categories",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "categories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "description_en",
                table: "products");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "products");

            migrationBuilder.DropColumn(
                name: "short_description_en",
                table: "products");

            migrationBuilder.DropColumn(
                name: "description_en",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "categories");

            migrationBuilder.RenameColumn(
                name: "short_description_uk",
                table: "products",
                newName: "short_description");

            migrationBuilder.RenameColumn(
                name: "name_uk",
                table: "products",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "description_uk",
                table: "products",
                newName: "description");

            migrationBuilder.RenameColumn(
                name: "name_uk",
                table: "categories",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "description_uk",
                table: "categories",
                newName: "description");
        }
    }
}

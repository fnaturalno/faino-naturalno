using FaynoShop.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FaynoShop.API.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260815120000_ShopSettings")]
    public partial class ShopSettingsSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "shop_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    ukrposhta_free_from_amount = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamptz", nullable: false, defaultValueSql: "now()"),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_shop_settings", x => x.id);
                });

            migrationBuilder.Sql(
                """
                INSERT INTO shop_settings (id, ukrposhta_free_from_amount, updated_at)
                VALUES (1, 1300, TIMESTAMPTZ '2026-08-15 08:00:00+00');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "shop_settings");
        }
    }
}

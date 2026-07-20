using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FaynoShop.API.Migrations
{
    /// <inheritdoc />
    public partial class OrderConfirmationToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "confirmation_token_hash",
                table: "orders",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            // Backfill unique hashes for existing rows before NOT NULL + unique index.
            migrationBuilder.Sql(
                """
                UPDATE orders
                SET confirmation_token_hash =
                    md5(random()::text || clock_timestamp()::text || id::text)
                    || md5(id::text || random()::text || clock_timestamp()::text)
                WHERE confirmation_token_hash IS NULL OR confirmation_token_hash = '';
                """);

            migrationBuilder.AlterColumn<string>(
                name: "confirmation_token_hash",
                table: "orders",
                type: "character varying(128)",
                maxLength: 128,
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "idx_orders_confirmation_token_hash",
                table: "orders",
                column: "confirmation_token_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_orders_confirmation_token_hash",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "confirmation_token_hash",
                table: "orders");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FaynoShop.API.Migrations
{
    /// <inheritdoc />
    public partial class RefreshTokenFamily : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "token_family",
                table: "refresh_tokens",
                type: "uuid",
                nullable: true);

            // Each existing session gets its own family so reuse revoke stays scoped.
            migrationBuilder.Sql(
                """
                UPDATE refresh_tokens
                SET token_family = gen_random_uuid()
                WHERE token_family IS NULL;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "token_family",
                table: "refresh_tokens",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_refresh_tokens_token_family",
                table: "refresh_tokens",
                column: "token_family");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_refresh_tokens_token_family",
                table: "refresh_tokens");

            migrationBuilder.DropColumn(
                name: "token_family",
                table: "refresh_tokens");
        }
    }
}

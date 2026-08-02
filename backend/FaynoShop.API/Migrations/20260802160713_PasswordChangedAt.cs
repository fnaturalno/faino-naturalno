using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FaynoShop.API.Migrations
{
    /// <inheritdoc />
    public partial class PasswordChangedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "password_changed_at",
                table: "users",
                type: "timestamptz",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "password_changed_at",
                table: "users");
        }
    }
}

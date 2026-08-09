using FaynoShop.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FaynoShop.API.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260809102500_OrderDeliveryMethod")]
    public partial class OrderDeliveryMethod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "delivery_method",
                table: "orders",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "nova-poshta");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "delivery_method",
                table: "orders");
        }
    }
}

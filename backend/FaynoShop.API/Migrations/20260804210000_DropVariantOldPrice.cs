using FaynoShop.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FaynoShop.API.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260804210000_DropVariantOldPrice")]
public partial class DropVariantOldPrice : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "old_price",
            table: "product_variants");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<decimal>(
            name: "old_price",
            table: "product_variants",
            type: "numeric(10,2)",
            precision: 10,
            scale: 2,
            nullable: true);
    }
}

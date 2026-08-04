using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FaynoShop.API.Migrations
{
    /// <inheritdoc />
    public partial class ProductVariantsSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // No data migration of product prices → variants. Existing cart/order lines
            // cannot be remapped to variant_id, so clear them before the FK retrofit.
            migrationBuilder.Sql("DELETE FROM cart_items;");
            migrationBuilder.Sql("DELETE FROM order_items;");

            migrationBuilder.DropForeignKey(
                name: "fk_cart_items_products_product_id",
                table: "cart_items");

            migrationBuilder.DropIndex(
                name: "idx_cart_items_cart_id_product_id",
                table: "cart_items");

            migrationBuilder.DropIndex(
                name: "idx_cart_items_product_id",
                table: "cart_items");

            migrationBuilder.DropColumn(
                name: "product_id",
                table: "cart_items");

            migrationBuilder.DropIndex(
                name: "idx_products_price",
                table: "products");

            migrationBuilder.DropColumn(
                name: "old_price",
                table: "products");

            migrationBuilder.DropColumn(
                name: "price",
                table: "products");

            migrationBuilder.DropColumn(
                name: "weight",
                table: "products");

            migrationBuilder.DropColumn(
                name: "weight_unit",
                table: "products");

            migrationBuilder.CreateTable(
                name: "product_variants",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    weight = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false),
                    weight_unit = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    old_price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product_variants", x => x.id);
                    table.ForeignKey(
                        name: "fk_product_variants_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddColumn<int>(
                name: "variant_id",
                table: "cart_items",
                type: "integer",
                nullable: false);

            migrationBuilder.AddColumn<int>(
                name: "variant_id",
                table: "order_items",
                type: "integer",
                nullable: false);

            migrationBuilder.AddColumn<decimal>(
                name: "weight",
                table: "order_items",
                type: "numeric(10,3)",
                precision: 10,
                scale: 3,
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "weight_unit",
                table: "order_items",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false);

            migrationBuilder.CreateIndex(
                name: "idx_cart_items_variant_id",
                table: "cart_items",
                column: "variant_id");

            migrationBuilder.CreateIndex(
                name: "idx_cart_items_cart_id_variant_id",
                table: "cart_items",
                columns: new[] { "cart_id", "variant_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_order_items_variant_id",
                table: "order_items",
                column: "variant_id");

            migrationBuilder.CreateIndex(
                name: "idx_product_variants_product_id",
                table: "product_variants",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "idx_product_variants_product_id_weight_weight_unit",
                table: "product_variants",
                columns: new[] { "product_id", "weight", "weight_unit" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_cart_items_product_variants_variant_id",
                table: "cart_items",
                column: "variant_id",
                principalTable: "product_variants",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_order_items_product_variants_variant_id",
                table: "order_items",
                column: "variant_id",
                principalTable: "product_variants",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM cart_items;");
            migrationBuilder.Sql("DELETE FROM order_items;");

            migrationBuilder.DropForeignKey(
                name: "fk_cart_items_product_variants_variant_id",
                table: "cart_items");

            migrationBuilder.DropForeignKey(
                name: "fk_order_items_product_variants_variant_id",
                table: "order_items");

            migrationBuilder.DropTable(
                name: "product_variants");

            migrationBuilder.DropIndex(
                name: "idx_cart_items_cart_id_variant_id",
                table: "cart_items");

            migrationBuilder.DropIndex(
                name: "idx_cart_items_variant_id",
                table: "cart_items");

            migrationBuilder.DropIndex(
                name: "idx_order_items_variant_id",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "variant_id",
                table: "cart_items");

            migrationBuilder.DropColumn(
                name: "variant_id",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "weight",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "weight_unit",
                table: "order_items");

            migrationBuilder.AddColumn<int>(
                name: "product_id",
                table: "cart_items",
                type: "integer",
                nullable: false);

            migrationBuilder.AddColumn<decimal>(
                name: "old_price",
                table: "products",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "price",
                table: "products",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "weight",
                table: "products",
                type: "numeric(10,3)",
                precision: 10,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "weight_unit",
                table: "products",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_products_price",
                table: "products",
                column: "price");

            migrationBuilder.CreateIndex(
                name: "idx_cart_items_product_id",
                table: "cart_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "idx_cart_items_cart_id_product_id",
                table: "cart_items",
                columns: new[] { "cart_id", "product_id" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_cart_items_products_product_id",
                table: "cart_items",
                column: "product_id",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}

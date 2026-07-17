# Database Schema

## PostgreSQL 16 via EF Core 10 + Npgsql

### Naming Convention
- Tables: snake_case plural (e.g., `products`, `order_items`)
- Columns: snake_case via `EFCore.NamingConventions` (`UseSnakeCaseNamingConvention()`)

### Tables

#### categories
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| name | varchar(100) | NOT NULL |
| slug | varchar(100) | UNIQUE NOT NULL |
| description | text | |
| image_url | varchar(500) | |
| sort_order | int | NOT NULL DEFAULT 0 |

**Indexes:**
- `idx_categories_slug` — UNIQUE (slug lookups, category filter query params)
- `idx_categories_sort_order` — catalog category display order

#### products
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| name | varchar(200) | NOT NULL |
| slug | varchar(200) | UNIQUE NOT NULL |
| description | text | |
| short_description | varchar(500) | |
| price | numeric(10,2) | NOT NULL |
| old_price | numeric(10,2) | |
| image_url | varchar(500) | |
| image_urls | text[] | NOT NULL |
| stock_quantity | int | NOT NULL DEFAULT 0 |
| weight | numeric(10,3) | |
| weight_unit | varchar(10) | |
| is_active | bool | NOT NULL DEFAULT true |
| is_featured | bool | NOT NULL DEFAULT false |
| category_id | int | FK → categories (ON DELETE RESTRICT) |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:**
- `idx_products_slug` — UNIQUE (slug lookups, product detail route)
- `idx_products_category_id` — FK + filter by category
- `idx_products_is_active` — public catalog only returns active products
- `idx_products_category_id_is_active` — composite for category + active catalog queries
- `idx_products_is_featured` — `sortBy=popular` (featured first)
- `idx_products_created_at` — `sortBy=new`
- `idx_products_price` — `sortBy=price-asc|price-desc` and price-range filters

#### carts
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| session_id | varchar(100) | UNIQUE NOT NULL |
| user_id | int | nullable; no FK yet (users table not in Phase 1) |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:**
- `idx_carts_session_id` — UNIQUE (guest cart lookup by session)
- `idx_carts_user_id` — future logged-in cart lookup

#### cart_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| cart_id | int | FK → carts (ON DELETE CASCADE) |
| product_id | int | FK → products (ON DELETE RESTRICT) |
| quantity | int | NOT NULL |

**Indexes:**
- `idx_cart_items_cart_id` — FK + load cart contents
- `idx_cart_items_product_id` — FK
- `idx_cart_items_cart_id_product_id` — UNIQUE (one row per product per cart; POST `/api/cart/items` upserts quantity)

#### orders, order_items, users
To be documented as migrations are created.

### Migrations

| Name | Purpose |
|------|---------|
| `CatalogSchema` (`20260717155921_CatalogSchema`) | categories, products, carts, cart_items + indexes |

### Connection String
```
Host=localhost;Port=5432;Database=fayno_shop;Username=fayno;Password=fayno_secret
```

Configured in `backend/FaynoShop.API/appsettings.json` as `ConnectionStrings:DefaultConnection`.

---

## Demo Data Seeding

Controlled by `appsettings.json` / `appsettings.Development.json` flag:

```json
"SeedDemoData": true
```

Or via environment variable: `SEED_DEMO_DATA=true` (maps to the same config key when set).

### Behavior
- Runs on app startup **only if** `SeedDemoData: true`
- Idempotent — checks if categories already exist before inserting
- Skips seeding in production unless explicitly enabled (`SeedDemoData` defaults to `false` in `appsettings.json`; Development sets `true`)

### Demo Data Set

#### Categories (3)
| name | slug | sort_order |
|------|------|------------|
| Спеції | spetsiyi | 1 |
| Приправи | prypravy | 2 |
| Чаї | chayi | 3 |

#### Products (16 — 5 per category + 1 inactive)
Realistic Ukrainian natural products covering catalog UI states:

| State | Coverage |
|-------|----------|
| Pagination | 15 active products (> pageSize 9) |
| Discount | Several with `old_price > price` |
| Featured | 1 featured per category (`is_featured`) |
| Новинка | Several with `created_at` within last 30 days of seed reference `2026-07-17` |
| Missing optional | Null `short_description`, `image_url`, and/or `weight`/`weight_unit` |
| Out of stock | `stock_quantity = 0` (still active, visible, not addable) |
| Inactive | 1 product with `is_active = false` (excluded from public catalog) |

Prices in UAH (`numeric`). Placeholder images under `/assets/demo/...`.

### Implementation

```csharp
// backend/FaynoShop.API/Data/SeedData.cs
public static class SeedData
{
    public static async Task SeedAsync(AppDbContext context, IConfiguration config)
    {
        if (!config.GetValue<bool>("SeedDemoData")) return;
        if (await context.Categories.AnyAsync()) return; // already seeded
        // ... insert categories and products
    }
}
```

Called from `Program.cs`:
```csharp
using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
await SeedData.SeedAsync(db, config);
```

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
| user_id | int | nullable; FK → users (ON DELETE SET NULL) — guests have null |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:**
- `idx_carts_session_id` — UNIQUE (guest cart lookup by session)
- `idx_carts_user_id` — logged-in cart lookup / merge after auth

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

#### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| email | varchar(256) | UNIQUE NOT NULL — stored **lowercased** (InvariantCulture) for case-insensitive uniqueness/login |
| password_hash | varchar(200) | NOT NULL (bcrypt) |
| first_name | varchar(100) | NOT NULL |
| last_name | varchar(100) | NOT NULL |
| phone | varchar(20) | nullable; when set, UA `+380…` validated in API |
| is_admin | bool | NOT NULL DEFAULT false |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:**
- `idx_users_email` — UNIQUE (register duplicate check + login lookup; app normalizes email to lowercase before write/query)

**Email strategy:** No `citext` extension. Auth services MUST lowercase email on register/login/forgot-password so the unique index enforces case-insensitive uniqueness.

#### refresh_tokens
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| user_id | int | FK → users (ON DELETE CASCADE) |
| token_family | uuid | NOT NULL — rotation chain id; reuse of a revoked token revokes the whole family |
| token_hash | varchar(128) | UNIQUE NOT NULL — hash of opaque refresh token (never store plaintext) |
| expires_at | timestamptz | NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| revoked_at | timestamptz | nullable — set on logout / rotation revoke; null = still valid until expiry |

**Indexes:**
- `idx_refresh_tokens_token_hash` — UNIQUE (refresh + logout lookup by presented token)
- `idx_refresh_tokens_user_id` — FK + list sessions per user
- `idx_refresh_tokens_token_family` — reuse-detection revoke-by-family
- `idx_refresh_tokens_expires_at` — cleanup of expired tokens

**Session model:** One row per client session. Multiple concurrent sessions allowed. Logout sets `revoked_at` on the **current** refresh token only. Refresh rotates within the same `token_family`; presenting a revoked token revokes all tokens in that family (theft / reuse detection).

#### password_reset_tokens
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| user_id | int | FK → users (ON DELETE CASCADE) |
| token_hash | varchar(128) | UNIQUE NOT NULL — hash of email-link token |
| expires_at | timestamptz | NOT NULL |
| is_used | bool | NOT NULL DEFAULT false |
| created_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:**
- `idx_password_reset_tokens_token_hash` — UNIQUE (reset-password lookup)
- `idx_password_reset_tokens_user_id` — FK
- `idx_password_reset_tokens_expires_at` — cleanup / expiry checks

#### user_delivery_addresses
Separate 1:1 table (not columns on `users`) so “never saved” = no row; replace-on-save upserts this row.

| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| user_id | int | UNIQUE FK → users (ON DELETE CASCADE) |
| city_id | varchar(64) | NOT NULL — Nova Poshta city Ref |
| city_name | varchar(200) | NOT NULL |
| city_region | varchar(200) | nullable |
| branch_id | varchar(64) | NOT NULL — branch / parcel-locker Ref |
| branch_label | varchar(300) | NOT NULL |
| summary | varchar(500) | NOT NULL — display line (city + branch text) |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:**
- `idx_user_delivery_addresses_user_id` — UNIQUE (one saved NP address per user; GET/PUT profile address)

#### orders
Minimal schema for profile `GET /api/orders` (item count via `order_items`; full checkout UI out of scope).

| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| order_number | varchar(32) | UNIQUE NOT NULL |
| status | varchar(32) | NOT NULL — enum as string: Pending, Confirmed, Shipped, Delivered, Cancelled |
| total_amount | numeric(10,2) | NOT NULL |
| recipient_name | varchar(200) | NOT NULL |
| phone | varchar(20) | NOT NULL |
| email | varchar(256) | NOT NULL |
| delivery_address | varchar(500) | NOT NULL |
| comment | varchar(1000) | nullable |
| user_id | int | nullable; FK → users (ON DELETE SET NULL) — null = guest order |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:**
- `idx_orders_order_number` — UNIQUE (human-readable lookup)
- `idx_orders_user_id` — FK + profile orders list
- `idx_orders_created_at` — newest-first ordering
- `idx_orders_user_id_created_at` — composite for `GET /api/orders` (user filter + newest first, top 20)

#### order_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| order_id | int | FK → orders (ON DELETE CASCADE) |
| product_id | int | FK → products (ON DELETE RESTRICT) |
| quantity | int | NOT NULL |
| unit_price | numeric(10,2) | NOT NULL — price snapshot at order time |

**Indexes:**
- `idx_order_items_order_id` — FK + item count / line items for an order
- `idx_order_items_product_id` — FK

### Migrations

| Name | Purpose |
|------|---------|
| `CatalogSchema` (`20260717155921_CatalogSchema`) | categories, products, carts, cart_items + indexes |
| `AuthSchema` (`20260719170451_AuthSchema`) | users, refresh_tokens, password_reset_tokens, user_delivery_addresses, orders, order_items; FK `carts.user_id` → users |
| `RefreshTokenFamily` (`20260719172227_RefreshTokenFamily`) | `refresh_tokens.token_family` + index for reuse detection |

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
- Idempotent — categories skip if any exist; demo user skips if `demo@fayno.local` already exists
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

#### Demo user (auth / profile)
| Field | Value |
|-------|--------|
| Email | `demo@fayno.local` |
| Password | `Demo1234!` (local-only; bcrypt hash in `SeedData`) |
| Name | Олена Коваль |
| Phone | `+380501112233` |
| NP address | Київ sample city/branch + summary |
| Orders | 2 sample rows (`FN-2026-0001` Delivered, `FN-2026-0002` Shipped) for profile list |

### Implementation

```csharp
// backend/FaynoShop.API/Data/SeedData.cs
public static class SeedData
{
    public static async Task SeedAsync(AppDbContext context, IConfiguration config)
    {
        if (!config.GetValue<bool>("SeedDemoData")) return;
        // catalog: skip if categories exist
        // auth: skip if demo@fayno.local exists
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

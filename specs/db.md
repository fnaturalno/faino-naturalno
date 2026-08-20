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
| name_uk | varchar(100) | NOT NULL — Ukrainian display name (required) |
| name_en | varchar(100) | nullable — English; public API falls back to `name_uk` when empty |
| slug | varchar(100) | UNIQUE NOT NULL — shared across locales |
| description_uk | text | nullable — Ukrainian description |
| description_en | text | nullable — English; falls back to `description_uk` when empty |
| image_url | varchar(500) | |
| sort_order | int | NOT NULL DEFAULT 0 |
| parent_id | int | nullable; FK → categories (ON DELETE RESTRICT); null = top-level |

**Indexes:**
- `idx_categories_slug` — UNIQUE (slug lookups, category filter query params)
- `idx_categories_sort_order` — catalog category display order among siblings
- `idx_categories_parent_id` — hierarchy / children-by-parent lookups

**Hierarchy:** Max 2 levels (parent with `parent_id` null; subcategory whose parent is top-level). Details: `specs/features/subcategories.md`.

#### products
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| name_uk | varchar(200) | NOT NULL — Ukrainian display name (required) |
| name_en | varchar(200) | nullable — English; public API falls back to `name_uk` when empty |
| slug | varchar(200) | UNIQUE NOT NULL — shared across locales |
| description_uk | text | nullable — Ukrainian full description |
| description_en | text | nullable — English; falls back to `description_uk` when empty |
| short_description_uk | varchar(500) | nullable — Ukrainian catalog-card blurb |
| short_description_en | varchar(500) | nullable — English; falls back to `short_description_uk` when empty |
| image_url | varchar(500) | |
| image_urls | text[] | NOT NULL |
| is_active | bool | NOT NULL DEFAULT true |
| is_featured | bool | NOT NULL DEFAULT false |
| is_available | bool | NOT NULL DEFAULT true |
| strength | int | nullable; 1–5 spice heat; CHECK `ck_products_strength` |
| category_id | int | FK → categories (ON DELETE RESTRICT) |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

Price / weight live on `product_variants` (not on products). `stock_quantity` remains absent.

**Indexes:**
- `idx_products_slug` — UNIQUE (slug lookups, product detail route)
- `idx_products_category_id` — FK + filter by category
- `idx_products_is_active` — public catalog only returns active products
- `idx_products_category_id_is_active` — composite for category + active catalog queries
- `idx_products_is_featured` — `sortBy=popular` (featured first)
- `idx_products_created_at` — `sortBy=new`

#### product_variants
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| product_id | int | FK → products (ON DELETE CASCADE) |
| weight | numeric(10,3) | NOT NULL |
| weight_unit | varchar(10) | NOT NULL — `г` / `кг` / `шт` from predefined list |
| price | numeric(10,2) | NOT NULL |
| is_active | bool | NOT NULL DEFAULT true |
| sort_order | int | NOT NULL — 1-based index in predefined weight list |

No soft delete. Row exists only when admin set a price for that packaging.

**Indexes:**
- `idx_product_variants_product_id` — FK + load variants for a product
- `idx_product_variants_product_id_weight_weight_unit` — UNIQUE (one row per packaging per product; admin upsert key)

Price sort/filter and catalog `priceFrom` use MIN(active variant price); former `idx_products_price` dropped.

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
| variant_id | int | FK → product_variants (ON DELETE RESTRICT) |
| quantity | int | NOT NULL |

Product is derived via `variant → product` (no denormalized `product_id` on cart lines).

**Indexes:**
- `idx_cart_items_cart_id` — FK + load cart contents
- `idx_cart_items_variant_id` — FK
- `idx_cart_items_cart_id_variant_id` — UNIQUE (one row per variant per cart; POST `/api/cart/items` upserts quantity)

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
| password_changed_at | timestamptz | nullable — null until first password change or reset; set on change-password / reset-password |
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
Minimal schema for profile `GET /api/orders` and checkout confirmation (`GET /api/orders/:id` with capability token).

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
| delivery_method | varchar(32) | NOT NULL — `nova-poshta` \| `pickup` \| `ukrposhta` (existing rows defaulted to `nova-poshta`; legacy `city` removed) |
| comment | varchar(1000) | nullable |
| user_id | int | nullable; FK → users (ON DELETE SET NULL) — null = guest order |
| confirmation_token_hash | varchar(128) | UNIQUE NOT NULL — SHA-256 hex of opaque confirmation token (plain returned once from POST) |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:**
- `idx_orders_order_number` — UNIQUE (human-readable lookup)
- `idx_orders_confirmation_token_hash` — UNIQUE (capability lookup / integrity)
- `idx_orders_user_id` — FK + profile orders list
- `idx_orders_created_at` — newest-first ordering
- `idx_orders_user_id_created_at` — composite for `GET /api/orders` (user filter + newest first, top 20)

#### order_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| order_id | int | FK → orders (ON DELETE CASCADE) |
| product_id | int | FK → products (ON DELETE RESTRICT) — denormalized for history joins |
| variant_id | int | FK → product_variants (ON DELETE RESTRICT) |
| quantity | int | NOT NULL |
| unit_price | numeric(10,2) | NOT NULL — price snapshot from variant at place time |
| weight | numeric(10,3) | NOT NULL — weight snapshot from variant at place time |
| weight_unit | varchar(10) | NOT NULL — weight unit snapshot from variant at place time |

**Indexes:**
- `idx_order_items_order_id` — FK + item count / line items for an order
- `idx_order_items_product_id` — FK
- `idx_order_items_variant_id` — FK

#### news_posts
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| title_uk | varchar(300) | NOT NULL |
| title_en | varchar(300) | nullable — public API falls back to `title_uk` when empty |
| slug | varchar(300) | UNIQUE NOT NULL — shared across locales |
| excerpt_uk | varchar(500) | nullable |
| excerpt_en | varchar(500) | nullable — falls back to `excerpt_uk` when empty |
| body_uk | text | NOT NULL — plain multiline text (v1) |
| body_en | text | nullable — falls back to `body_uk` when empty |
| cover_image_url | varchar(500) | nullable |
| published_at | timestamptz | nullable — required when `is_published`; set to now on publish if omitted |
| is_published | bool | NOT NULL DEFAULT false |
| is_featured | bool | NOT NULL DEFAULT false |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:**
- `idx_news_posts_slug` — UNIQUE (detail route)
- `idx_news_posts_is_published_published_at` — composite `(is_published ASC, published_at DESC)` for public list filter + newest sort
- `idx_news_posts_is_featured` — featured-first sort

Details: `specs/features/news.md`.

#### shop_settings
| Column | Type | Constraints |
|--------|------|-------------|
| id | int | PK; singleton `1` (not identity) |
| ukrposhta_free_from_amount | numeric(10,2) | NOT NULL — Ukrposhta free-from threshold (UAH) |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

Seeded with `id=1`, `ukrposhta_free_from_amount=1300`.

### Migrations

| Name | Purpose |
|------|---------|
| `CatalogSchema` (`20260717155921_CatalogSchema`) | categories, products, carts, cart_items + indexes |
| `AuthSchema` (`20260719170451_AuthSchema`) | users, refresh_tokens, password_reset_tokens, user_delivery_addresses, orders, order_items; FK `carts.user_id` → users |
| `RefreshTokenFamily` (`20260719172227_RefreshTokenFamily`) | `refresh_tokens.token_family` + index for reuse detection |
| `OrderConfirmationToken` | `orders.confirmation_token_hash` UNIQUE — guest confirmation capability (hashed) |
| `SubcategoriesSchema` (`20260802140008_SubcategoriesSchema`) | `categories.parent_id` nullable self-FK (RESTRICT) + `idx_categories_parent_id` for subcategory hierarchy |
| `PasswordChangedAt` (`20260802160713_PasswordChangedAt`) | nullable `users.password_changed_at` (`timestamptz`) for profile «Остання зміна» and change/reset password flows |
| `DropProductStockQuantity` (`20260804104214_DropProductStockQuantity`) | drop `products.stock_quantity` — inventory not tracked |
| `AddProductIsAvailable` (`20260804105918_AddProductIsAvailable`) | add `products.is_available` (bool, default true) — catalog visibility vs cart purchasability |
| `I18nSchema` (`20260804125712_I18nSchema`) | bilingual content: rename product/category text columns to `*_uk`, add nullable `*_en`; shared `slug` unchanged; existing row data preserved via rename |
| `ProductVariantsSchema` (`20260804165448_ProductVariantsSchema`) | `product_variants` table; drop `products.price`/`old_price`/`weight`/`weight_unit` + `idx_products_price` (no price→variant data migration); cart lines keyed by `variant_id` (RESTRICT); order lines gain `variant_id` + weight snapshots; clears existing cart/order lines before FK retrofit |
| `DropVariantOldPrice` | drop `product_variants.old_price` — selling price only; no crossed-out / discount price |
| `NewsSchema` (`20260808161313_NewsSchema`) | `news_posts` table + indexes (`idx_news_posts_slug`, `idx_news_posts_is_published_published_at`, `idx_news_posts_is_featured`) — see `specs/features/news.md` |
| `OrderDeliveryMethod` (`20260809102500_OrderDeliveryMethod`) | `orders.delivery_method` varchar(32) NOT NULL default `nova-poshta` — checkout methods: NP / pickup / ukrposhta (no `city`) |
| `ProductStrength` (`20260815100000_ProductStrength`) | nullable `products.strength` (int) + CHECK 1–5 |
| `ShopSettings` (`20260815120000_ShopSettings`) | `shop_settings` singleton + Ukrposhta free-from amount (default 1300) |

### Connection String
```
Host=localhost;Port=5432;Database=fayno_shop;Username=fayno;Password=fayno_secret
```

Configured in `backend/FaynoShop.API/appsettings.json` as `ConnectionStrings:DefaultConnection` (local). On Railway the API uses `DATABASE_URL` from a linked Postgres service; alternatively set `ConnectionStrings__DefaultConnection`. Production refuses the localhost fallback.

---

## Data seeding

**No automatic seed.** Catalog, users, and admin accounts are created via the admin UI / registration (or manual DB inserts). Startup only runs `Database.MigrateAsync()`.

There is no `SeedDemoData` flag and no `SeedData.cs`.

---

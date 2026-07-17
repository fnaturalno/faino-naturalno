# Database Schema

## PostgreSQL 16 via EF Core 10 + Npgsql

### Naming Convention
- Tables: snake_case plural (e.g., `products`, `order_items`)
- Columns: snake_case (configured via EF Core)

### Tables

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
| image_urls | text[] | |
| stock_quantity | int | NOT NULL DEFAULT 0 |
| weight | numeric(10,3) | |
| weight_unit | varchar(10) | |
| is_active | bool | NOT NULL DEFAULT true |
| is_featured | bool | NOT NULL DEFAULT false |
| category_id | int | FK → categories |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:**
- `idx_products_slug` — UNIQUE (slug lookups)
- `idx_products_category_id` — (FK, filtering by category)
- `idx_products_is_active` — (filter active products)

#### categories
| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PK |
| name | varchar(100) | NOT NULL |
| slug | varchar(100) | UNIQUE NOT NULL |
| description | text | |
| image_url | varchar(500) | |
| sort_order | int | NOT NULL DEFAULT 0 |

#### orders, order_items, carts, cart_items, users
To be documented as migrations are created.

### Connection String
```
Host=localhost;Port=5432;Database=fayno_shop;Username=fayno;Password=fayno_secret
```

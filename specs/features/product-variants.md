# Feature: Варіанти ваги товару (product variants)

**Status:** Ready for implementation  
**Priority:** Catalog retrofit (after i18n)  
**Agent:** requirements-planner → backend + database + frontend → tester → plan-verifier → code-reviewer → security-reviewer

---

## Summary

Товар більше не має однієї ціни й ваги. Адмін задає ціни для наперед визначених фасувань (варіантів); публічний каталог показує «від» мінімальної активної ціни, сторінка товару дає вибір фасування, а кошик / checkout / замовлення працюють з `variant_id`.

## Scope

Full-stack: ASP.NET Core API + Angular UI + PostgreSQL.

### In scope

- Нова сутність варіантів ваги з ціною; видалення product-level `price` / `old_price` / `weight` / `weight_unit`.
- Публічний каталог, картки similar/featured, сторінка товару — ціна/фасування через варіанти.
- Адмін-форма товару: 7 фіксованих рядків фасування з цінами.
- Retrofit кошика, checkout і `OrderItem` на `variant_id` (+ снапшот ваги).
- Міграція схеми без конвертації існуючих цін у варіанти.
- i18n: локалізовані назви товару/категорії як зараз; одиниці ваги — рядки з API (`г`/`кг`/`шт`).

### Out of scope

- Per-variant stock, зображення, SKU.
- Bulk edit цін по каталогу.
- Окремі CRUD endpoints для варіантів.
- Переклад одиниць ваги через Transloco (v1).
- Claude Design макет (text-only; дизайн можна оновити пізніше).
- Відновлення / data migration існуючих `products.price` у варіанти.

## References

- Product overview: `SPEC.md`
- Models: `specs/models.md` (**оновити під час імплементації**)
- API conventions: `specs/api.md`
- Frontend architecture: `specs/frontend.md`
- Database schema: `specs/db.md` (**оновити під час імплементації**)
- Related (superseded single-price fields — **оновити під час імплементації**):
  - `specs/features/catalog.md`
  - `specs/features/product.md`
  - `specs/features/cart.md`
  - `specs/features/admin.md`
  - `specs/features/checkout.md`
  - `specs/features/i18n.md` (price display notes)
- Design: text-only for v1 (optional Claude Design follow-up)

---

## 1. Data & API

### 1.1 Common response envelope

Every endpoint returns:

```text
{ success: bool, data: T, error: string? }
```

Routes and envelope stay unchanged; only payloads and validation change.

### 1.2 Predefined weights (code constants, not DB)

Admin may only pick from this ordered list. `sort_order` = 1-based index in this list.

| sort_order | weight | weight_unit | Display hint |
|------------|--------|-------------|--------------|
| 1 | 10 | г | 10 г |
| 2 | 50 | г | 50 г |
| 3 | 100 | г | 100 г |
| 4 | 250 | г | 250 г |
| 5 | 500 | г | 500 г |
| 6 | 1 | кг | 1 кг |
| 7 | 1 | шт | 1 шт |

- Variant row exists in DB **only** when admin entered a price.
- Absent price = not sold (no row).
- Units are stored and returned as data strings; Transloco is not required for units in v1.

### 1.3 Schema: `product_variants`

| Column | Constraints |
|--------|-------------|
| `id` | PK |
| `product_id` | FK → products, ON DELETE CASCADE |
| `weight` | NOT NULL |
| `weight_unit` | NOT NULL |
| `price` | NOT NULL |
| `is_active` | NOT NULL, default true |
| `sort_order` | NOT NULL (from predefined list order) |

- UNIQUE (`product_id`, `weight`, `weight_unit`)
- Index on `product_id`
- No soft delete

### 1.4 Remove from `products`

Drop columns: `price`, `old_price`, `weight`, `weight_unit`.

- `stock_quantity` — **no-op** (already dropped earlier).
- **No data migration:** existing product prices/weights are discarded; not converted into default variants. Acceptable because seed data is gone / prices lost OK.

### 1.5 Availability rules (product + variant)

Keep **both** product flags and variant flag:

| Flag | Meaning |
|------|---------|
| Product `IsActive` | Admin «активний» товар |
| Product `IsAvailable` | Admin «В наявності» |
| Variant `is_active` | Фасування продається |

**Public catalog / list / featured / similar inclusion** requires all of:

1. Product `IsActive = true`
2. Product `IsAvailable = true`
3. At least one variant with a price **and** `is_active = true`

If `IsAvailable = false` (or inactive / zero active variants): product is **excluded** from public catalog (not shown as out-of-stock card). Admin can still edit it.

**Saving `IsActive = true`** requires ≥1 variant with price **and** `is_active = true`.  
**Saving `IsActive = false`** allows zero variants.

### 1.6 Delete / clear-price rules

Clearing a variant’s price in admin means **hard delete** of that DB row, **except**:

- If the variant is referenced by any `cart_items` or `order_items` → reject with BadRequest; row stays; admin must **deactivate** (`is_active = false`) instead.
- FK from cart/order lines to variants: **ON DELETE RESTRICT**.

### 1.7 CartItem retrofit

- Cart line is keyed by **variant**, not product alone.
- Replace product-only identity with `variant_id` (FK → `product_variants`, ON DELETE RESTRICT).
- Unique line per cart per variant (upsert quantity on add).
- Product is derived via variant (or denormalized only if needed for joins — prefer derive from variant for cart live data).
- Line display: localized product name + variant weight/unit; live unit price from **active** variant’s current `price`.
- Max line quantity remains **12**.

### 1.8 OrderItem retrofit

Prefer columns:

| Field | Notes |
|-------|-------|
| `ProductId` | Denormalized FK → products (ON DELETE RESTRICT) for history joins |
| `VariantId` | FK → product_variants (ON DELETE RESTRICT) |
| `UnitPrice` | Snapshot from `Variant.Price` at place time |
| `Weight` | Snapshot of variant weight at place time |
| `WeightUnit` | Snapshot of variant weight unit at place time |
| `Quantity` | unchanged |

### 1.9 Public list / card DTO changes

Drop product-level `price`, `oldPrice`, `weight`, `weightUnit`.

Add:

| Field | Semantics |
|-------|-----------|
| `priceFrom` | MIN price among **active** priced variants |
| `cheapestVariantId` | Id of that min-price active variant (tie-break: lower `sort_order`) |

- Sort `price-asc` / `price-desc` and filters `minPrice` / `maxPrice` use **MIN(active variant price)** per product.
- Catalog bounds `priceMin` / `priceMax` = min/max of those per-product mins among included catalog products.
- **No old / crossed-out price and no discount badge** — only the current selling price.

### 1.10 Public detail DTO changes

- Drop product-level price/weight fields.
- Include `variants: [{ id, weight, weightUnit, price, sortOrder }]` — **only active** variants, ordered by `sort_order`.
- Public detail does **not** need `isActive` on each variant (inactive omitted).

Product detail success still requires product `IsActive` (and for purchasability / catalog consistency: `IsAvailable` + ≥1 active variant). Products that fail catalog inclusion rules are not sold publicly (404 or equivalent consistent with current inactive handling — prefer same as inactive product).

### 1.11 Admin product payloads

- **GET** admin product: returns existing DB variants (may be inactive); UI merges onto the 7 presets (empty price where no row).
- **Save** (create/update): single product payload includes `variants` array — only entries **with a price** (subset of the 7).
  - Server upserts by (`product_id`, `weight`, `weight_unit`).
  - Presets with cleared price → hard-delete if unreferenced; BadRequest if referenced.
  - Per variant: `price`, `isActive`, weight/unit from preset, `sortOrder` from constants.
- No separate variant CRUD endpoints in v1.
- Validation:
  - `price` > 0 when present.
  - `isActive` toggle only meaningful when price is set; if no price, toggle disabled/ignored.
  - `IsActive = true` ⇒ ≥1 variant with price and `is_active = true`.

Admin list: keep active + available toggles; show **priceFrom** (min among active variants) or «—» if none. Variant count column not required.

### 1.12 Cart API

| Method | Route | Change |
|--------|-------|--------|
| POST | `/api/cart/items` | Body: `{ variantId, quantity? }` — **prefer `variantId` only** (no `productId`). Default quantity 1 from catalog CTA; product page sends stepper qty. |
| GET | `/api/cart` | Lines include `variantId`, weight/unit, live price from variant, product name/slug/image/category as today. |
| PUT / DELETE | unchanged routes | Still by cart item id; max qty 12. |

Add-to-cart rejects inactive product, unavailable product, inactive/missing variant, or quantity rules (same spirit as today).

### 1.13 Checkout / place order

- Place order creates `OrderItem` lines from current cart variants.
- Snapshot `UnitPrice` from current `Variant.Price`.
- Snapshot `Weight` + `WeightUnit` from the variant.
- Copy `ProductId` from the variant’s product.
- Stock is still not checked or reduced.

### 1.14 i18n

- Locale selection still applies to product/category names (`name_uk`/`name_en`, etc.).
- Variants have **no** translated fields.
- Catalog «від» copy via Transloco:
  - UK: `від {{price}} ₴`
  - EN: `from {{price}} ₴`
  - Use existing price number formatting style.

---

## 2. UI

### 2.1 Catalog / similar / featured cards

- Price area shows **«від {priceFrom} ₴»** / **«from {priceFrom} ₴»** (locale).
- No crossed-out old price and no discount-% badge (price is always current).
- No single weight line on the card (weight chosen via variant).
- «В кошик» adds **one unit of the cheapest active variant** (min price; tie-break: lower `sort_order`).
- Slug navigation, badges (new/featured), category eyebrow, short description — unchanged aside from price/variant fields.
- Card omitted entirely when product fails catalog inclusion rules (including `IsAvailable = false`).

### 2.2 Product page

- **Multiple active variants:** selectable table ordered by `sort_order`; columns enough to show weight label, price, optional old price; rows selectable.
- **Cheapest active variant preselected** (min price; tie-break `sort_order`).
- **Single active variant:** plain text (weight + price), not a table.
- **Mobile:** multi-variant table supports horizontal scroll.
- Inactive variants hidden.
- Quantity stepper + «В кошик» add the **selected** variant × quantity (max 12).
- Packaging / price UI previously tied to product weight is driven by the selected variant.

### 2.3 Cart / checkout UI

- Each line shows product name (localized), variant weight label (`{weight} {weightUnit}`), live unit price, qty, line total.
- Checkout summary and order confirmation / admin order detail show snapshot unit price and weight label from order line snapshots.
- Public add-to-cart remains working end-to-end after retrofit.

### 2.4 Admin product form

- Always show **all 7** predefined rows (fixed list).
- Per row: price input, `is_active` toggle.
- Empty price = no DB row; filled = upsert on save.
- `is_active` disabled/ignored when price empty.
- Clearing price on save deletes unreferenced row; if referenced → error (admin deactivates instead).
- Product-level single price / weight / weight-unit / old-price fields removed.
- Keep `IsActive`, `IsAvailable`, `IsFeatured`, i18n name/description fields, images, category.

### 2.5 Admin products list

- Show `priceFrom` (min active) formatted as currency, or «—» if no active priced variants.
- Keep existing active and available toggles and other list behavior.

---

## 3. States & transitions

### Loading

- Catalog / product / cart / admin use existing loading patterns for those surfaces.

### Empty

- Catalog empty when filters yield no products (including when no products have active variants).
- Product with no active variants is not publicly listed; admin may still open it with empty prices on all 7 rows.
- Empty cart unchanged.

### Error

- Failed add-to-cart / save product / clear referenced variant: error message / toast consistent with existing surfaces; no silent success.
- Referenced-variant delete attempt: BadRequest with clear message that deactivation is required.

### Persistence

- Cart lines persist by `variant_id` across navigation (session / user rules unchanged).
- Locale preference unchanged (i18n feature).

---

## 4. Feedback & notifications

- Successful catalog/product add-to-cart: existing success feedback («Додано» / badge update).
- Failed mutations: existing error toast pattern.
- Admin save success/error: existing admin toasts.
- Notifications auto-dismiss per existing app behavior.

---

## 5. Edge cases

- Long product names: unchanged truncation/wrapping rules from catalog/product/cart.
- At most 7 variants per product (predefined list); no pagination of variants.
- Guest and authenticated carts both use `variantId`.
- Merging guest cart after login merges by **variant** identity (same variant → sum qty capped at 12).
- If a variant becomes inactive / deleted after it was in the cart: line is non-purchasable; place order / qty update follows existing inactive-line spirit (block purchase; allow remove). Prefer consistent messaging with inactive product lines.
- Price changes after add: cart shows **live** variant price; order snapshots at place time.
- Discount % always from the min-price active variant used for «від», even if another variant has a larger %.
- Permission: public read/add for included products; admin mutations require `IsAdmin`.
- `мл` / `л` are **not** in the predefined list for variants v1 (only г/кг/шт).

---

## 6. Retrofit impact (implementation must update)

This feature **supersedes** single-price / single-weight assumptions in:

| Doc | What changes |
|-----|----------------|
| `specs/models.md` | Product drops price/weight; add ProductVariant; CartItem/OrderItem gain VariantId (+ weight snapshots on OrderItem) |
| `specs/db.md` | `product_variants` table; drop product price columns; cart_items/order_items FKs; drop obsolete `idx_products_price` in favor of variant-based price queries |
| `specs/features/catalog.md` | `priceFrom`, «від», cheapest-variant add, inclusion requires IsAvailable + active variants |
| `specs/features/product.md` | variants table/selection; cart by variantId |
| `specs/features/cart.md` | lines by variant; display weight from variant |
| `specs/features/checkout.md` | OrderItem snapshots from variant |
| `specs/features/admin.md` | 7-row variant editor; list `priceFrom` |
| `specs/features/i18n.md` | price copy «від»/«from»; units remain data strings |

**Note:** Older feature docs that said catalog shows OOS cards when `IsAvailable = false` are overridden here: unavailable products are **excluded** from public catalog for simplicity.

---

## Acceptance Criteria

### Data & migration

- [ ] `product_variants` exists with required columns, UNIQUE (`product_id`, `weight`, `weight_unit`), index on `product_id`, cascade delete with product.
- [ ] Product columns `price`, `old_price`, `weight`, `weight_unit` are dropped without converting rows to variants.
- [ ] `stock_quantity` is not reintroduced (already absent).
- [ ] Predefined weights match the 7 constants and drive `sort_order`.
- [ ] Clear price hard-deletes unreferenced variants; referenced variants return BadRequest and remain until deactivated.
- [ ] CartItem uses `variant_id` (RESTRICT); OrderItem has `ProductId` + `VariantId` + `UnitPrice` + `Weight` + `WeightUnit` snapshots.

### Public catalog & cards

- [ ] Only products with `IsActive`, `IsAvailable`, and ≥1 active priced variant appear in catalog/similar/featured.
- [ ] Cards show Transloco «від {{price}} ₴» / «from {{price}} ₴» using `priceFrom`.
- [ ] Price sort/filter and catalog price bounds use MIN(active variant price).
- [ ] No old price / discount badge on cards.
- [ ] Card «В кошик» adds the cheapest active variant (qty 1).

### Product page

- [ ] Active variants listed by `sort_order`; cheapest preselected.
- [ ] Single active variant renders as plain text; multiple as selectable table with mobile horizontal scroll.
- [ ] Inactive variants are hidden; add-to-cart uses selected `variantId` and qty ≤ 12.

### Admin

- [ ] Form always shows 7 preset rows; fill creates/upserts, clear deletes (or errors if referenced).
- [ ] Per-row price and is_active; toggle ignored without price.
- [ ] `IsActive = true` requires ≥1 priced **and** active variant; `IsActive = false` allows zero variants.
- [ ] List shows `priceFrom` or «—»; active and available toggles remain.
- [ ] Single product save payload includes `variants` array; no separate variant CRUD.

### Cart / checkout

- [ ] `POST /api/cart/items` accepts `{ variantId, quantity? }` only (no productId required).
- [ ] Cart lines display localized name + variant weight/unit + live variant price.
- [ ] Place order snapshots unit price and weight/unit from the variant; keeps ProductId + VariantId.
- [ ] Max line quantity remains 12; public add-to-cart works end-to-end.

### i18n & scope

- [ ] Product/category locale resolution unchanged; variants have no translated fields.
- [ ] Weight units returned/displayed as API strings (`г`/`кг`/`шт`).
- [ ] No per-variant stock/images/SKUs; no bulk price edit; no separate variant endpoints.

# Feature: Адмін-панель

**Status:** Ready for implementation  
**Priority:** 6  
**Agent:** requirements-planner → backend + database + frontend → tester → plan-verifier → code-reviewer → security-reviewer

---

## Summary

Адмін-панель дозволяє користувачу з `IsAdmin` керувати товарами (список, створення, редагування, видалення / деактивація), категоріями та замовленнями (список, деталі, зміна статусу) в оболонці з лівою навігацією згідно з макетом.

## Scope

Full-stack: ASP.NET Core API + Angular UI + PostgreSQL data access.

### In scope

- Захищена зона `/admin/*`: JWT + `IsAdmin`; неадмін / гість — redirect або forbidden.
- Оболонка адмінки: лівий сайдбар, топбар з іменем адміна, мобільний вигляд списку товарів.
- Товари: список з пошуком / фільтром / пагінацією, toggle активності, створення, редагування, видалення.
- Форма товару: поля моделі Product (назва, slug, категорія, описи, ціна, стара ціна, вага/одиниця, залишок, зображення URL(и), IsActive, IsFeatured).
- Категорії: список, створення / редагування в drawer, видалення.
- Замовлення: список усіх з пошуком / фільтром статусу, drawer деталей, зміна статусу.
- Український copy з `design/admin.dc.html`.
- Спільний `ApiResponse` envelope; admin-операції за контрактами `specs/api.md` (і уточненнями нижче).

### Out of scope

- Повний analytics / KPI dashboard (поза тим, що є в макеті — у макеті дашборду немає).
- CMS, блог, email-маркетинг, розсилки.
- Ролі адміністраторів ширші за один bool `IsAdmin`.
- Імперсонація клієнта / перегляд як покупець.
- Платіжний шлюз, промокоди, зміна складу замовлення після оформлення.
- Публічний каталог / чекаут / кошик (вже в інших фічах).
- Multi-tenant, audit log UI, bulk import/export.

## References

- Claude Design: `design/admin.dc.html` (products list, product form, orders, categories, drawers, mobile products)
- Design system: `design/_ds/faino-naturalno-design-system-69873b7b-f6fd-41c1-a506-a953191d246d/`
- Product overview: `SPEC.md` (пріоритет 6 — CRUD товарів та замовлень)
- Models: `specs/models.md` (Product, Category, Order, OrderItem, User.IsAdmin)
- API conventions: `specs/api.md` (Admin products / categories / admin orders)
- Frontend architecture: `specs/frontend.md` (`/admin`, `/admin/products`, `/admin/orders`)
- Database schema: `specs/db.md` (products, categories, orders)
- Related: `specs/features/auth.md` (JWT, logout, `IsAdmin` у профілі)
- Related: `specs/features/checkout.md` (статуси замовлення, поля Order)
- Related: `specs/features/catalog.md`, `specs/features/product.md` (публічні поля товару)

---

## 1. Data & API

### 1.1 Common response envelope

Every endpoint returns:

```text
{ success: bool, data: T, error: string? }
```

- A successful response has `success: true`, populated `data`, and no error.
- A failed response has `success: false`, an appropriate `error`, and no usable data.

### 1.2 Auth requirement

- All admin mutations and admin order endpoints require a valid JWT whose user has `IsAdmin = true`.
- Missing / invalid JWT → unauthorized.
- Valid JWT but `IsAdmin = false` → forbidden (no data leak of admin payloads).
- Public catalog `GET /products` / `GET /categories` remain public; admin UI may reuse them where they already satisfy the need, with the rules below for inactive products.

### 1.3 Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/products` | — / Admin | List products (admin list includes inactive when requested / authorized) |
| GET | `/api/products/:slug` or by id | Admin | Load one product for the edit form |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Delete product |
| GET | `/api/categories` | — | List categories (reuse for selects and categories screen) |
| POST | `/api/categories` | Admin | Create category |
| PUT | `/api/categories/:id` | Admin | Update category |
| DELETE | `/api/categories/:id` | Admin | Delete category |
| GET | `/api/admin/orders` | Admin | All orders (paginated / filterable) |
| GET | `/api/admin/orders/:id` | Admin | Order detail for the drawer (lines + customer + delivery) |
| PUT | `/api/admin/orders/:id/status` | Admin | Update order status |

Existing auth endpoints reused, not redefined:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/auth/me` | Current user name / initials / `IsAdmin` for topbar |
| POST | `/api/auth/logout` | Sidebar «Вихід» |

### 1.4 Admin product list (`GET /api/products`)

Query (aligned with catalog + admin needs):

- `search` — name / slug text search
- `category` — category slug or id filter («Усі категорії» = omit)
- `page`, `pageSize` — pagination (default page size sensible for the table, e.g. 10–12)
- Admin-authorized requests must be able to see **inactive** products (e.g. `includeInactive=true` honored only for Admin, or admin default includes inactive)

Each row exposes at least:

- `id`, `name`, `slug`, category name, `price`, `stockQuantity`, `isActive`
- Primary image URL when available
- Enough to drive the active/hidden toggle and edit / delete actions

Response includes total count (or equivalent) so the UI can show «Показано X–Y з Z».

### 1.5 Create / update product

Request body fields matching the Product model:

- `name` (required)
- `slug` — unique URL-friendly; may be auto-generated from name on create / when name changes, editable only if the API allows override (UI shows auto-generated preview `/catalog/{slug}`)
- `categoryId` (required)
- `shortDescription`, `description`
- `price` (required, > 0), optional `oldPrice`
- `weight`, `weightUnit` (`г` / `кг` / `мл` / `л` as in the design; model also allows `шт` if needed)
- `stockQuantity` (≥ 0)
- `imageUrl` (primary) and `imageUrls` (gallery); first / primary is the main catalog image
- `isActive`, `isFeatured`

Server rules:

- Unique slug; conflict → clear Ukrainian-facing error.
- Invalid category → fail.
- On success, return the saved product (enough to leave the form or refresh the list).

### 1.6 Delete product

- `DELETE /api/products/:id` removes the product (hard delete) when allowed by DB constraints (e.g. not referenced in a blocking way; if order history holds `ProductId` with RESTRICT, deletion may fail — then surface a clear error and prefer deactivation via `isActive`).
- Soft hide for catalog is **`isActive = false`** (toggle), not delete.

### 1.7 Quick toggle active

- Updating only `isActive` (from the list toggle) uses `PUT /api/products/:id` (or an equivalent partial update) and does not require opening the form.
- No confirmation dialog for activate / hide.

### 1.8 Categories

- List: id, name, slug, optional description, product count (for the «Товарів» column), optional display accent/icon if already part of seed/UI (not a new CMS).
- Create / update: `name` (required), auto `slug`, optional `description`.
- Delete: fails if the category still has products (DB RESTRICT) with a clear Ukrainian error; otherwise removes the category.
- Sort order may keep existing defaults; reordering UI is not required by the design.

### 1.9 Admin orders

#### `GET /api/admin/orders`

- Returns all orders (guest and user), newest first by default.
- Query: `search` (order number and/or customer name / phone), `status` (enum filter; «Усі статуси» = omit), `page`, `pageSize`.
- Each row: order number, created date, recipient name, phone, city (from delivery summary when possible), total, status.

#### `GET /api/admin/orders/:id`

- Full detail for the drawer: order number, date, status, recipient name / phone / email, delivery address (city + branch text), optional comment, line items (name, qty, unit price, line sum, image when available), `totalAmount`.
- Unknown id → not-found style failure.

#### `PUT /api/admin/orders/:id/status`

- Body: new `status` from enum: `Pending` | `Confirmed` | `Shipped` | `Delivered` | `Cancelled`.
- Allowed transitions (default): forward along Pending → Confirmed → Shipped → Delivered; from Pending or Confirmed (and optionally Shipped) to Cancelled; no revival from Cancelled or Delivered except as explicitly allowed (default: Delivered and Cancelled are terminal).
- Invalid transition → error with clear message; status unchanged.
- Does not edit line items or totals.

### 1.10 Status labels (Ukrainian UI ↔ enum)

| Enum | UI label (admin design) |
|------|-------------------------|
| Pending | Новий |
| Confirmed | В обробці |
| Shipped | Відправлено |
| Delivered | Доставлено |
| Cancelled | Скасовано |

Badge tones follow the design language (e.g. ink / marigold / fresh / sale).

### 1.11 Loading and refresh

- Entering each admin screen loads fresh list data (no long-lived stale cache required).
- After successful create / update / delete / status change, the relevant list or drawer refreshes from the mutation response or a refetch.
- Opening the product form loads the product (edit) or empty defaults (create); categories for the select load when needed.

---

## 2. UI

### 2.1 Surfaces and routes

| Surface | Behavior |
|---------|----------|
| `/admin` | Redirects to `/admin/products` (no separate dashboard) |
| `/admin/products` | Products table (desktop) / card list (mobile) |
| `/admin/products/new` | Product create form in the admin shell |
| `/admin/products/:id/edit` | Product edit form |
| `/admin/orders` | Orders table + detail drawer |
| `/admin/categories` | Categories table + create/edit drawer |

All routes are admin-only. Public shop chrome (catalog navbar / cart) is not the primary chrome here — the admin shell replaces it.

### 2.2 Shell (desktop)

- Left sidebar (~240px), espresso background: logo, nav items «Товари», «Замовлення», «Категорії», bottom «Вихід».
- Active nav item highlighted (marigold) as in the design.
- Top bar: page title; admin display name + «Адміністратор» + initials avatar.
- Main content scrolls independently.

### 2.3 Shell (mobile — products)

- Compact top bar (espresso): menu control, title «Товари», initials avatar.
- Search + «+» add button.
- Vertical list of product cards: thumbnail, name, «категорія · ціна ₴», active toggle.
- Menu opens navigation to Orders / Categories / Logout (same destinations as sidebar).

### 2.4 Products list (desktop)

Toolbar:

- Search placeholder «Пошук товару…»
- Category select: «Усі категорії» + category names
- Primary CTA «+ Додати товар»

Table columns: thumbnail, «Назва» (+ slug subtitle), «Категорія», «Ціна», «Залишок», «Статус» (active toggle + «Активний» / «Прихований»), «Дії» (edit pencil, delete trash).

Stock color cues: zero → danger; low (&lt; 10) → warning; else → success green (as in the design).

Pagination: «Показано A–B з N» + page controls.

### 2.5 Product form

Breadcrumb: «Товари / {назва або Новий товар}» with back control to the list.

Left column sections:

- **Основне** — «Назва товару»; slug preview «URL (slug) — генерується автоматично» (`/catalog/…`); «Категорія» select
- **Опис** — «Короткий опис»; «Повний опис» textarea
- **Ціна та наявність** — «Ціна, ₴»; «Стара ціна, ₴ (необов.)»; «Вага / обʼєм»; «Одиниця» (г/кг/мл/л); «Залишок на складі»

Right column:

- **Зображення** — drop zone copy «Перетягніть фото сюди» / «або натисніть, щоб обрати · JPG, PNG до 5 МБ»; gallery thumbs with «головне» on the first; hint «Перетягніть, щоб змінити порядок. Перше — головне.» Images are stored as URL(s) (upload producing a URL, or equivalent URL management that matches the gallery UX).
- **Налаштування** — toggles «Активний» («Показувати в каталозі»), «Рекомендований» («Виділити на головній»)
- Actions: «Зберегти», «Скасувати»

### 2.6 Orders list

Toolbar:

- Search «Пошук за номером чи клієнтом…»
- Status filter: «Усі статуси» + the five Ukrainian labels above

Table columns: «№», «Дата», «Клієнт», «Телефон», «Місто», «Сума», «Статус» (badge). Rows are clickable.

### 2.7 Order detail drawer

- Header: order number + date; close control.
- Status badge row.
- **Клієнт** block: name, phone, city + branch (delivery text).
- **Склад замовлення**: lines with thumb, name, «qty × price», line sum; «Разом».
- Footer: «Змінити статус», «Закрити».
- «Змінити статус» opens a status picker (select / sheet) constrained to allowed transitions; on success the badge updates.

### 2.8 Categories

- Count line with Ukrainian plural («N категорія / категорії / категорій»).
- CTA «+ Додати категорію».
- Table: icon/accent, «Назва», «URL (slug)», «Товарів», edit / delete.
- Drawer: «Нова категорія» / «Редагувати категорію»; fields name, auto slug preview (`/catalog?category=`), optional description; «Зберегти» / «Скасувати».

### 2.9 Visual language and copy

- Warm kraft / espresso / marigold language from the design system.
- Currency: ₴.
- All admin-facing strings Ukrainian as in the design.

---

## 3. Interactions

### 3.1 Access control

- Unauthenticated visit to `/admin/*` → redirect to login (auth flow), then return to the intended admin URL when `IsAdmin`.
- Authenticated non-admin → forbidden page or redirect to `/` / `/catalog` (no admin shell flash of data).
- Sidebar «Вихід» logs out and leaves the admin area (e.g. home or auth).

### 3.2 Products

- «+ Додати товар» / mobile «+» → create form.
- Pencil → edit form for that product.
- Trash → **confirmation** before delete (design shows trash; confirm is required even if the canvas has no modal — e.g. «Видалити товар?» with confirm / cancel).
- Active toggle on the row updates `isActive` immediately (no confirm).
- Search and category filter update the list (debounce search ~300ms acceptable).
- Pagination changes page without leaving the screen.

### 3.3 Product form

- Back / «Скасувати» → products list without saving.
- «Зберегти» validates required fields, then create or update; on success return to the list (or stay with success toast — prefer return to list).
- Changing name may refresh the suggested slug until the product is saved (create) or until slug is considered locked after first save (edit) — keep slug unique and stable after create unless the API allows rename.
- Image reorder: first becomes primary (`imageUrl`); removing images updates the gallery.
- Concurrent double-submit prevented while save is in flight.

### 3.4 Orders

- Row click opens the detail drawer; backdrop or «Закрити» / Escape closes it.
- «Змінити статус» → choose allowed next status → persist → update list row + drawer badge.
- Search and status filter update the list.

### 3.5 Categories

- «+ Додати категорію» / pencil → drawer; backdrop / close / «Скасувати» dismiss without save when unchanged or after cancel.
- «Зберегти» creates or updates then closes the drawer and refreshes the list.
- Trash → **confirmation** before delete; blocked delete shows error toast / message when products still use the category.

### 3.6 Navigation

- Sidebar switches between products, orders, categories; product form keeps «Товари» nav active.
- Deep links to edit / new work when the user is an admin.

---

## 4. States and transitions

### Initial loading

- Lists show a table / list skeleton (or equivalent) until data arrives.
- Form edit shows skeleton fields until the product loads.

### Empty lists

- Products: empty message + CTA «+ Додати товар» (Ukrainian, coherent with shop tone).
- Orders: empty message when no orders match filters.
- Categories: empty + «+ Додати категорію».

### GET failure

- Inline Ukrainian error with «Спробувати ще» on the list / form load.

### Mutation pending

- Primary save / status / delete controls disabled with waiting indicator; prevent duplicate submits.

### Validation

- Required product fields (name, category, price, stock ≥ 0) show inline errors.
- Invalid numbers / negative stock → field errors.
- Category name required in the drawer.

### Delete / status failure

- Stay on the screen; toast or inline error; data unchanged.

### Persistence

- Admin list filters need not survive a full browser refresh (acceptable default).
- Saved products / categories / order statuses persist on the server and reflect in the public shop according to `isActive` / featured rules.

---

## 5. Feedback

- Successful product create / update: toast e.g. «Товар збережено» (or equivalent short Ukrainian).
- Successful product delete: toast e.g. «Товар видалено».
- Successful active toggle: no toast required; label «Активний» / «Прихований» updates in place.
- Successful category save / delete: short success toast.
- Successful order status change: short success toast (e.g. «Статус оновлено»).
- Failures: toast with API `error` when suitable, otherwise a generic Ukrainian failure string.
- Toasts auto-dismiss after approximately **3 seconds** (same timing as cart / catalog / product / checkout).
- Destructive confirmations are modal / dialog, not toasts.
- Toasts announce without stealing focus.

---

## 6. Edge cases

- Long product / customer names truncate with ellipsis in tables; full value via title/tooltip.
- Large catalogs: server pagination only; no unbounded client-side load of all products.
- Stock `0` still allows an active product (shown as hidden from purchase by catalog/checkout rules elsewhere); admin sees chili-colored stock.
- Missing images use kraft / «фото» placeholder.
- Slug collision on save → error; admin corrects name/slug.
- Delete product blocked by FK (e.g. order lines) → error; admin can set `isActive = false` instead.
- Delete category with products → error; must reassign or empty first.
- Order status: cannot move Delivered → Pending; cannot un-cancel by default.
- Guest orders appear in the admin list the same as user orders.
- Non-admin JWT must never receive admin order PII.
- Rapid double-click on save / delete / status results in a single in-flight request.
- Mobile menu and drawers remain usable on narrow viewports; order/category drawers full-width or near-full on small screens.
- Accessibility: labeled inputs, keyboard-operable table actions and drawers, meaningful names for icon-only edit/delete/back/close, confirm dialogs focus-trapped.
- Image files over 5 MB or wrong type rejected with a clear message when upload is used.
- Weight unit options match the form; stored `weightUnit` consistent with public product display.

---

## Acceptance Criteria

### Auth and access

- [ ] `/admin/*` requires JWT with `IsAdmin`; guests redirect to login; non-admins are forbidden / redirected without admin data.
- [ ] Sidebar «Вихід» logs out and leaves the admin area.
- [ ] Top bar shows the current admin’s name (and initials) from auth/me.

### Products

- [ ] Admin can list products (including inactive) with search, category filter, pagination, and «Показано A–B з N».
- [ ] Admin can create and edit products with fields from the Product model (name, slug, category, descriptions, price/oldPrice, weight/unit, stock, images, isActive, isFeatured).
- [ ] List toggle updates `isActive` without confirmation; delete requires confirmation.
- [ ] `POST` / `PUT` / `DELETE` `/api/products` (Admin) use the common API envelope; slug uniqueness and validation errors are clear.
- [ ] Ukrainian copy and layout match the products list + form design (desktop) and mobile product list.

### Categories

- [ ] Admin can list, create, edit, and delete categories; delete confirms and fails safely when products remain.
- [ ] Category drawer fields and copy match the design; slug is auto-generated for display.

### Orders

- [ ] `GET /api/admin/orders` lists all orders with search and status filter; rows show number, date, customer, phone, city, total, status.
- [ ] Order drawer shows customer, delivery, lines, and total; «Змінити статус» updates via `PUT /api/admin/orders/:id/status` with enum Pending→Confirmed→Shipped→Delivered and Cancelled rules.
- [ ] Ukrainian status labels match the design mapping table.

### States and feedback

- [ ] Loading skeletons, empty states, inline load errors with retry, validation errors, and ~3s toasts behave as specified.
- [ ] Destructive deletes use confirmation; status/active toggles do not.

### Scope

- [ ] No analytics dashboard, CMS, email marketing, multi-admin roles, or customer impersonation.
- [ ] Feature is priority 6 admin CRUD for products, categories, and orders only.

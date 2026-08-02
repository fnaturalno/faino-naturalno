# Feature: Адмін-панель

**Status:** Implemented  
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
- Товари: список з пошуком / фільтром / пагінацією (номери сторінок), switch-toggle активності, іконки edit/delete, мобільні картки; створення, редагування, видалення.
- Форма товару: поля моделі Product (назва, slug, категорія, описи, ціна, стара ціна, вага/одиниця, залишок, зображення URL(и), IsActive, IsFeatured).
- Категорії: ієрархічний список (expand/collapse, підкатегорії), створення / редагування в drawer, видалення; деталі в `specs/features/subcategories.md`.
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
| GET | `/api/products` | — / Admin | List products (`includeInactive=true` honored only for Admin; `category` = slug) |
| GET | `/api/products/:id` | Admin | Load one product for the edit form |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Full update product |
| PUT | `/api/products/:id/active` | Admin | Toggle `isActive` only (list quick toggle) |
| DELETE | `/api/products/:id` | Admin | Delete product |
| GET | `/api/categories` | — / Admin | List categories (product count; admin includes inactive) |
| POST | `/api/categories` | Admin | Create category |
| PUT | `/api/categories/:id` | Admin | Update category |
| DELETE | `/api/categories/:id` | Admin | Delete category |
| GET | `/api/admin/orders` | Admin | All orders (paginated / filterable) |
| GET | `/api/admin/orders/:id` | Admin | Order detail for the drawer (lines + customer + delivery) |
| PUT | `/api/admin/orders/:id/status` | Admin | Update order status |
| POST | `/api/admin/uploads/images` | Admin | Upload product image (multipart `file`) → relative `/uploads/products/...` URL |

Existing auth endpoints reused, not redefined:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/auth/me` | Current user name / initials / `IsAdmin` for topbar |
| POST | `/api/auth/logout` | Sidebar «Вихід» |

### 1.4 Admin product list (`GET /api/products`)

Query (aligned with catalog + admin needs):

- `search` — name / slug text search
- `category` — category **slug** filter («Усі категорії» = omit); UI sends slug, not id
- `page`, `pageSize` — pagination (default page size sensible for the table, e.g. 10–12)
- Admin-authorized requests must be able to see **inactive** products via `includeInactive=true` (ignored / forced false for non-admin)

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

Images are uploaded separately before save:

- `POST /api/admin/uploads/images` with multipart field `file`
- Allowed: JPG / PNG; max **5 MB**; magic-byte validated on the server
- Response `data.url` is a relative path `/uploads/products/{file}` stored on the product and served as a static file from the API `wwwroot`
- Clients resolve `/uploads/...` against the API base URL when rendering `<img>`

Server rules:

- Unique slug; conflict → clear Ukrainian-facing error.
- Invalid category → fail.
- On success, return the saved product (enough to leave the form or refresh the list).

### 1.6 Delete product

- `DELETE /api/products/:id` removes the product (hard delete) when allowed by DB constraints (e.g. not referenced in a blocking way; if order history holds `ProductId` with RESTRICT, deletion may fail — then surface a clear error and prefer deactivation via `isActive`).
- Soft hide for catalog is **`isActive = false`** (toggle), not delete.

### 1.7 Quick toggle active

- Updating only `isActive` (from the list toggle) uses `PUT /api/products/:id/active` with body `{ isActive: bool }` — does **not** send a full product payload (avoids clearing description / gallery).
- No confirmation dialog for activate / hide.

### 1.8 Categories

- Hierarchy: optional `parentId` (2 levels only) — see `specs/features/subcategories.md`.
- List: nested tree (id, name, slug, `parentId`, `children`, product count, optional description).
- Create / update: `name` (required), auto `slug`, optional `description`, optional `parentId` (top-level parent only).
- Delete: fails if the category still has **products or children** (clear Ukrainian error); otherwise removes the category.
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

All routes are admin-only. The **admin shell** (sidebar + top bar) is the primary chrome for admin screens, but the **public main navbar** remains visible above it so the admin can navigate to the shop (Каталог, Про нас, Контакти, Кошик, Профіль) without leaving via «Вихід».

### 2.2 Shell (desktop)

- Above the admin layout: the shared shop `NavbarComponent` (same as catalog) — including «Адмін» as the active-area entry when already in admin.
- Left sidebar (~240px), espresso background: logo, nav items «Товари», «Замовлення», «Категорії», link «Магазин» → `/catalog`, bottom «Вихід».
- Active admin nav item highlighted (marigold) as in the design.
- Top bar: page title; admin display name + «Адміністратор» + initials avatar.
- Main content scrolls independently.

### 2.3 Shell (mobile — products)

- Shared shop navbar remains at the top (main menu via its hamburger).
- Compact admin top bar: menu control for admin sections, title «Товари», initials avatar.
- On the products page itself (mobile viewport): card list matching `design/admin.dc.html` mobile — thumbnail, name, «категорія · ціна ₴», switch toggle for active, pencil edit.
- Admin menu opens navigation to Orders / Categories / Logout (same destinations as sidebar).

### 2.4 Products list

Matches `design/admin.dc.html` products view:

**Toolbar**

- Search with leading search icon; placeholder «Пошук товару…» (debounce ~300ms acceptable).
- Category select: «Усі категорії» + parents and indented subcategories (slug values); chevron affordance.
- Primary CTA «+ Додати товар» aligned to the trailing edge (marigold).

**Desktop / tablet table**

- Card surface: cream header (`fn-eyebrow`), white rows, hover cream; columns `64px | 1fr | 130px | 100px | 90px | 130px | 100px`.
- Thumbnail 48×48 (kraft placeholder «фото» when missing).
- «Назва» bold + slug subtitle (muted, truncated).
- «Категорія», «Ціна» (`N ₴`, accent weight), «Залишок» with stock colors (0 → chili; &lt; 10 → cinnamon; else garden).
- «Статус»: **switch toggle** (garden when on, kraft when off) + label «Активний» / «Прихований» — not text-only bullets.
- «Дії»: icon buttons (`ad-act`) — pencil edit, trash delete (danger hover).

**Pagination**

- «Показано A–B з N» (muted).
- Controls: chevron prev/next + numbered page buttons (active page espresso fill); window of up to ~5 page numbers.

**Mobile cards** (below `md`)

- Vertical cards: thumb, name, «категорія · ціна ₴», compact active switch, edit icon (delete available on desktop table; confirm flow still required when deleting).

### 2.5 Product form

Breadcrumb: «Товари / {назва або Новий товар}» with back control to the list.

Left column sections:

- **Основне** — «Назва товару»; slug preview «URL (slug) — генерується автоматично» (`/catalog/…`); «Категорія» select
- **Опис** — «Короткий опис»; «Повний опис» textarea
- **Ціна та наявність** — «Ціна, ₴»; «Стара ціна, ₴ (необов.)»; «Вага / обʼєм»; «Одиниця» (г/кг/мл/л); «Залишок на складі»

Right column:

- **Зображення** — drop zone «Перетягніть фото сюди» / «або натисніть, щоб обрати · JPG, PNG до 5 МБ»; uploads via `POST /api/admin/uploads/images`; gallery thumbs with «головне» on the first; drag to reorder (first = primary `imageUrl`); remove control per thumb. Wrong type / over 5 MB rejected with a clear Ukrainian message.
- **Налаштування** — toggles «Активний» («Показувати в каталозі»), «Рекомендований» («Виділити на головній»)
- Actions: «Зберегти», «Скасувати»

### 2.6 Shop chrome

- Public navbar shows «Адмін» linking to `/admin` only when the signed-in user has `IsAdmin` (desktop + mobile menu). Non-admins never see the link.
- Inside `/admin/*`, the same public navbar stays visible so the admin can open Каталог / Профіль / Кошик without logging out.

### 2.7 Orders list

Toolbar:

- Search «Пошук за номером чи клієнтом…»
- Status filter: «Усі статуси» + the five Ukrainian labels above

Table columns: «№», «Дата», «Клієнт», «Телефон», «Місто», «Сума», «Статус» (badge). Rows are clickable.

### 2.8 Order detail drawer

- Header: order number + date; close control.
- Status badge row.
- **Клієнт** block: name, phone, city + branch (delivery text).
- **Склад замовлення**: lines with thumb, name, «qty × price», line sum; «Разом».
- Footer: «Змінити статус», «Закрити».
- «Змінити статус» opens a status picker (select / sheet) constrained to allowed transitions; on success the badge updates.

### 2.9 Categories

Matches `design/admin.dc.html` and `specs/features/subcategories.md` §2.3:

- Count: «N категорія|… (з підкатегоріями)» for all nodes.
- CTA «+ Додати категорію».
- Tree table: expand/collapse parents, accent icon, subcategory count pill, columns Назва / URL (slug) / Товарів / Дії.
- Parent actions: add subcategory (+), edit, delete; child actions: edit, delete.
- Child rows indented under expanded parent; cream background; path `/parent/child`.
- Drawer: «Нова / Редагувати категорію|підкатегорію»; «Батьківська категорія» («— Коренева категорія —» + hint); name; auto slug `/catalog?category=`; optional description; «Зберегти» / «Скасувати».

### 2.10 Visual language and copy

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

- «+ Додати категорію» → new root drawer; parent-row **+** → new subcategory drawer with parent pre-selected.
- Chevron expands/collapses children; pencil opens edit drawer; trash → **confirmation** before delete.
- Backdrop / close / «Скасувати» dismiss without save when cancelled.
- «Зберегти» creates or updates then closes the drawer and refreshes the tree.
- Blocked delete (products or children) shows error toast / message from the API.

### 3.6 Navigation

- Sidebar switches between products, orders, categories; product form keeps «Товари» nav active.
- Public main navbar on admin pages navigates to Каталог / Профіль / Кошик; sidebar «← Магазин» also goes to `/catalog`.
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
- [ ] Public navbar «Адмін» is visible only to `IsAdmin` users and links to `/admin`.
- [ ] On `/admin/*` the public main navbar remains visible for shop navigation (Каталог and other main links).

### Products

- [ ] Admin can list products (including inactive) with search, category **slug** filter (parents + subs), pagination «Показано A–B з N», and numbered page controls.
- [ ] Admin can create and edit products with fields from the Product model (name, slug, category, descriptions, price/oldPrice, weight/unit, stock, images, isActive, isFeatured).
- [ ] Product images are uploaded via `POST /api/admin/uploads/images` (JPG/PNG ≤ 5 MB); gallery supports reorder and remove; first image is primary.
- [ ] List **switch** toggle updates `isActive` via `PUT /api/products/:id/active` without confirmation; delete requires confirmation (icon trash).
- [ ] `POST` / `PUT` / `DELETE` `/api/products` (Admin) use the common API envelope; slug uniqueness and validation errors are clear.
- [ ] Ukrainian copy and layout match `design/admin.dc.html` products list (desktop table + mobile cards) and the product form.

### Categories

- [ ] Admin can list, create, edit, and delete categories (and subcategories); tree UI matches `design/admin.dc.html` (expand, icons, + subcategory, paths).
- [ ] Category drawer fields and copy match the design (parent select «Коренева», titles for підкатегорія); slug is auto-generated for display.
- [ ] Delete confirms and fails safely when products or child categories remain.

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

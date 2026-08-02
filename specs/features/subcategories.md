# Feature: Підкатегорії

**Status:** Implemented  
**Priority:** 7  
**Agent:** requirements-planner → backend + database + frontend → tester → plan-verifier → code-reviewer → security-reviewer

---

## Summary

Категорії товарів отримують дворівневу ієрархію (батьківська категорія → підкатегорії) для каталожних фільтрів, лічильників і адмін-CRUD, без окремої сутності Subcategory.

## Scope

Full-stack: ASP.NET Core API + Angular UI + PostgreSQL migration / seed.

### In scope

- Розширення моделі `Category` полем `ParentId` (nullable FK на ту саму таблицю).
- Максимум **2 рівні**: батьківська категорія (`ParentId = null`) і підкатегорія (батько — лише top-level).
- Оновлення `GET /api/categories` до вкладеного дерева з `children[]` і `parentId`.
- Оновлення `POST` / `PUT` `/api/categories` для призначення батька.
- Оновлення фільтра `category` у `GET /api/products`: вибір батька включає товари підкатегорій і товари, привʼязані безпосередньо до батька.
- Лічильники активних товарів: у батька — сума дітей (+ прямі); у підкатегорії — власний.
- Каталог: ієрархічний UI фільтрів (desktop / tablet / mobile) у межах існуючого layout.
- Адмінка: ієрархічний список категорій, drawer з полем «Батьківська категорія», select категорії на формі товару з групуванням.
- Seed: додати кілька прикладних підкатегорій під Спеції / Приправи / Чаї **без** примусового переназначення існуючих товарів.
- Український copy, узгоджений з каталогом і адмінкою.

### Out of scope

- Глибша вкладеність (3+ рівні).
- Окрема сутність / таблиця Subcategory.
- Drag-and-drop reorder UI (залишається `SortOrder`; ручний reorder не обовʼязковий).
- Окремі URL-сторінки «лише підкатегорія» поза існуючим `/catalog?category=…`.
- Зміна правил цін / сортування / пагінації каталогу (лише категорійна частина).
- Multi-category на один товар (товар як і раніше має один `CategoryId`).

## References

- Product overview: `SPEC.md` (категорії Спеції, Приправи, Чаї)
- Related: `specs/features/catalog.md` (фільтри, URL state, counts)
- Related: `specs/features/admin.md` (§1.8 Categories, §2.9, §3.5)
- Models: `specs/models.md`
- API: `specs/api.md`
- Database: `specs/db.md`
- Frontend: `specs/frontend.md`
- Design language: `design/catalog.dc.html`, `design/admin.dc.html` (розширення існуючих екранів; окремого макета підкатегорій немає)

---

## 1. Data & API

### 1.1 Common response envelope

Every endpoint returns:

```text
{ success: bool, data: T, error: string? }
```

- Success: `success: true`, populated `data`, no usable `error`.
- Failure: `success: false`, clear Ukrainian-facing `error` where appropriate, no usable data.

### 1.2 Hierarchy rules

- Exactly **two** levels: top-level parent (`ParentId = null`) and subcategory (`ParentId` → a top-level category).
- A subcategory’s parent must itself have `ParentId = null`.
- Creating or updating a category so that depth would exceed 2 fails with a clear error.
- Setting `ParentId` on a category that already has children fails (cannot demote a parent that has subcategories).
- Setting `ParentId` to self, to a descendant, or to a non-top-level category fails.
- `Slug` remains **globally unique** across all categories (parents and subcategories).
- Products may attach to **either** a parent or a subcategory (`CategoryId` → any category).
- Existing products on Спеції / Приправи / Чаї stay on those parents until an admin reassigns them.

### 1.3 Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/categories` | — / Admin | Nested category tree with counts |
| POST | `/api/categories` | Admin | Create parent or subcategory |
| PUT | `/api/categories/:id` | Admin | Update name / slug / description / parent |
| DELETE | `/api/categories/:id` | Admin | Delete if empty (no products, no children) |
| GET | `/api/products` | — / Admin | List products; `category` filter understands hierarchy |

Existing product create/update keep `categoryId`; the allowed set is any existing category id (parent or subcategory).

### 1.4 GET `/api/categories`

Returns a list of **top-level** categories. Each node includes:

| Field | Notes |
|-------|-------|
| `id` | |
| `name` | |
| `slug` | |
| `parentId` | `null` for top-level; subcategory id’s parent for children |
| `sortOrder` | Order among siblings |
| `description` | Optional |
| `activeProductCount` | See §1.5 |
| `children` | Array of subcategory nodes (same fields; `children` empty or omitted for leaves) |

- Public: counts use **active** products only.
- Admin (authorized admin request, same pattern as today for inactive product inclusion): counts include inactive products when the existing admin rule applies.
- Ordering: parents by `SortOrder` then `Id`; children by `SortOrder` then `Id` within each parent.
- Category data may be reused between catalog visits (same as catalog.md); admin screens refetch on enter / after mutation.

### 1.5 Product counts

- **Subcategory count:** number of products whose `CategoryId` is that subcategory (active-only on public).
- **Parent count:** sum of (a) products with `CategoryId` = parent, plus (b) products whose `CategoryId` is any direct child of that parent.  
  Do **not** double-count: a product belongs to exactly one category.

### 1.6 GET `/api/products` — `category` filter

- Query param `category` remains optional comma-separated **slugs** (unchanged URL shape).
- A product matches if its category slug is selected **or** (when a selected slug is a parent) its category is that parent **or** any direct child of that parent.
- Multiple selected slugs: match if the product satisfies **any** selected slug (OR), using the expansion rule above for parents.
- Invalid / unknown slugs are ignored; valid ones remain active (same as catalog.md).
- Selecting both a parent and one of its children does not break results (OR + expansion; duplicates are fine).

### 1.7 Create / update category

Request body:

| Field | Rules |
|-------|-------|
| `name` | Required |
| `slug` | Optional; auto from name when omitted; globally unique |
| `description` | Optional |
| `parentId` | Optional / null = top-level; if set, must reference an existing top-level category |

- Default `SortOrder`: next value among **siblings** (same `ParentId`), not global-only among all categories.
- On success, return the saved category node fields enough to refresh the tree (id, name, slug, parentId, sortOrder, description, activeProductCount, children as empty for a new leaf).

### 1.8 Delete category

- Fails if any products reference the category (same RESTRICT / conflict message pattern as admin.md).
- Fails if the category has child subcategories — clear Ukrainian error (must delete or reparent children first; reparenting children to another parent is allowed only while keeping 2-level rules).
- Confirmation remains a UI concern; API stays as today plus the children rule.

### 1.9 Product category assignment

- Admin product form `categoryId` may point to a parent or a subcategory.
- Invalid / missing category → fail as today.
- Product list / card / detail continue to expose the product’s **own** category name and slug (the attached node). Optional parent name for display is not required for this feature.

### 1.10 Seed / migration

- Migration adds nullable `parent_id` FK → `categories(id)` with ON DELETE RESTRICT (or equivalent safe restrict), plus index on `parent_id`.
- Existing three categories remain top-level (`parent_id` null); existing products keep their `category_id`.
- When demo seed runs / is extended: add a small set of example subcategories under Спеції, Приправи, and Чаї (Ukrainian names, unique slugs). Do **not** force-move all existing products onto those subcategories.
- Optional: leave most demo products on parents; optionally attach a few new or existing demo products to subcategories to exercise filters — not required for all 16.

---

## 2. UI

### 2.1 Catalog filters (public)

- Surfaces: desktop sticky sidebar, tablet collapsible bar / chips, mobile bottom sheet — same shells as catalog.md.
- Categories render as a **two-level** list of **native checkboxes** (not toggle buttons):
  - Parent row: checkbox + name (truncate + title tooltip) + parent count.
  - Under each parent with children: indented subcategory checkboxes + name + own count.
- Parents without children still appear as a single selectable row (current three may gain children after seed).
- Multi-select preserved: any mix of parents and subcategories.
- Selecting a parent does **not** auto-check all subcategory boxes in the UI; filter semantics still include child (and direct parent) products when the parent slug is selected (§1.6).
- «Скинути» clears all category selections with other filters.
- URL sync continues via `category` slug list; shared links restore hierarchy-aware selection.
- All customer-facing labels remain Ukrainian; no new English chrome.

### 2.2 Catalog product card / detail

- Category eyebrow / breadcrumb continues to show the product’s attached category name (parent or subcategory).
- No requirement to show «Parent › Child» breadcrumb in v1; optional later.

### 2.3 Admin categories (`/admin/categories`)

Layout and interactions follow `design/admin.dc.html` (categories view + category drawer):

- Count line: **«N категорія|категорії|категорій (з підкатегоріями)»** counting **all nodes** (parents + children).
- CTA «+ Додати категорію» (marigold primary).
- Table card (cream header, white rows): columns **Назва** | **URL (slug)** | **Товарів** | **Дії**.
- Parent row:
  - Expand/collapse chevron (children shown only when expanded; default expanded on first load).
  - Accent icon tile by category (e.g. Спеції / Приправи / Чаї tones).
  - Bold name + optional pill «N підкатегорія|…».
  - Slug path `/slug`; «Товарів» = aggregated count (§1.5).
  - Actions (icon buttons): **+** add subcategory, pencil edit, trash delete.
- Child row (when parent expanded): cream background, indent, corner-down-right marker, smaller icon, semibold name, path `/parentSlug/childSlug`, own count; actions edit + delete only.
- Long names truncate with ellipsis; full value via `title`.
- Drawer (~420px):
  - Title: «Нова категорія» / «Нова підкатегорія» / «Редагувати категорію» / «Редагувати підкатегорію» depending on mode and parent.
  - «Батьківська категорія» first: «— Коренева категорія —» + top-level options only; hint «Категорія верхнього рівня — може містити підкатегорії» or «Буде вкладена в «…»».
  - «Назва категорії» (required); auto slug preview `/catalog?category=…`; optional description placeholder «Короткий опис категорії…».
  - Footer «Зберегти» / «Скасувати».
- When editing a category that has children, parent select is **disabled** (must stay top-level).
- «+» on a parent opens the drawer pre-filled with that parent selected and expands the parent row.

### 2.4 Admin product form / list filter

- Category select on create/edit uses grouped options: optgroup (or equivalent) per parent, with parent itself selectable and subcategories listed under it.
- Products list filter «Усі категорії» + options that include parents and subcategories (slug-based as today). Filtering by a parent slug uses the same expansion rule as the public catalog (§1.6) so admins see the full set under that branch.

### 2.5 Home / other surfaces

- If the home page lists categories, show **top-level** categories only unless a design already shows otherwise; do not dump a flat mix of all nodes without hierarchy. (No new home redesign required beyond not breaking existing category links — links may use parent slugs.)

---

## 3. Interactions

### 3.1 Catalog

- Toggle parent or subcategory checkbox → refresh products (desktop/tablet immediate; mobile pending until «Показати N товарів»).
- Filter / sort changes reset to page 1; URL updates with selected slugs.
- Invalid slugs in URL ignored; hierarchy expansion applies after resolution of valid slugs.
- No confirmation dialogs for filter changes.

### 3.2 Admin categories

- Create root: «+ Додати категорію» → drawer («Нова категорія», parent = коренева).
- Create child: parent row **+** → drawer («Нова підкатегорія») with that parent pre-selected; parent row expands.
- Edit: pencil → drawer with titles «Редагувати категорію» / «Редагувати підкатегорію»; changing parent only when the category has no children.
- Expand/collapse chevron toggles visibility of child rows (does not navigate).
- Delete: confirmation required; blocked when products or children remain — error toast / message with API text.
- Double-submit on save prevented while in flight.

### 3.3 Admin products

- Choosing a category (parent or child) on save persists `categoryId` as today.
- No extra confirmation for category change.

---

## 4. States and transitions

### Loading

- Catalog: same category / product loading behavior as catalog.md; do not flash a flat incomplete list as final if the tree is still loading.
- Admin categories: table / list skeleton until the tree arrives.

### Empty

- Catalog: unchanged empty products state when filters yield nothing.
- Admin: empty categories message + «+ Додати категорію» when no categories exist.
- Parent with zero children: show parent only (no empty child placeholder required).

### Error

- Catalog category load failure: do not invent category options (catalog.md).
- Admin load failure: inline Ukrainian error + «Спробувати ще».
- Mutation / hierarchy rule failures: toast or field-level message with API error; data unchanged.

### Success

- Catalog results refresh with hierarchy-aware filters.
- Admin list refreshes from response or refetch after save / delete.

### Persistence

- Catalog filter state (including parent/child slugs) stays in the URL across navigation / share.
- Admin list filters need not survive full refresh (admin.md default).

---

## 5. Feedback

- Category save: toast e.g. «Категорію збережено» (~3 s).
- Category delete success: toast e.g. «Категорію видалено».
- Delete / save conflict (products, children, invalid parent, slug clash, depth): error toast with clear Ukrainian message.
- Catalog add-to-cart toasts unchanged.
- Toasts auto-dismiss ~3 seconds; destructive confirm remains a dialog, not a toast.

---

## 6. Edge cases

- Max depth 2 enforced on create/update; attempts to nest a subcategory under another subcategory fail.
- Cannot create cycles (self-parent, parent-of-parent).
- Cannot delete a parent that still has subcategories.
- Cannot delete any category that still has products.
- Globally unique slug: «перець» cannot exist twice under different parents.
- Long category names truncate with ellipsis in admin table and wrap/truncate gracefully in catalog filters without breaking layout.
- Large trees: still only 2 levels; sibling lists remain manageable for this shop; server returns full tree (no category pagination required).
- Parent selected with zero products on parent but products on children → products from children appear; counts stay consistent.
- Only subcategory selected → only that subcategory’s products (not siblings, not parent-direct unless also selected).
- Product attached to parent remains visible when filtering by that parent; not visible when filtering only by a sibling subcategory.
- Admin non-admin JWT never receives privileged inactive counts beyond existing admin rules.
- Accessibility: nested checkboxes expose name + checked state; indented structure is perceivable; drawer parent select is labeled («Батьківська категорія»).

---

## Acceptance Criteria

### Data and hierarchy

- [ ] `Category` supports nullable `ParentId` self-FK; only 2 levels are allowed.
- [ ] Products may attach to parent or subcategory; existing demo products remain on parents after migration.
- [ ] Seed may add example subcategories under Спеції / Приправи / Чаї without mass reassignment.
- [ ] Slugs remain globally unique.

### API

- [ ] `GET /api/categories` returns nested top-level nodes with `children[]`, `parentId`, and correct counts (parent = direct + children; child = own).
- [ ] `POST` / `PUT` `/api/categories` accept `parentId` and enforce hierarchy rules with clear Ukrainian errors.
- [ ] `DELETE /api/categories/:id` fails when products or child categories exist.
- [ ] `GET /api/products?category=` expands parent slugs to include direct + subcategory products; multi-slug OR semantics preserved.
- [ ] All responses use `{ success, data, error }`.

### Catalog UI

- [ ] Category filter shows parents with indented subcategories, multi-select, counts, and existing responsive shells.
- [ ] Selecting a parent filters by parent-direct and subcategory products without requiring child checkboxes to be checked.
- [ ] URL `category` slug sync / restore / invalid-slug ignore behavior remains.

### Admin UI

- [ ] Categories screen matches `design/admin.dc.html`: expand/collapse tree, accent icons, subcategory pill, path columns, icon actions (+ / edit / delete).
- [ ] Drawer titles and «Батьківська категорія» (коренева + hint) match design; parent locked when the category has children.
- [ ] Product form category control groups parents and subcategories; list filter understands parent expansion.
- [ ] Save / delete toasts and delete confirmation behave as specified.

### States and edges

- [ ] Loading, empty, and error states match catalog/admin patterns.
- [ ] Depth, cycle, demotion-of-parent-with-children, and slug conflicts are blocked safely.
- [ ] No 3+ level nesting and no separate Subcategory entity.

### Scope

- [ ] Feature is priority 7; catalog price/sort/pagination rules unchanged except category hierarchy behavior above.

---

## Suggested seed examples (non-binding names)

Illustrative only; implementers may adjust spelling / slugs to match transliteration helpers:

| Parent | Example children |
|--------|------------------|
| Спеції | Мелені, Цілі, Суміші |
| Приправи | Універсальні, До мʼяса, До овочів |
| Чаї | Чорний, Зелений, Травʼяний |

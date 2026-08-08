# Feature: Сторінка товару

**Status:** Ready for implementation  
**Priority:** 2  
**Agent:** requirements-planner → backend + database + frontend → tester → plan-verifier → code-reviewer → security-reviewer

---

## Summary

Публічна сторінка товару дозволяє покупцю переглянути деталі активного товару за slug, обрати кількість і додати товар у сесійний кошик, а також перейти до схожих товарів тієї ж категорії.

## Scope

Full-stack: ASP.NET Core API + Angular UI + PostgreSQL data access.

### In scope

- Публічна сторінка `/catalog/:slug`.
- Отримання одного активного товару за slug разом із до 3 схожими товарами.
- Галерея зображень, опис, ціна, фасування.
- Вибір кількості та додавання в кошик.
- Оновлення лічильника товарів у кошику в header.
- Стани завантаження, «не знайдено» та помилки.

### Out of scope

- Рейтинг і відгуки.
- Wishlist / «У бажане».
- Повна реалізація кошика та cart drawer.
- Адміністративний CRUD товарів і категорій.
- Окремий маршрут `/product/...` (використовується лише `/catalog/:slug`).

## References

- Claude Design: `design/product.dc.html`
- Design system: `design/_ds/faino-naturalno-design-system-69873b7b-f6fd-41c1-a506-a953191d246d/`
- Product overview: `SPEC.md`
- Models: `specs/models.md`
- API conventions: `specs/api.md`
- Frontend architecture: `specs/frontend.md`
- Database schema: `specs/db.md`
- Related: `specs/features/catalog.md` (badges, cart session, card handoff)

---

## 1. Data & API

### 1.1 Common response envelope

Every endpoint returns:

```text
{ success: bool, data: T, error: string? }
```

- A successful response has `success: true`, populated `data`, and no error.
- A failed response has `success: false`, an appropriate `error`, and no usable data.

### 1.2 Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/products/:slug` | Return one active product by slug, including similar products |
| POST | `/api/cart/items` | Add the selected quantity of a product to the current cart |

### 1.3 GET `/api/products/:slug`

#### Product data

The response includes:

- `Id`
- `Name`
- `Slug`
- `ShortDescription`
- `Description`
- `ImageUrl`
- `ImageUrls`
- `IsFeatured`
- `IsAvailable`
- `CreatedAt`
- Category identifier, name, and slug
- `variants`: `[{ id, weight, weightUnit, price, sortOrder }]` — **active only**, ordered by `sortOrder`
- `similarProducts`: zero to three related products

Public detail requires the same catalog inclusion rules as the list (`IsActive` + `IsAvailable` + ≥1 active variant). Products that fail those rules yield not-found (same as inactive).

No product-level `price` / `weight` — packaging and price come from `variants`.

#### Similar products

- Up to 3 catalog-included products from the same category as the current product.
- The current product is excluded.
- Ordering follows catalog «popular» semantics (featured products first).
- Each similar product uses the same card-level fields as the catalog list (`priceFrom`, `cheapestVariantId`, `variants[]`, image, category, created-at for «Новинка»).
- The list may contain fewer than 3 items when fewer peers exist; an empty list is allowed.

### 1.4 Product badges

- A product is marked «Новинка» when its `CreatedAt` is within the last 30 days.
- No discount / sale badge (old price removed).

### 1.5 Cart mutation

Selecting «В кошик» sends `{ variantId, quantity? }` for the selected (or sole) active variant. Cheapest active variant is preselected (min price; tie-break `sortOrder`).

The maximum selectable quantity is `12`.

On success, the response provides enough information to update the cart item-count badge.

Inactive / unavailable products and inactive variants are rejected.

The cart is identified by the existing session header (`X-Cart-Session-Id`), consistent with the catalog.

Selecting «В кошик» on a similar-product card uses the same split control as the catalog (cheapest or dropdown-selected variant), quantity `1`, without navigating away.

### 1.6 Loading freshness

Opening `/catalog/:slug` or changing the slug triggers a fresh product detail request. The client does not keep a long-lived cache of product detail data.

---

## 2. Product UI

### 2.1 Page frame

- The page uses the warm kraft, espresso, marigold, garden, and chili design language from the product design.
- The header displays the logo, navigation, and cart icon with item-count badge.
- All visible customer-facing text is Ukrainian and follows the design copy (except out-of-scope controls, which are omitted).
- The page is public; no login is required to view the product or add to cart.

### 2.2 Responsive layout

| Viewport | Main layout | Similar products | Add controls |
|----------|-------------|------------------|--------------|
| Desktop | Gallery left, details right | 3 cards in a row below | Inline stepper + «В кошик» |
| Mobile | Photo, thumbs, then details | Horizontal scroll | Sticky bottom bar with stepper + «В кошик» |

### 2.3 Breadcrumb and navigation chrome

- Breadcrumb: «Каталог» › category name › product name.
- «Каталог» navigates to `/catalog`.
- The category segment and «Усі {назва категорії} →» navigate to the catalog filtered to that category.
- Mobile back control returns to the previous page or the catalog.

### 2.4 Gallery

- Main image uses a 1:1 aspect area.
- Up to 4 thumbnails from `ImageUrls` (with `ImageUrl` as the main image when the gallery is empty).
- Selecting a thumbnail updates the main image.
- Missing images use the neutral «фото» placeholder without breaking layout.
- Sale / «Новинка» badge may appear on the main image per badge rules.

### 2.5 Product details

- Product name, short description, current price, optional crossed-out old price, and «/ {Weight} {WeightUnit}».
- Packaging line: «Фасування: {Weight} {WeightUnit}» (same weight fields as the price unit).
- Full description under heading «Опис».
- Static info strip (not from API): «Доставка Новою Поштою» and «100% натуральний склад».
- Rating, heart/wishlist, and notify controls are not shown in this feature.

### 2.6 Quantity and primary add control

- Quantity stepper starts at `1` and ranges from `1` to `12`.
- Primary button label «В кошик»; brief success label «Додано» after a successful add.

### 2.7 Similar products

- Section title «Схожі товари».
- Cards match catalog card content: category eyebrow, name, short description, price, optional old price, badge, image, and «В кошик».
- The section is hidden when `similarProducts` is empty.

---

## 3. User interactions

- Thumbnail selection changes the main image only.
- Stepper changes the quantity used for the next add on this page.
- «В кошик» on the product page adds the current stepper quantity and does not navigate to the cart.
- Clicking a similar-product card (not its add button) navigates to `/catalog/:slug` for that product.
- «В кошик» on a similar card adds one unit and does not navigate.
- Breadcrumb and category links navigate as described in §2.3.
- No confirmation dialogs before add-to-cart.
- No forms on the page other than the quantity stepper as a quantity control.
- Rapid repeated add clicks result in one in-flight request at a time (control busy until the response).

---

## 4. States and transitions

### Initial loading / slug change

- First load and slug changes show the product-page skeleton from the design (gallery, thumbs, detail blocks).
- Incomplete product data is not presented as final content while loading.

### Not found

- Unknown or inactive slug shows a Ukrainian not-found presentation with a path back to the catalog.

### Error

- A product-detail loading failure shows an inline Ukrainian error and «Спробувати ще».
- Retry repeats the same slug request.
- Load failures do not use toasts.

### Empty / partial gallery

- Zero images: main placeholder «фото».
- One to three images: only available thumbnails.
- More than four images: first four from the gallery are shown.

### Success after add

- The user stays on the product page.
- The cart badge updates after a successful add.
- Stepper quantity resets to `1` when leaving the page or changing slug; it is not persisted across navigation.
- Cart session contents persist across pages as for the catalog.

---

## 5. Feedback

- Successful add shows toast «Додано в кошик»; on desktop the toast includes product name × quantity; on mobile a short success toast is enough.
- The primary button briefly shows «Додано» / success emphasis.
- A failed cart mutation shows an error toast and does not change the cart badge or show «Додано».
- Cart toasts dismiss automatically after approximately 3 seconds (same timing as the catalog).
- Product load errors remain inline rather than appearing as transient toasts.

---

## 6. Edge cases

- Long names and descriptions flow downward without breaking the gallery or sticky mobile bar.
- Optional fields (`ShortDescription`, `Description`, images) omit corresponding UI without misleading separators when absent.
- `similarProducts` length may be 0–3; hide the section when empty.
- The 30-day «Новинка» rule uses the product creation timestamp.
- The page is public; there are no permission gates for viewing or guest add-to-cart.
- Accessibility expectations follow the catalog pattern: keyboard-operable controls, meaningful Ukrainian labels for icon-only controls, disabled state exposed for busy add, toasts announced without stealing focus.

---

## Acceptance Criteria

### Data and API

- [ ] `GET /api/products/:slug` returns only an active product in the common API envelope.
- [ ] Detail data includes full product fields, category, gallery URLs, and `similarProducts` (0–3, same category, popular order, current excluded).
- [ ] Unknown or inactive slug yields a not-found style failure without usable product data.
- [ ] Badge rules match the catalog («Новинка» within 30 days; no discount / old-price badge).
- [ ] `POST /api/cart/items` accepts the stepper quantity with session identification; max quantity is `12`.
- [ ] Active products can always be added.
- [ ] Product detail is freshly loaded on each visit and slug change.

### Layout and content

- [ ] Desktop shows gallery + details and a three-card similar section; mobile shows stacked content, horizontal similar cards, and a sticky add bar.
- [ ] Breadcrumb, price, packaging, description, and static info strip match the agreed copy and design intent.
- [ ] Gallery supports up to 4 thumbnails with placeholders for missing images.
- [ ] Rating, wishlist, and notify UI are absent.
- [ ] All customer-facing product-page labels are Ukrainian.

### Interactions

- [ ] Thumbnail selection updates the main image.
- [ ] Product «В кошик» adds the stepper quantity (1–12) without leaving the page.
- [ ] Similar card navigates to that product’s slug; its «В кошик» adds one unit without navigating.
- [ ] Category and «Усі … →» links open the catalog for that category.
- [ ] No confirmation dialogs before add; concurrent adds are serialized to one in-flight request.

### States and feedback

- [ ] Loading shows the designed skeleton.
- [ ] Not found and load error (with retry) behave as specified.
- [ ] Successful add updates the badge, briefly shows «Додано», and shows a toast that auto-dismisses in ~3 seconds.
- [ ] Failed add shows an error toast and leaves the badge unchanged.
- [ ] Stepper resets when the slug or page changes; cart session persists across navigation.

### Edge cases and scope

- [ ] Long text, empty/partial/overfull galleries, and 0–3 similar products display without layout breakage.
- [ ] The feature does not implement ratings, wishlist, admin CRUD, or the full cart experience.

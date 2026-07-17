# Feature: Каталог товарів

**Status:** Ready for implementation  
**Priority:** 1  
**Agent:** requirements-planner → backend + database + frontend → tester → plan-verifier → code-reviewer → security-reviewer

---

## Summary

Публічний каталог дозволяє покупцю переглядати активні товари, фільтрувати їх за категоріями й ціною, сортувати, переходити між сторінками та додавати одну одиницю товару в кошик.

## Scope

Full-stack: ASP.NET Core API + Angular UI + PostgreSQL data access.

### In scope

- Публічна сторінка `/catalog`.
- Отримання товарів і категорій із сервера.
- Фільтрація, сортування та пагінація товарів.
- Перехід із картки на `/catalog/:slug`.
- Додавання однієї одиниці товару в кошик.
- Відображення кількості товарів у кошику в header.

### Out of scope

- Реалізація сторінки товару `/catalog/:slug`.
- Повна реалізація кошика та cart drawer.
- Адміністративний CRUD товарів і категорій.
- Поле пошуку в інтерфейсі каталогу.

## References

- Claude Design: `design/catalog/project/Каталог товарів.dc.html`
- Design screenshots: `design/catalog/project/screenshots/01-mid.jpg`, `design/catalog/project/screenshots/02-mid.jpg`
- Design system: `design/catalog/project/_ds/faino-naturalno-design-system-69873b7b-f6fd-41c1-a506-a953191d246d/`
- Product overview: `SPEC.md`
- Models: `specs/models.md`
- API conventions: `specs/api.md`
- Frontend architecture: `specs/frontend.md`
- Database schema: `specs/db.md`

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
| GET | `/api/products` | Return a filtered, sorted, paginated list of active products |
| GET | `/api/categories` | Return catalog categories and active-product counts |
| POST | `/api/cart/items` | Add one unit of a product to the current cart |

### 1.3 GET `/api/products`

#### Query parameters

| Parameter | Semantics |
|-----------|-----------|
| `category` | Optional comma-separated category slugs; a product matches any selected category |
| `search` | Optional text search supported by the API; the catalog UI does not expose a search field |
| `minPrice` | Optional inclusive minimum price |
| `maxPrice` | Optional inclusive maximum price |
| `page` | One-based page number; defaults to `1` |
| `pageSize` | Number of products per page; catalog uses `9` |
| `sortBy` | `popular`, `price-asc`, `price-desc`, or `new`; defaults to `popular` |

Only products with `IsActive = true` are returned.

If `minPrice` is greater than `maxPrice`, their values are swapped before filtering.

Invalid or unsupported query values fall back to valid defaults. A requested page beyond the available range resolves to the nearest valid page.

#### Sort semantics

- `popular`: featured products (`IsFeatured = true`) appear first.
- `price-asc`: lowest current price first.
- `price-desc`: highest current price first.
- `new`: most recent `CreatedAt` first.

#### Product list data

Each product includes:

- `Id`
- `Name`
- `Slug`
- `ShortDescription`
- `Price`
- `OldPrice`
- `ImageUrl`
- `Weight`
- `WeightUnit`
- `StockQuantity`
- `IsFeatured`
- `CreatedAt`
- Category identifier, name, and slug

The response data also includes:

- `items`: products for the current page
- `page`: resolved current page
- `pageSize`: `9`
- `totalCount`: total products matching the current filters
- `totalPages`: total available pages
- `priceMin`: lowest price among active catalog products
- `priceMax`: highest price among active catalog products

### 1.4 GET `/api/categories`

Each category includes its identifier, name, slug, sort order, and count of active products. Categories follow `SortOrder`.

Category data may be reused between catalog visits. Product results are refreshed whenever filters, sorting, or pagination change.

### 1.5 Product badges

- A product is marked «Новинка» when its `CreatedAt` is within the last 30 days.
- A discount badge is shown only when `OldPrice > Price`.
- The discount percentage is derived from `OldPrice` and `Price` and displayed as a whole percentage.
- A discount badge takes precedence when a product qualifies for both discount and «Новинка».

### 1.6 Cart mutation

Selecting «В кошик» sends the product identifier and quantity `1`.

On success, the response provides enough information to update the cart item-count badge. Out-of-stock products cannot be added.

---

## 2. Catalog UI

### 2.1 Page frame

- The page uses the provided warm kraft, espresso, marigold, garden, and chili design language.
- The header displays the logo, navigation, and cart icon with item-count badge.
- «Каталог» appears as the active navigation item.
- All visible customer-facing text is Ukrainian and follows the design copy.

### 2.2 Responsive layout

| Viewport | Product grid | Filters | Card content |
|----------|--------------|---------|--------------|
| Desktop | 3 columns | Sticky 260px sidebar | Full card |
| Tablet | 3 columns | Collapsible filter bar with category chips and price summary | Simplified card |
| Mobile | 2 columns | Sticky bottom button opens a bottom sheet | Simplified card |

The full desktop card shows category eyebrow, name, short description, price, optional old price, weight unit, badge, image, and «В кошик».

Tablet and mobile cards omit the category eyebrow and short description.

### 2.3 Product card

- The image area keeps a consistent product-card aspect.
- Missing images use the neutral «фото» placeholder from the design.
- Product names occupy at most two lines and are then truncated.
- Desktop short descriptions occupy one line and end with an ellipsis when necessary.
- Current price, optional crossed-out old price, and weight/unit are visible.
- Hover-capable devices show the designed card lift, stronger shadow, and button emphasis.
- The card links to `/catalog/:slug`; «В кошик» performs only the cart action.
- An out-of-stock card remains visible and its «В кошик» button is disabled.

### 2.4 Filters

- Categories support multiple selection.
- Desktop displays category checkboxes, active-product counts, a price range, numeric «від»/«до» fields, and reset controls.
- Tablet displays a collapsible filter panel with category chips and the selected price range.
- Mobile displays category options, counts, price controls, «Скинути», and «Показати N товарів» in a bottom sheet.
- The mobile filter button displays the number of active filters.
- «Скинути» restores all filter and sort defaults and returns to page 1.
- Price input changes trigger product refresh only after a short pause in input.

### 2.5 Sorting

The sorting control uses this order:

1. «За популярністю»
2. «За ціною ↑»
3. «За ціною ↓»
4. «Новинки»

«За популярністю» is selected by default.

### 2.6 Result count and pagination

- The interface displays the filtered `totalCount` using the design wording «N товари».
- The catalog shows 9 products per page on every viewport.
- Pagination displays previous/next controls, the current page, nearby pages, and ellipses when the page count is large.
- Previous/next controls are unavailable at their respective boundaries.

---

## 3. User interactions and navigation state

- Selecting a category, changing price, sorting, or choosing a page updates the product results.
- Changing filters or sorting resets pagination to page 1.
- Active filters, sorting, and page are synchronized with the URL.
- Opening a shared catalog URL restores its valid catalog state.
- Browser back and forward navigation restore the corresponding catalog state.
- Invalid URL values are normalized to valid defaults without blocking the page.
- If URL `minPrice` exceeds `maxPrice`, the two values are swapped.
- Desktop and tablet filters apply as they change.
- Mobile filter changes remain pending until «Показати N товарів» is selected.
- Selecting «Показати N товарів» applies the pending filters and closes the bottom sheet.
- Closing the mobile sheet without applying retains the previously applied catalog state.
- Reset and add-to-cart actions do not require confirmation dialogs.

---

## 4. States and transitions

### Initial loading

- The first product load displays the card skeletons shown in the design.
- Category and product controls do not present incomplete data as final content.

### Refetching

- Existing product cards remain visible while a new filtered, sorted, or paginated result is requested.
- Existing cards receive subtle dimming until the response arrives.
- Repeated changes do not display stale results as the latest selection.

### Empty

- An empty result displays the designed package-search illustration, «Товарів не знайдено», explanatory text, and «Скинути фільтри».
- The same empty presentation is used when the store has no active products.

### Error

- A product-list loading error replaces the result area with an inline Ukrainian error message and «Спробувати ще».
- Retry repeats the current catalog request without discarding the selected URL state.
- Category-loading failure does not present fabricated category options.

### Success

- A successful response replaces or refreshes the product grid, count, and pagination.
- Page focus and scroll behavior remain predictable when results change.

---

## 5. Feedback

- Successful add-to-cart shows a toast «Додано в кошик».
- The cart badge updates after successful addition.
- The selected card button receives a brief success highlight.
- A failed cart mutation shows an error toast and does not increment the cart badge.
- Cart toasts dismiss automatically after 3 seconds.
- Product-list errors remain inline rather than appearing as transient toasts.

---

## 6. Accessibility and input behavior

- All interactive elements are keyboard operable and show a visible focus state.
- Product-card navigation and «В кошик» remain distinct actions for keyboard and assistive-technology users.
- Icon-only menu, cart, close, pagination, and filter controls have meaningful Ukrainian accessible labels.
- Category selection exposes selected/unselected state.
- The mobile filter sheet traps focus while open, can be closed with Escape, and returns focus to the filter button.
- Toasts are announced without unexpectedly moving focus.
- Loading, empty, and error state changes are announced appropriately.
- Disabled out-of-stock and pagination controls expose their disabled state.
- Price fields accept numeric values and expose clear «від» and «до» labels.
- Touch targets follow the dimensions shown in the mobile design.

---

## 7. Edge cases

- Products without an image use the catalog placeholder without breaking card dimensions.
- Products without `ShortDescription`, `OldPrice`, `Weight`, or `WeightUnit` omit the corresponding optional content without leaving misleading separators.
- Products with zero stock remain discoverable but cannot be added to the cart.
- Only active products contribute to results, category counts, and catalog price bounds.
- Long names and descriptions do not change card-grid alignment.
- The grid and pagination remain usable for large result sets.
- If filtering reduces the number of pages, the catalog resolves to a valid page.
- A zero-result price range displays the empty state.
- Invalid category slugs are ignored; valid selected category slugs remain active.
- Discount percentage is never shown when `OldPrice` is absent, equal to, or lower than `Price`.
- The 30-day «Новинка» rule uses the product creation timestamp and remains valid across calendar boundaries.

---

## Acceptance Criteria

### Data and API

- [ ] `GET /api/products` returns only active products in the common API envelope.
- [ ] Product filtering supports multiple comma-separated category slugs and inclusive price bounds.
- [ ] `search` remains supported by the API but no search field appears in the catalog UI.
- [ ] Invalid query values fall back to valid defaults.
- [ ] `minPrice > maxPrice` is resolved by swapping the values.
- [ ] Product responses include page, pageSize 9, totalCount, totalPages, and catalog price bounds.
- [ ] Category responses include active-product counts.
- [ ] Sorting follows the defined popular, price, and CreatedAt semantics.
- [ ] Products created within the last 30 days receive «Новинка».
- [ ] A discount badge appears only when `OldPrice > Price` and shows the derived whole percentage.

### Layout and content

- [ ] The catalog shows 3 columns on desktop, 3 on tablet, and 2 on mobile.
- [ ] Desktop cards include category and short description; tablet/mobile cards omit both.
- [ ] Header, filters, cards, pagination, empty state, and loading skeleton match the referenced design.
- [ ] All customer-facing catalog labels are Ukrainian.
- [ ] Missing images, optional data, long names, and long descriptions display without breaking the grid.

### Filters, sorting, and navigation

- [ ] Users can select multiple categories and filter by inclusive price range.
- [ ] Users can sort by popularity, ascending price, descending price, and newest.
- [ ] Filter or sort changes reset to page 1.
- [ ] Filters, sort, and page are reflected in the URL and restored by browser navigation.
- [ ] Catalog pagination uses pageSize 9 and ellipses for large page counts.
- [ ] Mobile filters apply only after «Показати N товарів» and the sheet then closes.
- [ ] Closing the mobile sheet without applying does not change active results.
- [ ] Selecting a product card navigates to `/catalog/:slug`.

### Cart interaction and feedback

- [ ] «В кошик» adds exactly one unit without navigating to the product page.
- [ ] Out-of-stock products remain visible and cannot be added.
- [ ] Successful addition updates the badge, highlights the button briefly, and shows «Додано в кошик».
- [ ] Failed addition leaves the badge unchanged and shows an error toast.
- [ ] Cart toasts dismiss after 3 seconds.

### States and accessibility

- [ ] Initial loading displays skeleton cards.
- [ ] Refetching preserves and subtly dims current cards.
- [ ] Empty results display the designed empty state and reset action.
- [ ] Product-list failures display an inline error and working retry action.
- [ ] All controls are keyboard accessible with visible focus and meaningful labels.
- [ ] The mobile sheet manages focus, supports Escape, and restores focus when closed.
- [ ] Dynamic loading, error, empty, and toast feedback is available to assistive technologies.

### Scope boundaries

- [ ] The feature does not implement product-detail content, admin CRUD, or the full cart experience.

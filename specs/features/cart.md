# Feature: Кошик

**Status:** Ready for implementation  
**Priority:** 3  
**Agent:** requirements-planner → backend + database + frontend → tester → plan-verifier → code-reviewer → security-reviewer

---

## Summary

Публічний кошик дозволяє покупцю переглядати сесійний кошик у бічній панелі на десктопі та на повній сторінці `/cart` на мобільному, змінювати кількість, видаляти позиції, бачити суму товарів і переходити до оформлення замовлення.

## Scope

Full-stack: ASP.NET Core API + Angular UI + PostgreSQL data access.

### In scope

- Desktop cart drawer (slide-in справа з затемненням).
- Mobile повна сторінка `/cart`.
- Отримання кошика з сервера та оновлення лічильника в header.
- Зміна кількості позиції та видалення позиції.
- Порожній стан кошика.
- Навігація на `/checkout` і повернення до каталогу / покупок (без логіки чекауту).

### Out of scope

- Логіка оформлення замовлення, оплати та доставки (checkout).
- Промокоди та знижки в кошику.
- Кнопка «очистити кошик» у UI (endpoint clear може існувати без UI).
- Адміністративний CRUD.
- Дублювання контрактів додавання в кошик і merge після login/register (вже в catalog, product, auth).

## References

- Claude Design: `design/cart.dc.html`
- Design system: `design/_ds/faino-naturalno-design-system-69873b7b-f6fd-41c1-a506-a953191d246d/`
- Product overview: `SPEC.md`
- Models: `specs/models.md` (Cart, CartItem)
- API conventions: `specs/api.md`
- Frontend architecture: `specs/frontend.md` (`/cart`, CartDrawer)
- Database schema: `specs/db.md`
- Related: `specs/features/catalog.md`, `specs/features/product.md` (add-to-cart, session, badge)
- Related: `specs/features/auth.md` (guest cart merge after login/register)

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
| GET | `/api/cart` | Return the current cart (session / user after merge) |
| PUT | `/api/cart/items/:id` | Update line quantity |
| DELETE | `/api/cart/items/:id` | Remove a line |
| DELETE | `/api/cart` | Clear the cart (API only; no clear-all control in this feature’s UI) |

Existing endpoints reused, not redefined here:

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/cart/items` | Add items (catalog / product) |
| POST | `/api/cart/merge` | Merge guest cart after auth |

### 1.3 Cart identity

- The cart is identified by the session header `X-Cart-Session-Id` (UUID), consistent with catalog and product.
- After login or register, the guest cart is merged into the user cart by the auth feature; this feature does not redefine merge.
- Guest and authenticated buyers see the same cart UI; after auth, JWT applies alongside the session rules already established.

### 1.4 GET `/api/cart`

The response data includes:

- `itemCount` — sum of all line quantities (same semantics as the header badge)
- `subtotal` — sum of line totals
- `items` — ordered list of cart lines (order as returned by the API; typically addition order)

Each line includes:

- `cartItemId`
- `productId`
- `name`
- `slug`
- `category` name (for display)
- Primary product image URL (may be empty)
- Current unit `price` from the live product (not a historical snapshot)
- `quantity`
- `lineTotal` (`price × quantity`)
- `stockQuantity`
- Enough information to distinguish an inactive / unavailable product for UI rules below

Delivery cost is not returned as a number. The UI shows only the static copy «за тарифами перевізника».

An empty cart returns `itemCount` `0`, `subtotal` `0`, and an empty `items` list (success).

### 1.5 PUT `/api/cart/items/:id`

- Request body includes the new `quantity`.
- Maximum allowed quantity is the lesser of current `stockQuantity` and `12`.
- Minimum quantity is `1` (removing the line uses DELETE, not quantity `0`).
- On success, the response provides enough data to refresh the affected line, `itemCount`, and `subtotal` (or the full cart equivalent).
- Requests that exceed stock or violate limits fail with an error; the client keeps or restores the previous quantity.

### 1.6 DELETE `/api/cart/items/:id`

- Removes the line.
- On success, the response provides enough data to refresh `itemCount` and `subtotal` (and the remaining items if returned).

### 1.7 DELETE `/api/cart`

- Clears all lines for the current cart.
- Available as an API capability; this feature’s UI does not expose a clear-all control.

### 1.8 Loading and refresh

- Opening the drawer or navigating to `/cart` loads a fresh `GET /api/cart`.
- After a successful PUT or DELETE, local cart content and the header badge update from the mutation response when it is complete enough; otherwise a refetch is acceptable.
- Closing the drawer does not clear the cart.

---

## 2. UI

### 2.1 Surfaces

| Surface | Behavior |
|---------|----------|
| Desktop | Cart opens as a right-side drawer over a dimmed page backdrop |
| Mobile | Full page at `/cart` |
| Empty | Empty presentation matching the design (drawer-style empty on desktop; same messaging on mobile) |

The page is public for guests and logged-in buyers. There is no admin cart UI.

### 2.2 Line layout

Items display as a vertical list of rows (not a grid or table):

- Product image (or placeholder)
- Category label and product name
- Remove (trash) control
- Quantity stepper
- Line total in ₴

### 2.3 Header and totals

- Title «Кошик» with a Ukrainian plural count label: `N товар` / `товари` / `товарів` based on `itemCount`.
- Desktop footer shows: «Сума товарів», «Доставка» with «за тарифами перевізника», «Разом» (equals subtotal), primary CTA «Оформити замовлення», link «← Продовжити покупки».
- Mobile sticky footer shows «Разом» and «Оформити замовлення» (no delivery row / continue-shopping link required in the sticky bar).
- Accessible labels for icon-only controls: «Закрити», «Назад», and a meaningful remove label.

### 2.4 Empty state copy

- Heading «Кошик порожній»
- Supporting text: «Ще нічого не додали. Загляньте до каталогу — ми зібрали для вас багато смачного.»
- CTA «Перейти до каталогу»
- Empty state does not show totals or «Оформити замовлення»

### 2.5 Quantity limits

- Stepper minimum is `1`.
- Stepper maximum is `min(stockQuantity, 12)` (aligned with the product page, not the design’s illustrative max of 20).

### 2.6 Visual language

- Follow the warm kraft / espresso design language from the cart design and shared design system.
- Currency display uses ₴.

---

## 3. Interactions

### 3.1 Open and close

- Header cart icon: on desktop opens the drawer; on mobile navigates to `/cart`.
- Drawer closes via the close control, clicking the backdrop, or Escape.
- Mobile «Назад» returns to the previous page (or a sensible catalog fallback).
- «← Продовжити покупки» closes the drawer / returns to shopping (catalog or previous page).

### 3.2 Quantity and remove

- Changing the stepper sends a quantity update for that line.
- Trash removes the line immediately with no confirmation dialog.
- While a line mutation is in flight, that line’s stepper and remove control are disabled; extra clicks are ignored until the request finishes.

### 3.3 Navigation from a line

- Activating the product image or name navigates to `/catalog/:slug`.
- After navigation from the drawer, the drawer may close.

### 3.4 Checkout and catalog CTAs

- «Оформити замовлення» navigates to `/checkout` only; this feature does not implement checkout.
- Empty-state «Перейти до каталогу» navigates to `/catalog`.

### 3.5 Forms

- There are no cart forms beyond the quantity stepper and action controls.
- No search, filter, or clear-all UI in the cart.

---

## 4. States and transitions

### Initial loading

- First open of the drawer or `/cart` shows a list skeleton (or equivalent loading treatment in the list area).
- Totals and the checkout CTA stay hidden or inactive until the cart has loaded.

### Mutation pending

- Only the affected line enters a pending / disabled control state; other lines remain usable.

### Empty

- Empty design from §2.4.
- After the last line is removed, the UI switches immediately to empty.

### GET failure

- Inline Ukrainian error with «Спробувати ще».
- Retry repeats `GET /api/cart`.
- The header badge is not changed arbitrarily on a failed load.

### PUT / DELETE failure

- The line quantity or presence rolls back to the pre-request state (or is corrected from the error/response when available).
- Feedback uses toasts (see §5); badge/`itemCount` stay consistent with the last known good cart.

### Out of stock

- The line remains visible.
- The stepper cannot increase beyond `min(stockQuantity, 12)`.
- When stock is `0`, quantity cannot be increased; the buyer may still remove the line.

### Inactive / unavailable product

- The line remains visible with a clear label such as «Недоступний».
- Quantity change is not offered; product navigation to slug is disabled or unavailable.
- The buyer may remove the line.
- The cart does not block «Оформити замовлення» solely because of inactive lines; final availability checks belong to checkout.

### Persistence

- Cart contents persist on the server for the session (and user after merge).
- Closing the drawer does not clear contents.
- Badge and list stay aligned after open and after successful mutations.

---

## 5. Feedback

- Successful quantity change: no toast; updated line total, subtotal, and badge are enough.
- Successful remove: toast «Видалено з кошика».
- Failed quantity update or remove: toast with the API error text when suitable, otherwise «Не вдалося оновити кошик» / «Не вдалося видалити», plus UI rollback.
- GET failures stay inline with retry; they do not require a toast.
- Toasts auto-dismiss after approximately 3 seconds (same timing as catalog and product).

---

## 6. Edge cases

- Long product names truncate with ellipsis (about two lines); the full name is available via title/tooltip.
- Many lines: the list scrolls; the footer stays sticky; there is no cart pagination.
- If the catalog price changed after add, the cart always shows the current product price with no separate “price changed” warning.
- If stock no longer allows the requested quantity, the API rejects the change; the client shows an error toast and restores or corrects quantity / stock limits.
- Guest and logged-in buyers share the same cart UI; merge remains the auth feature’s responsibility.
- Missing product image shows a kraft / «фото» style placeholder.
- Rapid repeated stepper or trash clicks on a line are ignored while that line’s request is pending.
- Checkout payment, delivery calculation, and promo codes are out of scope.
- The feature is public; there are no admin-only cart views.
- Icon-only controls have meaningful Ukrainian accessible names; pending and disabled states are exposed to assistive technology; toasts announce without stealing focus.

---

## Acceptance Criteria

### Data and API

- [ ] `GET /api/cart` returns `items`, `itemCount`, and `subtotal` in the common API envelope, identified via `X-Cart-Session-Id` (and auth rules after merge).
- [ ] Each line exposes identity, name, slug, category, image, live unit price, quantity, line total, and stock (plus inactive/unavailable distinguishability).
- [ ] Delivery is display copy only; no delivery amount in the cart response.
- [ ] `PUT /api/cart/items/:id` updates quantity with max `min(stockQuantity, 12)` and min `1`.
- [ ] `DELETE /api/cart/items/:id` removes a line and returns enough data to refresh counts/totals.
- [ ] `DELETE /api/cart` clears the cart at the API level without a clear-all UI control.
- [ ] Existing `POST /api/cart/items` and `POST /api/cart/merge` are reused, not redefined.
- [ ] Opening drawer or `/cart` performs a fresh GET; successful mutations update badge/`itemCount` from the response.

### Layout and content

- [ ] Desktop uses the right drawer with backdrop; mobile uses `/cart`.
- [ ] Lines are a vertical list with image, category, name, remove, stepper, and line total.
- [ ] Ukrainian copy matches the design: title, plural count, subtotal/delivery/together labels, CTAs, and empty state.
- [ ] Empty state hides totals and checkout CTA and offers «Перейти до каталогу».
- [ ] Stepper max is `min(stockQuantity, 12)`.

### Interactions

- [ ] Header opens drawer (desktop) or `/cart` (mobile); drawer closes via ×, backdrop, and Escape.
- [ ] Quantity updates and remove work without confirmation dialogs.
- [ ] Product image/name navigates to `/catalog/:slug`.
- [ ] «Оформити замовлення» only navigates to `/checkout`.
- [ ] Continue shopping / back / empty CTA behave as specified.
- [ ] In-flight line mutations disable that line’s stepper and remove until complete.

### States and feedback

- [ ] Loading shows a list skeleton; pending mutations are line-scoped.
- [ ] Empty and GET error (inline + «Спробувати ще») behave as specified.
- [ ] OOS limits the stepper; inactive lines show «Недоступний» and allow remove only.
- [ ] Successful qty change has no toast; successful remove shows «Видалено з кошика».
- [ ] Mutation errors toast and roll back; toasts dismiss in ~3 seconds.
- [ ] Closing the drawer does not clear the cart.

### Edge cases and scope

- [ ] Long names, many lines, missing images, price freshness, and stock races behave as specified.
- [ ] Guest and authenticated UX match; merge is not reimplemented here.
- [ ] The feature does not implement checkout logic, promo codes, clear-all UI, or admin cart tools.

# Feature: Оформлення замовлення

**Status:** Ready for implementation  
**Priority:** 4  
**Agent:** requirements-planner → backend + database + frontend → tester → plan-verifier → code-reviewer → security-reviewer

---

## Summary

Публічний чекаут дозволяє гостю або авторизованому покупцю оформити поточний кошик без реєстрації: контактні дані, доставка Новою Поштою, необовʼязковий коментар, підсумок замовлення, створення замовлення та перехід на сторінку підтвердження.

## Scope

Full-stack: ASP.NET Core API + Angular UI + PostgreSQL data access.

### In scope

- Публічна сторінка `/checkout` (форма + підсумок).
- Публічна сторінка підтвердження `/order/:id` (мінімальна, бо окремого макету немає).
- Розміщення замовлення з поточного кошика (`POST /api/orders`).
- Отримання деталей замовлення для підтвердження (`GET /api/orders/:id`).
- Guest checkout без логіну; для залогіненого — підстановка профілю та збереженої NP-адреси.
- Пошук міста / вибір відділення Нової Пошти (reuse NP API з auth).
- Валідація наявності товарів при оформленні; очищення кошика після успіху.
- Стани: порожній кошик, завантаження, валідація полів, помилки NP/оформлення.

### Out of scope

- Платіжний шлюз / онлайн-оплата.
- Промокоди та знижки.
- Розрахунок вартості доставки (лише текст «за тарифами Нової Пошти»).
- Адмін CRUD / зміна статусів замовлень.
- Повна історія замовлень (лише підтвердження щойно створеного; список — у auth/profile).
- Збереження адреси доставки в профіль із чекауту (лише підстановка вже збереженої).
- Альтернативні перевізники / адреса курʼєра.

## References

- Claude Design: `design/checkout.dc.html`
- Design system: `design/_ds/faino-naturalno-design-system-69873b7b-f6fd-41c1-a506-a953191d246d/`
- Product overview: `SPEC.md` (guest checkout без реєстрації; пріоритет після cart)
- Models: `specs/models.md` (Order, OrderItem, UserDeliveryAddress)
- API conventions: `specs/api.md` (Orders)
- Frontend architecture: `specs/frontend.md` (`/checkout`, `/order/:id`)
- Database schema: `specs/db.md` (orders, order_items)
- Related: `specs/features/cart.md` (кошик, підсумок, навігація на checkout)
- Related: `specs/features/auth.md` (профіль, NP city/branch, saved delivery address)

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

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/orders` | — | Place order from the current cart (guest or logged-in) |
| GET | `/api/orders/:id` | — (capability) | Order details for confirmation; requires `?token=` from POST (or JWT of order owner) |

Existing endpoints reused, not redefined here:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/cart` | Load cart lines for the checkout summary |
| DELETE | `/api/cart` | Clear cart after successful place (server may clear as part of place; client may also rely on empty cart after success) |
| GET | `/api/auth/me` | Prefill name / phone / email when logged in |
| GET | `/api/auth/me/delivery-address` | Prefill saved Nova Poshta address when logged in |
| GET | `/api/shipping/np/cities` | City search autocomplete |
| GET | `/api/shipping/np/branches` | Branches / parcel lockers for selected city |
| GET | `/api/orders` | User order list (profile / auth feature only) |

### 1.3 Cart identity and buyer

- The cart is identified by `X-Cart-Session-Id`, consistent with cart / catalog / product.
- Guests may place an order without JWT; `UserId` on the order is null.
- When JWT is present, the order is linked to that user (`UserId` set).
- Checkout does not require login and does not force registration.

### 1.4 POST `/api/orders`

#### Request

The body includes everything needed to create the order (not a cart-id-only call):

- Recipient first name and last name (UI fields; stored as a single `RecipientName`, e.g. «Імʼя Прізвище»)
- `Phone` — Ukrainian mobile, `+380…` (input may show a formatted mask; stored/normalized consistently with auth)
- `Email`
- Nova Poshta city identity + display name (and region when available)
- Nova Poshta branch / parcel-locker identity + display label
- Human-readable `DeliveryAddress` / summary line (city + branch text), suitable for order storage and confirmation
- Optional `Comment`

Line items and totals are taken from the **current server cart** for the session (and user after merge), not invented by the client.

#### Server rules on place

- Empty cart → fail; do not create an order.
- Every cart line must refer to an **active** product with enough **stock** for the requested quantity.
- Inactive or insufficient-stock lines cause the place request to fail with a clear Ukrainian-facing error; no partial order is created.
- Unit prices on `OrderItem` are snapshots of the **current** product price at place time.
- `TotalAmount` equals the sum of line totals (subtotal); delivery is not added as a numeric amount.
- New orders start with status **Pending**.
- `OrderNumber` is a unique human-readable value (same style as existing samples, e.g. `FN-YYYY-NNNN`).
- On success, the cart used for the order is **cleared / emptied**.
- Stock is reduced by the ordered quantities as part of a successful place (inventory must stay consistent).

#### Success response

Enough data to navigate to confirmation without an immediate extra call if desired, including at least:

- Order `id`
- `orderNumber`
- `status`
- `totalAmount`
- Created timestamp when useful for the confirmation UI
- `confirmationToken` — opaque capability for `GET /api/orders/:id?token=…` (guest redirect; do not persist beyond the confirmation URL)

### 1.5 GET `/api/orders/:id`

Public for guests **with** the confirmation token from place (`?token=`), so `/order/:id?token=…` works after redirect without login.

Access rules:

- Valid `token` matching the order’s stored hash → full confirmation payload.
- Authenticated JWT whose user owns the order (`UserId`) → same payload without token (profile / owner).
- Missing/invalid token and not the owner → not-found style failure (no existence oracle).

Response data includes:

- `id`, `orderNumber`, `status`, `totalAmount`, `createdAt`
- Recipient name, phone, email
- Delivery address summary (Nova Poshta text)
- Optional comment when present
- Line items: product name, quantity, unit price, line total (and category / image when available for a richer confirmation)

Unknown id or unauthorized → not-found style failure (`success: false`, no usable data).

This feature does **not** implement listing, filtering, or admin status updates.

### 1.6 Prefill for logged-in buyers

When the buyer is authenticated and opens `/checkout`:

- Contact fields prefill from profile: first name, last name, phone (if set), email.
- If a saved delivery address exists, city and branch are prefilled and the saved-address banner is shown (see §2.4).
- Guest opens with empty contact/delivery fields (except any client-only draft if the implementation keeps ephemeral form state — not required).

Prefill does not auto-save address changes back to the profile.

### 1.7 Nova Poshta (reuse)

Same behavior as auth delivery address:

- City search by typed query; empty match set is valid («Нічого не знайдено — перевірте написання»).
- Branches load only after a city is selected.
- Place order requires both city and branch selected.
- Branch list may include departments and parcel lockers (labels as returned by NP APIs).

### 1.8 Loading and refresh

- Opening `/checkout` loads a fresh cart for the summary.
- Logged-in prefill loads profile / delivery address when needed.
- After successful place, navigate to `/order/:id` and load confirmation (or use POST payload then optionally refresh).
- No long-lived client cache of order placement results beyond the confirmation page visit.

---

## 2. UI

### 2.1 Surfaces and routes

| Surface | Behavior |
|---------|----------|
| Desktop `/checkout` | Two columns: form left, sticky order summary right |
| Mobile `/checkout` | Single column: compact summary on top, then contact → delivery → comment → CTA; back control in top bar |
| `/order/:id` | Simple confirmation: order number, status, summary of lines and total (minimal page; no dedicated design file) |

The pages are public for guests and logged-in buyers. There is no admin checkout UI.

### 2.2 Page chrome and copy

- Eyebrow / context: «Файно натурально — оформлення»
- Title: «Оформлення замовлення» (mobile top bar may shorten to «Оформлення»)
- Supporting line may explain form left / summary right (desktop design); keep customer-facing labels Ukrainian from the design
- Visual language: warm kraft / espresso / marigold, shared design-system inputs, buttons, icons
- Currency: ₴

### 2.3 Contact block (step 1)

- Heading «Контактні дані»
- Fields: «Імʼя», «Прізвище», «Телефон», «Ел. пошта»
- Desktop: name pair in one row; phone + email in one row
- Mobile: name pair in one row; phone and email stacked full width
- All four fields required

### 2.4 Delivery block (step 2)

- Heading «Доставка Новою Поштою» with Nova Poshta badge
- **Saved address banner** (logged-in with saved address): marigold info strip — «Збережена адреса підставлена», summary text, link «Змінити»
  - «Змінити» reveals / focuses the city + branch editors so the buyer can pick another address for this order only
- **City**: search input, placeholder «Почніть вводити місто…», autocomplete dropdown (name + region); empty results message as in design
- **Branch**: select; disabled until city chosen with placeholder «Спочатку оберіть місто»; when ready, «Оберіть відділення»; while loading, spinner row «Завантажуємо відділення…»
- Static hint: «Орієнтовно: 2–3 робочі дні»

### 2.5 Comment block (step 3)

- Heading «Коментар до замовлення» with «— необовʼязково»
- Textarea placeholder «Побажання щодо замовлення чи доставки…» (mobile may shorten slightly)
- Optional; empty is allowed

### 2.6 Primary CTA

- Full-width primary button «Оформити замовлення»
- Disabled / busy while submit is in flight

### 2.7 Order summary panel

Desktop sticky panel «Ваше замовлення» with link «Редагувати» → `/cart` (or opens cart drawer on desktop if that is the established cart entry; navigating to edit cart contents is required).

Each line shows:

- Thumbnail (or «фото» placeholder) with quantity badge
- Product name and category
- Line total in ₴

Totals:

- «Сума товарів» — cart subtotal
- «Доставка» — copy only: «за тарифами Нової Пошти» (no numeric delivery fee)
- «Разом» — equals subtotal

Mobile compact summary: «Замовлення · {N товар/товари/товарів}», «Разом», «Редагувати».

### 2.8 Confirmation page `/order/:id`

Minimal, coherent with the shop language:

- Clear success heading (e.g. «Замовлення оформлено»)
- Order number prominently
- Status label (Pending shown in Ukrainian, e.g. «Очікує підтвердження» / equivalent badge wording aligned with profile status labels when they exist)
- Short list of lines (name × qty, line totals) and «Разом»
- Delivery summary and contact when useful
- CTA back to catalog (e.g. «Продовжити покупки» → `/catalog`)

No payment instructions beyond optional plain text that delivery is paid per Nova Poshta tariffs (optional; keep light).

---

## 3. Interactions

### 3.1 Entry and empty cart

- Buyer reaches `/checkout` from cart «Оформити замовлення».
- If the cart is empty (or becomes empty): do **not** show a workable checkout form; redirect to `/cart` (empty state) or `/catalog`. Prefer `/cart` so the empty-cart messaging stays consistent.
- Mobile «Назад» returns to the previous page or `/cart`.

### 3.2 Form editing

- Typing in city search updates matches; selecting a city loads branches and clears any previous branch selection.
- Changing city after a branch was chosen clears the branch.
- «Змінити» on the saved-address banner switches into editable city/branch mode.
- «Редагувати» in the summary goes to the cart to change quantities / lines; returning to checkout reloads the summary from the cart.

### 3.3 Submit

- «Оформити замовлення» validates required fields client-side, then calls `POST /api/orders`.
- On success: clear local cart badge / empty cart state, navigate to `/order/:id?token=…` using `confirmationToken` from the place response.
- On failure: stay on checkout; show field errors and/or error toast (§5); do not clear the cart.
- No confirmation dialog before submit.
- Concurrent submits are prevented (one in-flight place request).

### 3.4 Confirmation

- Opening `/order/:id` loads order details when not already present from the place response.
- No edit-order or cancel-order actions in this feature.

### 3.5 Auth

- No login wall on checkout.
- Optional soft hint to log in is **not** required by the design; omit unless already a global pattern.

---

## 4. States and transitions

### Initial loading (`/checkout`)

- Cart summary area shows a skeleton / loading treatment until cart data arrives.
- Form chrome may render; submit stays inactive until cart is loaded and non-empty.
- Logged-in prefill may briefly show empty fields then fill — avoid flashing incorrect empty submit if profile is still loading (disable submit until prefill attempt finishes or fails softly).

### Empty cart

- Redirect away from checkout (§3.1); do not allow placing an empty order.

### NP city / branch states

| State | Behavior |
|-------|----------|
| No city | Branch control disabled; «Спочатку оберіть місто» |
| City searching | Autocomplete open with matches or empty-copy |
| Branches loading | Spinner + «Завантажуємо відділення…» |
| Branches ready | Select enabled; buyer must pick a branch |
| NP API failure | Inline or toast error; buyer can retry city/branch load |

### Validation (before / on submit)

- Missing required fields: inline errors under the fields (Ukrainian).
- Invalid phone (`+380…`): field error.
- Invalid email: field error.
- City or branch missing: field / section error.

### Submit pending

- Primary button disabled with waiting indicator; fields remain visible (may stay editable or locked — prefer locked inputs during submit to avoid mismatched payload).

### Place success

- Redirect to `/order/:id`; cart empty; header badge `0`.

### Place failure (stock / inactive / server)

- Error toast with API message when suitable, otherwise «Не вдалося оформити замовлення».
- Cart contents remain; buyer may edit cart via «Редагувати» and retry.
- If specific lines are unavailable, the message should make that clear enough to fix the cart.

### Confirmation loading / error

- Loading skeleton or short waiting state on `/order/:id`.
- Not found / load error: Ukrainian inline message and link to catalog (and retry when transient).

### Persistence

- Form field values need not survive a full browser refresh (acceptable default).
- Cart and placed orders persist on the server.
- Confirmation remains reachable by `/order/:id` after leaving the page.

---

## 5. Feedback

- Successful place: no success toast required on checkout — the confirmation page is the success feedback.
- Failed place: error toast; auto-dismiss ~3 seconds (same timing as cart / catalog / product).
- Field validation errors stay inline under fields until corrected.
- NP load failures: toast or inline retry in the delivery block.
- Cart GET failure on checkout: inline error with «Спробувати ще» in the summary area; submit remains blocked.
- Confirmation load failure: inline, not necessarily a toast.
- Toasts announce without stealing focus.

---

## 6. Edge cases

- Long product names in the summary truncate with ellipsis (~two lines); full name via title/tooltip.
- Many cart lines: summary list scrolls; sticky desktop summary / mobile layout remains usable; no pagination.
- Missing product images use kraft / «фото» placeholder.
- Phone input accepts common UA formatting but validates as `+380` mobile.
- Very long comments are limited by storage (e.g. ~1000 chars); excess rejected with a field error.
- Price changes between add-to-cart and place: order stores **current** price at place time; summary before submit shows live cart prices (same as cart feature).
- Stock race: place fails; cart not cleared; buyer adjusts quantities.
- Inactive product still in cart: place fails until the line is removed.
- Guest places order → confirmation works without account via capability token in the redirect URL; order does not appear in profile until/unless linked (guest has no profile list).
- Logged-in buyer: order appears later in profile order list (auth feature); owner JWT may open confirmation without the token.
- Changing NP city clears branch; submitting without branch is blocked.
- Rapid double-click on «Оформити замовлення» results in a single in-flight request.
- Deep link to `/checkout` with empty cart redirects away.
- Deep link to unknown `/order/:id` (or id without a valid token) shows not-found, not a crash.
- Accessibility: labeled inputs, keyboard-operable city list and branch select, meaningful names for icon-only back control, disabled/busy submit exposed to assistive tech.
- Permission: confirmation PII is gated by opaque `confirmationToken` (or order-owner JWT); sequential id alone must not expose other buyers’ PII.

---

## Acceptance Criteria

### Data and API

- [ ] `POST /api/orders` places an order from the current cart for guest or authenticated buyer in the common API envelope.
- [ ] Place requires recipient name (first + last), `+380` phone, email, NP city + branch, optional comment; lines/totals come from the server cart.
- [ ] Empty cart, inactive products, or insufficient stock fail without creating an order; cart is not cleared on failure.
- [ ] Successful place creates Pending order with snapshot line prices, `TotalAmount` = goods subtotal, unique `OrderNumber`, clears the cart, and reduces stock.
- [ ] `GET /api/orders/:id` returns confirmation data when `?token=` matches (or JWT owner); unknown / unauthorized fails cleanly without leaking existence.
- [ ] NP city/branch endpoints from auth are reused; checkout does not redefine them.
- [ ] Logged-in checkout prefills profile contact fields and saved delivery address when present.

### Layout and content

- [ ] Desktop: form left + sticky summary right; mobile: compact summary then stacked sections; Ukrainian copy matches the checkout design.
- [ ] Contact, NP delivery (including saved-address banner + «Змінити»), optional comment, and «Оформити замовлення» behave as specified.
- [ ] Summary shows lines, «Сума товарів», delivery copy «за тарифами Нової Пошти», «Разом» = subtotal; «Редагувати» goes to cart.
- [ ] `/order/:id` shows order number, status, and a simple summary with a path back to the catalog.
- [ ] Payment gateway, promo codes, admin, and full order history are absent from this feature.

### Interactions

- [ ] Empty cart cannot stay on a workable checkout; redirect to `/cart` or catalog.
- [ ] City → branches flow and branch loading/disabled states match the design.
- [ ] Submit validates fields, calls place once, redirects to `/order/:id?token=…` on success, and keeps the buyer on checkout on failure.
- [ ] No login required; no confirmation dialog before place.

### States and feedback

- [ ] Loading, NP states, inline validation, submit busy, place error toast (~3s), and confirmation loading/not-found behave as specified.
- [ ] Success feedback is the confirmation page; cart badge is empty after success.

### Edge cases and scope

- [ ] Long names, many lines, missing images, stock/price races, guest vs logged-in linkage, and accessibility basics behave as specified.
- [ ] The feature does not implement payment, delivery fee calculation, promo codes, admin status tools, or profile address save-from-checkout.

# Feature: Авторизація та профіль

**Status:** Ready for implementation  
**Priority:** 5  
**Agent:** requirements-planner → backend + database + frontend → tester → plan-verifier → code-reviewer → security-reviewer

---

## Summary

Покупець може зареєструватися, увійти, вийти, скинути пароль, керувати профілем і адресою доставки Нової Пошти, переглядати свої замовлення; після входу або реєстрації guest-кошик зливається з кошиком користувача.

## Scope

Full-stack: ASP.NET Core API + Angular UI + PostgreSQL data access.

### In scope

- Реєстрація, вхід, вихід, JWT access + refresh.
- Окремі сторінки `/auth/login`, `/auth/register`, потік «Забули пароль?», захищена `/profile`.
- Профіль: особисті дані (ім’я, прізвище, телефон), ініціали-аватар, «з нами від …».
- Збережена адреса доставки Нової Пошти (місто + відділення/поштомат).
- Блок «Мої замовлення» (останні 20; клік веде на сторінку замовлення).
- Злив guest-кошика (`X-Cart-Session-Id`) у кошик користувача після успішного login/register.
- Узгодження з існуючими контрактами `POST /auth/register|login|refresh|logout` і `GET /orders` (User).

### Out of scope

- Адмін-панель і `IsAdmin`-UI.
- Зміна email після реєстрації.
- Видалення акаунта або видалення адреси доставки (лише зміна адреси).
- Соціальний вхід (роздільник «або» у макеті — лише перехід на реєстрацію/вхід).
- Повна реалізація сторінки деталі замовлення / checkout (крім навігації з рядка замовлення та підказки, що адреса з профілю підставляється на оформленні).
- Product detail і повний кошик поза merge після auth.

## References

- Claude Design: `design/auth.dc.html`
- Design system: `design/_ds/faino-naturalno-design-system-69873b7b-f6fd-41c1-a506-a953191d246d/`
- Product overview: `SPEC.md`
- Models: `specs/models.md`
- API conventions: `specs/api.md`
- Frontend architecture: `specs/frontend.md` (для цієї фічі auth — **окремі сторінки**, не modal)
- Database schema: `specs/db.md`
- Related: `specs/features/catalog.md` (guest cart / session)

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
| POST | `/api/auth/register` | — | Create account; return tokens + user |
| POST | `/api/auth/login` | — | Authenticate; return tokens + user |
| POST | `/api/auth/refresh` | — | Issue new access token using refresh |
| POST | `/api/auth/logout` | User | Invalidate current client refresh token |
| POST | `/api/auth/forgot-password` | — | Request password-reset email |
| POST | `/api/auth/reset-password` | — | Set new password using reset token |
| GET | `/api/auth/me` | User | Current user + profile fields needed by UI |
| PUT | `/api/auth/me` | User | Update first name, last name, phone |
| GET | `/api/auth/me/delivery-address` | User | Saved Nova Poshta delivery address |
| PUT | `/api/auth/me/delivery-address` | User | Save / replace delivery address |
| GET | `/api/shipping/np/cities` | — | Search cities (query text) |
| GET | `/api/shipping/np/branches` | — | Branches/parcel lockers for a selected city |
| GET | `/api/orders` | User | Current user’s orders |
| POST | `/api/cart/merge` | User | Merge guest session cart into user cart |

Exact path names may align with project conventions as long as the capabilities above are covered and existing auth/order routes remain consistent with `specs/api.md`.

### 1.3 Register and login

#### Register request

- First name (required)
- Last name (required)
- Email (required, unique, case-insensitive)
- Password (required, minimum 8 characters)

Password confirmation is validated on the client only and is not sent as a separate persisted field.

#### Login request

- Email
- Password

#### Success response data

Both register and login return:

- Access token
- Refresh token
- Full user payload sufficient for the profile UI without an immediate follow-up call: at least first name, last name, email, optional phone, registration date (for «з нами від …»), and admin flag if already part of the user model

After success, the client merges the guest cart (session id) into the authenticated cart.

### 1.4 Refresh and logout

- Refresh exchanges a valid refresh token for a new access token (and refresh rotation if the project adopts it).
- Logout invalidates the refresh token for the **current client** only; other devices/sessions may remain valid.

### 1.5 Current user and profile update

- `GET` current user returns the same user fields shown on `/profile`.
- `PUT` updates first name, last name, and optional phone only.
- Email is not changeable through this feature.
- Phone, when provided, must match a UA mobile format starting with `+380`.

### 1.6 Password reset

1. User submits email on the forgot-password page.
2. Server accepts the request; for unknown emails the API still returns the **same success outcome** (no account enumeration).
3. User opens the link from the email (token in the URL) and sets a new password + confirmation (confirmation client-side).
4. Invalid or expired token yields a clear failure the UI can explain, with an option to request a new email.

### 1.7 Nova Poshta delivery address

Saved address includes enough data to display and later pre-fill checkout:

- City identity and display name (and region when available)
- Branch / parcel-locker identity and display label
- Human-readable summary line (as in the design: city + branch text)

Rules:

- Save is allowed only when both city and branch are selected.
- Get returns empty/absent when the user has never saved an address.
- Replace on save; no delete endpoint in this feature.
- City search returns matches by typed query; empty match set is a valid result.
- Branches are listed only after a city is chosen.

### 1.8 Orders on profile

- `GET /api/orders` returns the authenticated user’s orders, newest first.
- Profile UI shows at most the **last 20**.
- Each list item exposes: order number, created date, item count, total amount, status suitable for the design badges.

### 1.9 Cart merge

- After successful register or login, the guest cart identified by `X-Cart-Session-Id` is merged into the user’s cart.
- Merge happens without an extra confirmation step for the shopper.
- Cart badge / contents reflect the merged result after auth.

### 1.10 Caching and refetch

- Auth session (tokens + known current user) persists across full page reloads while tokens remain valid.
- `/profile` loads user, delivery address, and orders when opened (or when returning after save).
- After profile or address save, displayed data reflects the saved values.
- After logout, auth state and protected profile data are cleared.

---

## 2. Auth and profile UI

### 2.1 Form factor and routes

- Auth is **separate full pages**, not a modal (overrides the modal note in `specs/frontend.md` for this feature).
- Routes: `/auth/login`, `/auth/register`, forgot-password request page, reset-password page (token from link), `/profile`.
- Visual language follows `design/auth.dc.html` and the shared design system (logo, kraft/marigold/espresso, Input/Button/Badge/Icon).
- All customer-facing copy is Ukrainian and matches the design wording where present.

### 2.2 Login page

- Logo, heading «З поверненням!», supporting line about continuing purchases.
- Fields: email, password.
- Link «Забули пароль?» → forgot-password flow.
- Primary action «Увійти».
- Link to register («Немає акаунту? Зареєструватись»).
- Divider «або» does not introduce social providers.

### 2.3 Register page

- Logo, heading «Приєднуйтесь», supporting line.
- Fields: first name, last name, email, password (placeholder communicates minimum 8 characters), confirm password.
- Primary action «Зареєструватись».
- Link to login («Вже маєте акаунт? Увійти»).

### 2.4 Forgot / reset password pages

- Request: email field and submit; success messaging does not reveal whether the email is registered.
- Reset (from email link): new password, confirm password, submit.
- Invalid/expired link: explanation and path back to request a new email.

### 2.5 Profile page

#### Layout

| Viewport | Arrangement |
|----------|-------------|
| Desktop | Left: identity card + logout; right: personal data, delivery address, my orders |
| Mobile | Single column: identity, personal data, address, orders, logout (as in design) |

#### Identity card

- Circular avatar showing initials derived from first and last name.
- Full name, email, accent line «з нами від {year}» from registration date.
- «Вийти» control (chili tone, with logout icon).

#### Personal data

- Editable: first name, last name, phone.
- Email is shown on the identity card only, not as an editable field.
- «Зберегти зміни».

#### Delivery address (Nova Poshta)

- When saved and not editing: cream summary card with «Нова Пошта», address text, «Змінити».
- When absent or editing: city autocomplete (search icon, list with city name + region), then branch select.
- Before city selection, branch control is disabled with «Спочатку оберіть місто»; save disabled.
- Empty city search: «Нічого не знайдено — перевірте написання» (mobile may use the shorter variant from the design).
- Actions: «Зберегти адресу», «Скасувати» when leaving an existing saved address edit.

#### My orders

- Vertical list, newest first.
- Desktop row: order number, meta (date · item count), total, status badge.
- Mobile row: compact (number, total, status) as in the design.
- Empty: short message «Поки немає замовлень» (no fake rows).
- Selecting a row navigates to the order page route; implementing that page’s content is out of scope if not already present.

### 2.6 Public vs protected

- Login, register, forgot, and reset pages are public.
- `/profile` requires authentication.
- Admin UI is not part of this feature.

---

## 3. User interactions

- User can switch between login and register via the footer links.
- User can complete forgot-password → email → reset form with new password.
- Profile save updates personal fields without changing email.
- Address flow: search city → pick city → pick branch → save; cancel returns to saved view when one existed.
- Logout ends the current client session.
- Order row navigates to the order page.
- No confirmation dialogs for logout, form submits, profile save, or address save.
- No account deletion and no address deletion actions.

---

## 4. States and transitions

### Loading

- `/profile` shows skeletons / placeholders for identity, forms, address, and orders until data arrives.
- While a form request is in flight (login, register, reset, profile save, address save), the primary button is disabled and shows a waiting indicator; field values are kept.

### Empty

- No orders → empty copy, no placeholder order rows.
- No saved address → address form is shown immediately (not the «saved» card).

### Error

- Failed load of profile, address, or orders → inline Ukrainian message in the affected area and «Спробувати ще».
- Form validation / API business errors → under the relevant fields (or top of form); entered values are preserved.

### Navigation persistence

- Tokens persist across page refresh while valid.
- After login/register: redirect to the return URL if the user came from a protected/deep link; otherwise `/profile`.
- Unauthenticated visit to `/profile` → redirect to login (preserving return intent).
- Already authenticated visit to `/auth/*` → redirect to `/profile`.
- After logout → home (or login); auth state cleared.

---

## 5. Feedback

### Success toasts

Short Ukrainian toasts after:

- Login — e.g. «Ви увійшли»
- Register — e.g. «Акаунт створено»
- Logout — e.g. «Ви вийшли»
- Profile save — e.g. «Зміни збережено»
- Address save — e.g. «Адресу збережено»
- Forgot-password request — e.g. «Лист для скидання пароля надіслано»
- Password reset complete — e.g. «Пароль оновлено»

### Errors

- Field/form errors appear under fields (or on the form), chili-tone styling, Ukrainian wording (no raw technical codes for shoppers).
- Network / unexpected server failures outside a specific field may use an error toast.

### Dismissal

- Toasts auto-dismiss after approximately **3 seconds** and can be closed manually.

---

## 6. Accessibility and input behavior

- Interactive controls are keyboard operable with a visible focus state.
- Password and email fields use appropriate input types.
- Icon-only or icon+text logout controls have meaningful accessible names.
- City list and branch select are operable by keyboard.
- Loading, empty, error, and toast changes are available to assistive technologies without unexpected focus jumps.
- Touch targets follow the mobile design (comfortable tap areas on auth and profile controls).

---

## 7. Edge cases

- Long names, emails, and branch labels truncate with ellipsis in cards/lists; full text remains available in form fields; sensible maximum lengths are enforced by validation.
- Password minimum length is 8; confirm password must match on register and reset.
- Duplicate email on register shows a clear field error.
- Email uniqueness and login lookup are **case-insensitive**.
- Forgot-password for an unknown email uses the same success messaging as for a known email.
- Invalid or expired reset token shows explanation and a path to request again.
- Nova Poshta: empty city results as designed; many branches scroll inside the select; save requires city + branch.
- Profile order list caps at 20 newest; no pagination in this feature.
- Multiple concurrent sessions/devices are allowed; logout invalidates only the current client’s refresh token.
- Users may only access their own profile data and orders.
- Phone is optional; when present must be valid `+380…` format or show a field error.
- Logged-in users opening auth routes are sent to `/profile`.

---

## Acceptance Criteria

### Data and API

- [ ] Register and login return access token, refresh token, and full user in the common API envelope.
- [ ] Refresh and logout behave as specified; logout invalidates the current client refresh token.
- [ ] Current-user read and profile update support first name, last name, and optional phone; email cannot be changed.
- [ ] Password reset request and token-based set-password work; unknown email on request does not reveal account existence.
- [ ] Email uniqueness/login is case-insensitive; password minimum is 8 characters.
- [ ] Nova Poshta city search, branch list, and get/save delivery address work; save requires city and branch.
- [ ] Authenticated orders list returns newest-first data suitable for the profile UI.
- [ ] After login/register, guest cart (`X-Cart-Session-Id`) merges into the user cart without an extra confirmation.

### Layout and content

- [ ] Auth uses separate pages (`/auth/login`, `/auth/register`, forgot/reset, `/profile`), not a modal.
- [ ] Login, register, and profile match `design/auth.dc.html` layout and Ukrainian copy.
- [ ] Profile identity shows initials avatar, name, email, and «з нами від …».
- [ ] Desktop profile is two-column; mobile is single-column as designed.
- [ ] Orders display as a vertical list (newest first) with number, date·count (desktop), total, and status badge.

### Interactions and access

- [ ] Users can register, log in, log out, reset password, edit profile fields, and save/change NP address.
- [ ] No confirmation dialogs for logout or saves; no account/address delete; no email edit.
- [ ] Auth pages are public; `/profile` is protected; logged-in users hitting `/auth/*` go to `/profile`.
- [ ] Guests hitting `/profile` are redirected to login; logout clears session and leaves protected views.
- [ ] Order row navigates to the order page route.

### States and feedback

- [ ] Profile loading uses skeletons; submit disables the primary button and keeps field values.
- [ ] Empty orders and empty address states match the agreed copy/behavior.
- [ ] Load failures offer inline error and retry; form errors stay under fields.
- [ ] Success toasts appear for the listed auth/profile/address/password actions and dismiss after ~3 seconds.
- [ ] Network/unexpected errors can surface as error toasts; chili-tone Ukrainian messaging.

### Edge cases and scope

- [ ] Long text truncates safely in lists; NP empty search and large branch lists remain usable.
- [ ] Profile shows at most 20 recent orders.
- [ ] Optional phone validates `+380` when provided.
- [ ] Admin UI, social login, email change, account/address deletion, and full order-detail/checkout implementation remain out of scope.

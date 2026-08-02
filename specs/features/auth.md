# Feature: Авторизація та профіль

**Status:** Implemented  
**Priority:** 5  
**Agent:** requirements-planner → backend + database + frontend → tester → plan-verifier → code-reviewer → security-reviewer

> Includes logged-in **change password** on `/profile`, `passwordChangedAt`, session rules on password change, and **4-step** forgot/reset UI matching `design/auth.dc.html`.

---

## Summary

Покупець може зареєструватися, увійти, вийти, змінити пароль у профілі, скинути пароль через email (4 кроки), керувати профілем і адресою доставки Нової Пошти, переглядати свої замовлення; після входу або реєстрації guest-кошик зливається з кошиком користувача.

## Scope

Full-stack: ASP.NET Core API + Angular UI + PostgreSQL data access.

### In scope

- Реєстрація, вхід, вихід, JWT access + refresh.
- Окремі сторінки `/auth/login`, `/auth/register`, повний потік «Забули пароль?» (4 кроки), захищена `/profile`.
- Профіль: особисті дані (ім’я, прізвище, телефон), ініціали-аватар, «з нами від …».
- Профіль: блок безпеки «Змінити пароль» (згорнутий / розгорнутий) з індикатором сили пароля.
- Збережена адреса доставки Нової Пошти (місто + відділення/поштомат).
- Блок «Мої замовлення» (останні 20; клік веде на сторінку замовлення).
- Злив guest-кошика (`X-Cart-Session-Id`) у кошик користувача після успішного login/register.
- Узгодження з існуючими контрактами `POST /auth/register|login|refresh|logout` і `GET /orders` (User).

### Out of scope

- Адмін-панель і `IsAdmin`-UI (немає окремого admin change-password UI).
- Зміна email після реєстрації.
- Видалення акаунта або видалення адреси доставки (лише зміна адреси).
- Соціальний вхід (роздільник «або» у макеті — лише перехід на реєстрацію/вхід).
- Реальна SMTP-доставка листів (non-prod: log-only email sender; prod SMTP — окремий slice).
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
| POST | `/api/auth/change-password` | User | Change password while logged in |
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
- Password (required, minimum 8 characters, maximum 128)

Password confirmation is validated on the client only and is not sent as a separate persisted field.

#### Login request

- Email
- Password

#### Success response data

Both register and login return:

- Access token
- Refresh token
- Full user payload sufficient for the profile UI without an immediate follow-up call: at least first name, last name, email, optional phone, registration date (for «з нами від …»), optional `passwordChangedAt`, and admin flag if already part of the user model

After success, the client merges the guest cart (session id) into the authenticated cart.

### 1.4 Refresh and logout

- Refresh exchanges a valid refresh token for a new access token (and refresh rotation if the project adopts it).
- Logout invalidates the refresh token for the **current client** only; other devices/sessions may remain valid.

### 1.5 Current user and profile update

- `GET` current user returns the same user fields shown on `/profile`, including `passwordChangedAt` (nullable) and `createdAt`.
- `PUT` updates first name, last name, and optional phone only.
- Email is not changeable through this feature.
- Phone, when provided, must match a UA mobile format starting with `+380`.

### 1.6 Password reset

1. User submits email on the forgot-password page.
2. Server accepts the request; for unknown emails the API still returns the **same success outcome** (no account enumeration).
3. Reset token lifetime is **60 minutes** (`PasswordResetTokenHours: 1`); UI copy must say «60 хвилин».
4. User opens the link from the email (token in the URL) and sets a new password + confirmation (confirmation client-side).
5. Request body remains: token + password (no new fields). Email shown on the «sent» screen is held by the client from step 1.
6. On successful reset: set new password hash, set `passwordChangedAt` to now, invalidate **all** refresh sessions for that user.
7. Invalid or expired token yields a clear failure the UI can explain, with an option to request a new email.
8. Email delivery in non-prod remains log-only; real SMTP is out of scope for this slice.

### 1.7 Change password (logged-in)

- Authenticated `POST /api/auth/change-password`.
- Request: `currentPassword`, `newPassword` (confirm password is client-only).
- Server validates: current password correct; new password min 8 / max 128; new password must differ from current.
- Success response: message-style payload consistent with forgot/reset (e.g. `{ message }`), not a full token re-issue unless needed to keep the current session.
- On success: update password hash, set `passwordChangedAt` to now; **keep the current device logged in**; invalidate **other** refresh-token sessions.
- Wrong current password: clear Ukrainian error (HTTP 400 style business error); no extra lockout beyond existing auth rate limits.

### 1.8 Nova Poshta delivery address

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

### 1.9 Orders on profile

- `GET /api/orders` returns the authenticated user’s orders, newest first.
- Profile UI shows at most the **last 20**.
- Each list item exposes: order number, created date, item count, total amount, status suitable for the design badges.

### 1.10 Cart merge

- After successful register or login, the guest cart identified by `X-Cart-Session-Id` is merged into the user’s cart.
- Merge happens without an extra confirmation step for the shopper.
- Cart badge / contents reflect the merged result after auth.

### 1.11 Caching and refetch

- Auth session (tokens + known current user) persists across full page reloads while tokens remain valid.
- `/profile` loads user, delivery address, and orders when opened (or when returning after save).
- After profile or address save, displayed data reflects the saved values.
- After successful change password: refetch current user (updated `passwordChangedAt`), collapse the password card, clear form fields.
- Open/expanded password form state does **not** persist across navigation away from `/profile`.
- After logout, auth state and protected profile data are cleared.

---

## 2. Auth and profile UI

### 2.1 Form factor and routes

- Auth is **separate full pages**, not a modal (overrides the modal note in `specs/frontend.md` for this feature).
- Routes: `/auth/login`, `/auth/register`, forgot-password (steps 1–2), reset-password (steps 3–4; token from link), `/profile`.
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

### 2.4 Forgot / reset password — 4 steps

Matches `design/auth.dc.html` password-reset flow (not toast-only for sent/success).

#### Step 1 — «Забули пароль?»

- Centered card with key icon, heading «Забули пароль?», supporting line about sending a recovery link.
- Field: «Ел. пошта».
- Primary: «Надіслати посилання».
- Link: «← Назад до входу».

#### Step 2 — «Перевірте пошту»

- Shown after the API accepts the forgot request (always the same outcome; no account enumeration).
- Mail-check icon, heading «Перевірте пошту», body shows the submitted email (client-held).
- Tip card: spam reminder + «посилання діє 60 хвилин».
- Secondary: «Надіслати ще раз» (re-submits forgot with the same email).
- Link back to login.
- Long emails truncate gracefully in the display.

#### Step 3 — «Новий пароль»

- Opened from email link with token in the URL query.
- Logo, heading «Новий пароль», supporting line about a reliable password (min 8 characters).
- Fields: «Новий пароль» (placeholder «Мінімум 8 символів») with **client-only strength meter** (labels: «Слабкий» / «Середній» / «Надійний»), «Підтвердіть пароль».
- Primary: «Зберегти пароль».
- Missing / invalid / expired token: clear Ukrainian explanation and link to request a new email (forgot page).

#### Step 4 — «Пароль змінено»

- Success screen (not toast-only): green check, heading «Пароль змінено», supporting «Тепер можна увійти з новим паролем.»
- Primary: «Увійти» → login page.
- No auto-login after reset.

### 2.5 Profile page

#### Layout

| Viewport | Arrangement |
|----------|-------------|
| Desktop | Left: identity card + logout; right: personal data, **change password**, delivery address, my orders |
| Mobile | Single column: identity, personal data, **change password**, address, orders, logout (as in design) |

#### Identity card

- Circular avatar showing initials derived from first and last name.
- Full name, email, accent line «з нами від {year}» from registration date.
- «Вийти» control (chili tone, with logout icon).

#### Personal data

- Editable: first name, last name, phone.
- Email is shown on the identity card only, not as an editable field.
- «Зберегти зміни».

#### Change password (security)

- Placed under personal data and before delivery address (desktop and mobile).
- Eyebrow «Безпека», title «Змінити пароль».
- **Collapsed (default):** cream row with lock icon, masked `••••••••••`, subtitle «Остання зміна — {date}», control «Змінити».
- Date uses `passwordChangedAt ?? createdAt`, formatted as full Ukrainian date with year (e.g. «12 травня 2026») on desktop and mobile.
- **Expanded:** fields «Поточний пароль», «Новий пароль» (placeholder «Мінімум 8 символів») + strength meter, «Підтвердіть новий пароль»; actions «Оновити пароль» / «Скасувати».
- Mobile uses the same card with **inline** expand/collapse (not a separate route or sheet).
- Strength meter is client-only UX; server enforces min 8 / max 128 only (same as register).
- No separate admin password UI.

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
- `/profile` (including change password) requires authentication.
- Admin UI is not part of this feature.

---

## 3. User interactions

- User can switch between login and register via the footer links.
- User can complete forgot → email-sent → reset form → success → login.
- Forgot step 1 submit → step 2; «Назад до входу» → login.
- Step 2 «Надіслати ще раз» re-calls forgot with the same email (subject to existing rate limits).
- Step 3: token from URL; submit → step 4 on success; invalid token → error + path to request again.
- Step 4 «Увійти» → login (no auto-login).
- Profile: «Змінити» expands password form; «Скасувати» collapses and clears fields; «Оновити пароль» submits.
- Change-password validation: required fields, min 8, confirm match, new ≠ current (client; server enforces current correct, min/max length, and new ≠ current).
- Profile save updates personal fields without changing email.
- Address flow: search city → pick city → pick branch → save; cancel returns to saved view when one existed.
- Logout ends the current client session.
- Order row navigates to the order page.
- No confirmation dialogs for logout, form submits, profile save, address save, password change, or password reset.
- Password visibility toggles: follow existing auth inputs / design system if already used; otherwise `type=password` only is acceptable.
- No account deletion and no address deletion actions.

---

## 4. States and transitions

### Loading

- `/profile` shows skeletons / placeholders for identity, forms, address, and orders until data arrives.
- While a form request is in flight (login, register, forgot, reset, change password, profile save, address save), the primary button is disabled and shows a waiting indicator; field values are kept.

### Empty

- No orders → empty copy, no placeholder order rows.
- No saved address → address form is shown immediately (not the «saved» card).
- Password card defaults to **collapsed**.

### Error

- Failed load of profile, address, or orders → inline Ukrainian message in the affected area and «Спробувати ще».
- Form validation / API business errors → under the relevant fields (or top of form); entered values are preserved.
- Change-password errors keep the form **expanded**.
- Reset step 3 missing/invalid/expired token → error state with path to forgot.

### Success

- Change password: toast «Пароль оновлено» + collapse card + clear fields + refreshed «Остання зміна».
- Reset: dedicated step 4 success screen (optional toast may still fire, but screen is primary).

### Navigation persistence

- Tokens persist across page refresh while valid.
- Expanded password form does not persist across leaving `/profile`.
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
- Change password — «Пароль оновлено»
- Forgot-password request — optional/supplementary; primary UX is step 2 screen (same messaging whether email exists)
- Password reset complete — optional/supplementary; primary UX is step 4 screen

### Errors

- Field/form errors appear under fields (or on the form), chili-tone styling, Ukrainian wording (no raw technical codes for shoppers).
- Wrong current password and validation failures are inline / form errors.
- Invalid/expired reset token: clear Ukrainian explanation.
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
- Long emails on reset step 2 truncate gracefully.
- Password minimum length is 8, maximum 128; confirm password must match on register, reset, and change password.
- New password must differ from current on change password.
- Duplicate email on register shows a clear field error.
- Email uniqueness and login lookup are **case-insensitive**.
- Forgot-password for an unknown email uses the same success path (step 2) as for a known email.
- Invalid or expired reset token shows explanation and a path to request again.
- Existing auth rate limits (including stricter forgot-password) remain in effect; no additional lockout for wrong current password beyond that.
- After change password, other devices must re-login; current device stays logged in.
- After reset, all sessions are invalid; user must log in again.
- Nova Poshta: empty city results as designed; many branches scroll inside the select; save requires city + branch.
- Profile order list caps at 20 newest; no pagination in this feature.
- Multiple concurrent sessions/devices are allowed; logout invalidates only the current client’s refresh token (unless password change/reset rules above apply).
- Users may only access their own profile data and orders; change password requires authentication.
- Phone is optional; when present must be valid `+380…` format or show a field error.
- Logged-in users opening auth routes are sent to `/profile`.

---

## Acceptance Criteria

### Data and API

- [ ] Register and login return access token, refresh token, and full user in the common API envelope.
- [ ] Refresh and logout behave as specified; logout invalidates the current client refresh token.
- [ ] Current-user read and profile update support first name, last name, and optional phone; email cannot be changed.
- [ ] `GET /auth/me` (and user DTO) expose nullable `passwordChangedAt` and `createdAt`.
- [ ] Password reset request and token-based set-password work; unknown email on request does not reveal account existence; token lifetime is 60 minutes.
- [ ] Successful reset sets `passwordChangedAt` and invalidates all refresh sessions.
- [ ] Change-password accepts `currentPassword` + `newPassword`; success is message-style; stays logged in on current device; invalidates other sessions; sets `passwordChangedAt`.
- [ ] Password rules: min 8, max 128; email uniqueness/login is case-insensitive.
- [ ] Nova Poshta city search, branch list, and get/save delivery address work; save requires city and branch.
- [ ] Authenticated orders list returns newest-first data suitable for the profile UI.
- [ ] After login/register, guest cart (`X-Cart-Session-Id`) merges into the user cart without an extra confirmation.

### Layout and content

- [ ] Auth uses separate pages (`/auth/login`, `/auth/register`, forgot/reset, `/profile`), not a modal.
- [ ] Login, register, and profile match `design/auth.dc.html` layout and Ukrainian copy.
- [ ] Profile identity shows initials avatar, name, email, and «з нами від …».
- [ ] Desktop profile is two-column; mobile is single-column as designed.
- [ ] Profile includes change-password card (collapsed/expanded) with strength meter; mobile expands inline; «Остання зміна» uses `passwordChangedAt ?? createdAt` with Ukrainian date including year.
- [ ] Forgot/reset UI implements the four design steps (request, check email with 60-хвилин tip + resend, new password + strength meter, success → Увійти).
- [ ] Orders display as a vertical list (newest first) with number, date·count (desktop), total, and status badge.

### Interactions and access

- [ ] Users can register, log in, log out, change password, reset password, edit profile fields, and save/change NP address.
- [ ] No confirmation dialogs for logout, saves, password change, or reset; no account/address delete; no email edit.
- [ ] Auth pages are public; `/profile` is protected; logged-in users hitting `/auth/*` go to `/profile`.
- [ ] Guests hitting `/profile` are redirected to login; logout clears session and leaves protected views.
- [ ] Order row navigates to the order page route.

### States and feedback

- [ ] Profile loading uses skeletons; submit disables the primary button and keeps field values.
- [ ] Empty orders and empty address states match the agreed copy/behavior.
- [ ] Load failures offer inline error and retry; form errors stay under fields; change-password errors keep the form open.
- [ ] Change-password success: toast «Пароль оновлено», collapse, clear fields, refetch `me`.
- [ ] Reset success uses step 4 screen; forgot acceptance always shows step 2.
- [ ] Success toasts for listed auth/profile/address/password actions dismiss after ~3 seconds.
- [ ] Network/unexpected errors can surface as error toasts; chili-tone Ukrainian messaging.

### Edge cases and scope

- [ ] Long text truncates safely in lists and on reset step 2 email display; NP empty search and large branch lists remain usable.
- [ ] Profile shows at most 20 recent orders.
- [ ] Optional phone validates `+380` when provided.
- [ ] Wrong current password shows a clear error; other sessions need re-login after change; all sessions after reset.
- [ ] Admin UI, social login, email change, account/address deletion, real SMTP, and full order-detail/checkout implementation remain out of scope.

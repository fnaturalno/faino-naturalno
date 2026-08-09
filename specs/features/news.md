# Feature: Новини (News)

**Status:** Ready for implementation  
**Priority:** Content / after About  
**Agent:** requirements-planner → backend + database + frontend → tester → plan-verifier → code-reviewer → security-reviewer

---

## Summary

Публічна стрічка статей магазину («Новини» / «News»): список опублікованих постів і сторінка статті за `slug`, з двомовним контентом UK/EN і повним admin CRUD. Сторінка «Про нас» не змінюється — згадка про «блог» там лише наратив.

## Scope

Full-stack: ASP.NET Core API + Angular UI + PostgreSQL.

### In scope

- Сутність новини в БД з bilingual полями й публікаційними прапорцями.
- Публічні маршрути `/:locale/news` (список) і `/:locale/news/:slug` (деталь).
- Публічний API: список лише опублікованих (пагінація, sort), деталь за slug.
- Admin CRUD: список (включно з чернетками), створення, редагування, видалення; cover через існуючий upload.
- Navbar: пункт «Новини» / «News» поруч із «Про нас»; «Контакти» → `/:locale/contacts`.
- Базовий SEO для CSR: document `<title>` (і meta description, де практично в Angular) з title + excerpt.
- Locale resolution як у товарів (`?locale=` / `Accept-Language` / default `ua`).

### Out of scope

- Коментарі, соц-кнопки шерингу, RSS.
- Категорії / теги новин.
- Scheduled publish окремо від `publishedAt` + `isPublished` (немає фонового джоба «опублікувати о N»).
- Multi-author / окремий профіль автора.
- Rich HTML editor або Markdown-рендер (v1 — звичайний багаторядковий текст).
- SSR / prerender для SEO (follow-up; зараз CSR).
- Зміна сторінки About / заміна Contacts.
- Зовнішні фіди (Instagram, Telegram тощо) як джерело постів.

## References

- Product overview: `SPEC.md`
- Models: `specs/models.md` (секція NewsPost — додано / уточнити під час імплементації)
- API conventions: `specs/api.md` (секція News — додано / уточнити під час імплементації)
- Frontend architecture: `specs/frontend.md` (маршрути оновлено)
- Database schema: `specs/db.md` (таблиця `news_posts` — додано / уточнити під час імплементації)
- Related (sidebar / nav — **оновити під час імплементації**): `specs/features/admin.md`, `specs/features/i18n.md` (hreflang для news за бажанням)
- Design: text-only for v1; візуальна мова kraft / marigold / espresso як About і каталог (без card-heavy dashboard)
- About (unchanged narrative): storefront «Про нас»

---

## 1. Data & API

### 1.1 Common response envelope

Every endpoint returns:

```text
{ success: bool, data: T, error: string? }
```

### 1.2 Entity: NewsPost

| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| TitleUk | string | required |
| TitleEn | string? | public fallback → TitleUk when empty |
| Slug | string | unique, URL-friendly; shared across locales |
| ExcerptUk | string? | list blurb; public fallback → ExcerptUk for EN when ExcerptEn empty |
| ExcerptEn | string? | |
| BodyUk | string | required for publish; **plain multiline text** (no HTML/Markdown render in v1) |
| BodyEn | string? | public fallback → BodyUk when empty |
| CoverImageUrl | string? | relative `/uploads/...` URL from admin upload |
| PublishedAt | DateTime? | set when published; required when `IsPublished = true` |
| IsPublished | bool | default false (draft) |
| IsFeatured | bool | default false; list highlight / badge |
| CreatedAt | DateTime | |
| UpdatedAt | DateTime | |

**Body format (v1):** store as plain string with newlines. Public UI preserves line breaks (e.g. whitespace-aware display). No sanitization of HTML needed if the client never interprets markup as HTML. Do not introduce a Markdown pipeline in v1.

### 1.3 Schema sketch: `news_posts`

| Column | Constraints |
|--------|-------------|
| `id` | PK |
| `title_uk` | NOT NULL |
| `title_en` | nullable |
| `slug` | UNIQUE NOT NULL |
| `excerpt_uk` | nullable |
| `excerpt_en` | nullable |
| `body_uk` | NOT NULL (or allow empty only while draft — see validation) |
| `body_en` | nullable |
| `cover_image_url` | nullable |
| `published_at` | nullable timestamptz |
| `is_published` | NOT NULL, default false |
| `is_featured` | NOT NULL, default false |
| `created_at` | NOT NULL |
| `updated_at` | NOT NULL |

**Indexes:** unique `slug`; composite useful for public list `(is_published, published_at DESC)`; optional `is_featured`.

### 1.4 Locale resolution

Same order as products/categories:

1. Query `?locale=ua|en`
2. `Accept-Language` (`uk*` / `ua*` → `ua`, `en*` → `en`)
3. Default `ua`

Public DTOs expose monolingual `title`, `excerpt`, `body` after fallback. Admin responses/payloads use bilingual fields (`titleUk`, `titleEn`, …).

### 1.5 Public endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/news` | — | Paginated list of **published** posts |
| GET | `/api/news/:slug` | — | Single **published** post by slug |

#### GET `/api/news`

| Parameter | Semantics |
|-----------|-----------|
| `page` | One-based; default `1` |
| `pageSize` | Default / UI use **`9`** (catalog consistency) |
| `locale` | Content locale |

- Only `IsPublished = true` and `PublishedAt` not null (and typically `PublishedAt <= now` — treat future dates as not yet public if set accidentally).
- Sort: **featured first**, then `PublishedAt` descending.
- Invalid page / pageSize → sane defaults; page past end → nearest valid page.

**List item fields (public):** `id`, `slug`, `title`, `excerpt`, `coverImageUrl`, `publishedAt`, `isFeatured`.

**Envelope data:** `items`, `page`, `pageSize`, `totalCount`, `totalPages`.

#### GET `/api/news/:slug`

- Returns full public detail: list fields + `body`.
- Draft, unpublished, missing, or not-yet-public → **404** (same envelope error style; do not leak draft existence to anonymous users beyond generic not found).

### 1.6 Admin endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/admin/news` | Admin | List all posts (drafts + published); pagination optional |
| GET | `/api/admin/news/:id` | Admin | Single post for edit (bilingual fields) |
| POST | `/api/admin/news` | Admin | Create |
| PUT | `/api/admin/news/:id` | Admin | Full update |
| DELETE | `/api/admin/news/:id` | Admin | Hard delete |
| POST | `/api/admin/uploads/images` | Admin | **Reuse** existing upload (JPG/PNG ≤ 5 MB) → store `coverImageUrl` |

Admin list may include search by title/slug and filter published/draft (nice-to-have; minimum is chronological list with status).

**Admin payload:** `titleUk` (required), `titleEn?`, `slug?` (auto from `titleUk` when omitted), `excerptUk?`, `excerptEn?`, `bodyUk`, `bodyEn?`, `coverImageUrl?`, `isPublished`, `isFeatured`, `publishedAt?`.

### 1.7 Validation & publish rules

- `titleUk` required on create/update.
- `slug` unique; URL-friendly; conflict → clear validation error.
- `bodyUk` required when `isPublished = true` (drafts may allow empty body).
- Setting `isPublished = true`:
  - If `publishedAt` is null/empty → set to **now**.
  - If provided → keep that timestamp.
- Setting `isPublished = false` (unpublish): keep `publishedAt` for history or clear — **prefer keep**; public list excludes unpublished regardless.
- Soft-hide for v1 = unpublish (`isPublished = false`); hard delete removes the row permanently (confirm in UI).
- Cover optional; missing image → placeholder on public UI.

### 1.8 Caching

- Public list/detail: refetch on navigation / page change (no special long-lived client cache required in v1).
- Admin list: refetch after create/update/delete.

---

## 2. Public UI

### 2.1 Routes

| Path | Purpose |
|------|---------|
| `/:locale/news` | News list |
| `/:locale/news/:slug` | News article detail |

### 2.2 Navbar

- Add «Новини» (ua) / «News» (en) next to About (desktop + mobile).
- Active state when on news list or detail.
- Contacts → `/:locale/contacts`.

### 2.3 List page

- Brand-aligned page frame (navbar + kraft atmosphere; not a dense card dashboard).
- Heading + short supporting line via Transloco.
- Grid of posts (suggest ~3 columns desktop, 2 tablet, 1–2 mobile) — visual rhythm like catalog density without product commerce chrome.
- Each item: cover (or placeholder), title, excerpt (if present), published date (locale-formatted), optional **Featured** badge when `isFeatured`.
- Click / activate → navigate to `/:locale/news/:slug`.
- Pagination: **9** per page; prev/next + page numbers; URL sync `?page=` (and preserve locale).
- No category/tag filters in v1.

### 2.4 Detail page

- Title, published date, cover (if any), body with preserved newlines.
- Control «Назад до новин» / «Back to news» → list (same locale).
- Optional: featured badge if featured (not required on detail).

### 2.5 SEO (CSR-realistic)

- Set document `<title>` from post title (detail) or Transloco page title (list), including brand suffix if used elsewhere.
- Where the app already sets meta description, use excerpt (detail) or a static Transloco description (list). No SSR requirement in v1.

---

## 3. Admin UI

### 3.1 Routes

| Path | Purpose |
|------|---------|
| `/:locale/admin/news` | Admin news list |
| `/:locale/admin/news/new` | Create |
| `/:locale/admin/news/:id/edit` | Edit |

Admin shell + `adminGuard` (JWT + `IsAdmin`), same pattern as products/categories/orders.

### 3.2 Admin list

- Table/list: title (UK), slug, published/draft status, publishedAt, featured flag, actions Edit / Delete.
- CTA «Додати новину».
- Sidebar: add «Новини» alongside Товари / Замовлення / Категорії (**оновити admin.md під час імплементації**).

### 3.3 Admin form

- UK / EN tabs (same pattern as product/category bilingual forms).
- Fields: titles, excerpts, bodies (textarea multiline), slug, cover upload (reuse product image upload UX), `isPublished`, `isFeatured`, optional `publishedAt` when publishing.
- Save / cancel; delete with confirmation on edit.

### 3.4 Feedback

- Success/error toasts on save/delete (admin pattern).
- Validation errors inline on fields (slug conflict, required title, publish without body).

---

## 4. States and transitions

### List — loading

- Skeleton placeholders for post rows/tiles; no fabricated articles.

### List — empty

- Friendly empty: no published news yet (Transloco copy); no fake posts.

### List — error

- Inline error + «Спробувати ще» / retry current request; keep page query.

### Detail — loading

- Skeleton or content placeholder for title/body.

### Detail — not found / unpublished

- 404-style page or empty detail with link back to list (do not show draft content).

### Detail — error

- Inline error + retry; link back to list.

### Admin

- Loading / empty / error for list; form loading on edit; confirm before hard delete.

### Persistence

- List `page` in URL; browser back restores page.
- Draft vs published only via admin flags (no client-side draft preview for anonymous users).

---

## 5. Edge cases

- Long titles truncate on list (≈2 lines); full title on detail.
- Long excerpts truncate on list; full on demand not required if omitted from detail (detail shows body).
- Missing cover → kraft «фото» placeholder; layout stable.
- Many posts → pagination remains usable; featured still sorts first within public feed.
- EN empty → show UK content for that field (title/excerpt/body independently).
- Slug change after publish: old URL 404s unless redirects added (v1: no alias redirects).
- Unpublish hides from public immediately; hard delete removes permanently.
- Concurrent slug uniqueness enforced server-side.
- Only `IsAdmin` may mutate; public endpoints never return drafts.

---

## Acceptance Criteria

### Data and API

- [ ] `NewsPost` persisted with bilingual fields, slug uniqueness, publish flags, timestamps.
- [ ] `GET /api/news` returns only published posts, featured-first then `publishedAt` desc, pageSize 9, common envelope.
- [ ] `GET /api/news/:slug` returns published detail or 404 for draft/missing.
- [ ] Locale resolution matches products; public DTOs monolingual with UK fallback.
- [ ] Admin CRUD endpoints require `IsAdmin`; list includes drafts.
- [ ] Publish without `publishedAt` sets `publishedAt` to now; `titleUk` required; slug unique.
- [ ] Cover upload reuses `POST /api/admin/uploads/images`.
- [ ] Body stored and displayed as plain multiline text (no Markdown/HTML pipeline in v1).

### Public UI

- [ ] Routes `/:locale/news` and `/:locale/news/:slug` work for `ua` and `en`.
- [ ] Navbar shows «Новини» / «News» next to About; Contacts unchanged.
- [ ] List shows cover, title, excerpt, date, optional Featured badge; pagination 9.
- [ ] Detail shows title, date, cover, body; back link to list.
- [ ] Loading, empty, and error states behave as specified.
- [ ] Document title (and meta description when available) set from list/detail content.

### Admin UI

- [ ] Admin list + create/edit under `/admin/news` (locale-prefixed shell as other admin pages).
- [ ] Bilingual form fields; publish/unpublish; featured; delete with confirmation.
- [ ] Non-admins cannot access admin news routes/APIs.

### Scope boundaries

- [ ] No comments, tags, categories, RSS, social share widgets, or About page changes.
- [ ] No scheduled-publish job beyond `isPublished` + `publishedAt`.

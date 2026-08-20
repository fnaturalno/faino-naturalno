# API Contracts

Base URL: `/api`
All responses: `{ success: bool, data: T, error: string? }`

## Locale (content reads)

Reads that return product/category **display names** resolve locale in order:

1. Query `?locale=ua|en` (case-insensitive; invalid values ignored)
2. `Accept-Language` (`uk*` / `ua*` → `ua`, `en*` → `en`)
3. Fallback `ua`

Public DTOs keep a single `name` / `shortDescription` / `description` / `categoryName` — the service picks UK or EN (EN only when non-empty). Writes are not locale-driven; admin bilingual fields are sent explicitly.

Applies to: `GET /products`, `GET /products/:slug`, `GET /categories`, `GET /news`, `GET /news/:slug`, `GET /cart` (and cart mutations that return the cart), `GET /orders/:id`, `GET /admin/orders/:id`, admin order status update response.

## Products
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /products | — / Admin | List with filters (`includeInactive` only for Admin); `?locale=` |
| GET | /products/:slug | — | Single active product (public detail); `?locale=` |
| GET | /products/:id | Admin | Single product for admin edit form (bilingual fields) |
| POST | /products | Admin | Create (bilingual: `nameUk` required, `nameEn` optional, …) |
| PUT | /products/:id | Admin | Full update (same bilingual payload; slug from `nameUk` when omitted) |
| PUT | /products/:id/active | Admin | Toggle `isActive` only |
| DELETE | /products/:id | Admin | Delete |

**GET /products query params:** `category` (slug(s); parent slug expands to parent-direct + subcategory products), `search` (matches UK+EN name/short + slug), `minPrice`, `maxPrice`, `page`, `pageSize`, `sortBy`, `includeInactive` (Admin only), `locale`

**Admin product payload:** `nameUk`, `nameEn?`, `shortDescriptionUk?`, `shortDescriptionEn?`, `descriptionUk?`, `descriptionEn?`, images/flags/`categoryId`/`slug?`, optional `strength` (1–5 or null), plus `variants: [{ weight, weightUnit, price, isActive }]` (only priced rows from the 7 predefined packs). No product-level `price`/`weight`. Empty EN allowed.

**Public product list/card:** `priceFrom` (MIN active variant price), `cheapestVariantId`, `variants[]` (active, by `sortOrder`) for card weight dropdown, optional `strength` (1–5). Dropped product-level `price`/`weight`. No `oldPrice` / discount fields — price is always the current selling price. Inclusion (public): `IsActive` + `IsAvailable` + ≥1 active variant. Sort/filter/bounds use MIN(active variant price).

**Public product detail:** `variants: [{ id, weight, weightUnit, price, sortOrder }]` (active only, by `sortOrder`), optional `strength` (1–5). No product-level price/weight.

**Cart POST body:** `{ variantId, quantity? }` only (no `productId`). Lines return `variantId`, weight/unit, live variant price.

## Categories
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /categories | — / Admin | Nested tree: top-level nodes with `children[]`, `parentId`, counts; `?locale=` for public monolingual names. Admin may pass `bilingual=true` for UK/EN fields |
| GET | /categories/:id | Admin | Single category for admin edit (bilingual) |
| POST | /categories | Admin | Create (optional `parentId`; max depth 2; bilingual) |
| PUT | /categories/:id | Admin | Update (bilingual name/description / `parentId` with hierarchy rules) |
| DELETE | /categories/:id | Admin | Delete (fails if products or child categories remain) |

**Admin category payload:** `nameUk`, `nameEn?`, `descriptionUk?`, `descriptionEn?`, `slug?` (auto from `nameUk`), `parentId?`. Empty EN allowed.

Hierarchy details: `specs/features/subcategories.md`.

## Cart
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /cart | — | Get cart (by session); `?locale=` for line names |
| POST | /cart/items | — | Add item by `variantId` |
| PUT | /cart/items/:id | — | Update quantity (returns cart; `?locale=`) |
| DELETE | /cart/items/:id | — | Remove item (returns cart; `?locale=`) |
| DELETE | /cart | — | Clear cart |

## Orders
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /orders | — | Place order (`deliveryMethod`: `nova-poshta` \| `pickup` \| `ukrposhta`; returns confirmationToken) |
| GET | /orders/:id | — (token or owner) | Get order confirmation (`?token=` or JWT owner); `?locale=` for line product names from live Product |
| GET | /orders | User | User's orders (no product names) |
| GET | /admin/orders | Admin | All orders (search / status / pagination) |
| GET | /admin/orders/:id | Admin | Order detail for admin drawer; `?locale=` |
| PUT | /admin/orders/:id/status | Admin | Update status; `?locale=` on returned detail |

## News
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /news | — | Paginated published posts (`page`, `pageSize` default 9, `locale`); featured first, then `publishedAt` desc |
| GET | /news/:slug | — | Single published post; 404 if draft/missing; `?locale=` |
| GET | /admin/news | Admin | All posts (drafts + published; optional `search`, `isPublished`, pagination) |
| GET | /admin/news/:id | Admin | Single post for edit (bilingual fields) |
| POST | /admin/news | Admin | Create |
| PUT | /admin/news/:id | Admin | Full update |
| DELETE | /admin/news/:id | Admin | Hard delete |

**Public news DTO:** monolingual `title`, `excerpt`, `body`, plus `slug`, `coverImageUrl`, `publishedAt`, `isFeatured`. Soft-hide = `isPublished: false`. Body is plain multiline text (v1). Details: `specs/features/news.md`.

**Admin news payload:** `titleUk` (required), `titleEn?`, `slug?`, `excerptUk?`, `excerptEn?`, `bodyUk`, `bodyEn?`, `coverImageUrl?`, `isPublished`, `isFeatured`, `publishedAt?`.

## Settings
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /settings | — | Public shop settings (`ukrposhtaFreeFromAmount`) |
| GET | /admin/settings | Admin | Same payload for admin form |
| PUT | /admin/settings | Admin | Update `ukrposhtaFreeFromAmount` (> 0) |

Default `ukrposhtaFreeFromAmount` is 1300. Shown on Payment & delivery via i18n `{{amount}}`. Checkout does not auto-apply free shipping.

## Sitemap & health
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/sitemap.xml` | — | Public XML sitemap (not under `/api`); see below |
| GET / HEAD | `/health` | — | Liveness for uptime monitors → `200` + `Healthy` |

**`GET /sitemap.xml`**
- `Content-Type: application/xml`
- Canonical host: `https://f-n.fun` (must match frontend `environment.siteOrigin`)
- Locales: every URL emitted for both `ua` and `en`
- Static (no `lastmod`): `/`, `/catalog`, `/about`, `/contacts`, `/news`, `/payment-delivery`
- Dynamic: active products (`IsActive`) → `/catalog/{slug}`; published news (`IsPublished`) → `/news/{slug}` with `lastmod` from `UpdatedAt` (`yyyy-MM-dd`)
- **Not included:** category query URLs (`?category=`), cart/checkout/auth/profile/admin
- Each `<url>` includes reciprocal `<xhtml:link rel="alternate">` for `hreflang="uk"`, `hreflang="en"`, and `hreflang="x-default"` (→ `/ua/...`). Namespace: `xmlns:xhtml="http://www.w3.org/1999/xhtml"`
- No `changefreq` / `priority` (ignored by Google)
- Vercel proxies `https://f-n.fun/sitemap.xml` to this endpoint

## Uploads
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /admin/uploads/images | Admin | Upload image (multipart `file`; JPG/PNG ≤ 5 MB) → `{ url }` under `/uploads/products/...webp` (resized max 500×500, WebP q80; also reused for news covers) |

Static files: API serves `/uploads` from `MediaStorage:RootPath` (default `wwwroot/uploads`) so `/uploads/products/{file}` is publicly readable; write only via the Admin upload endpoint. On Railway set `MediaStorage__RootPath` to a persistent volume.

## Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /auth/register | — | Register |
| POST | /auth/login | — | Login → tokens |
| POST | /auth/refresh | — | Refresh access token |
| POST | /auth/logout | User | Invalidate refresh token |
| POST | /auth/forgot-password | — | Request password-reset email (no account enumeration; delivery via optional SMTP — see below) |
| POST | /auth/reset-password | — | Set new password via email token; invalidates all sessions |
| POST | /auth/change-password | User | Change password (`currentPassword`, `newPassword`); keep current session, revoke other sessions |
| GET | /auth/me | User | Current user profile (`isAdmin`, name, `passwordChangedAt`, …) |
| PUT | /auth/me | User | Update first name, last name, phone |

**Password-reset email:** link = `{App:FrontendBaseUrl}/auth/reset-password?token=…`. Delivery uses Resend HTTP API when `Resend:ApiToken` is set; empty token = log-only stub (Development logs body/link). Production sets `Resend__ApiToken`, `Email__From`, and `App__FrontendBaseUrl` via environment (e.g. Railway), not committed secrets.

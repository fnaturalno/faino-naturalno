# Frontend Architecture

## Stack
- Angular 22, standalone components, **SSR** (`@angular/ssr`, `outputMode: "server"`)
- Tailwind CSS
- Signals for state management
- HttpClient with typed interfaces (+ hydration **HTTP transfer cache** for public GETs only)
- `@jsverse/transloco` for UI strings (`ua` / `en`); browser loader via HTTP, **server loader** reads dictionaries without network

## Deploy
- Vercel **Root Directory = `frontend`** → config is `frontend/vercel.json` (no root `vercel.json`)
- SSR via serverless `frontend/api/index.mjs` importing the built server bundle
- Static assets from the browser build (CDN); dynamic routes → `/api` SSR function
- Platform redirects: `/` → `/ua` (301), `/uk` and `/uk/*` → `/ua` / `/ua/*` (301)
- Proxy: `/sitemap.xml` → Railway API `GET /sitemap.xml`
- Node on Vercel must be ≥ **22.22.3** (Angular 22 CLI requirement)

## Locale
- Public routes are locale-prefixed: `/ua/...`, `/en/...`
- Bare `/` → **301** to `/ua` (Vercel); Angular `rootLocaleRedirect` as fallback
- Legacy `/uk/...` → `/ua/...` (Vercel + Angular `legacyUkRedirect`)
- Content locale for API reads: query `?locale=` / `Accept-Language` / default `ua`
- BCP 47 `html lang` / hreflang for Ukrainian stay `uk`
- Storage: inject `LOCAL_STORAGE` (browser `localStorage` with safe no-ops; server no-op) — never touch `localStorage` / `document` / `window` in field initializers without platform guards

## SEO / SSR
- Canonical origin is **`environment.siteOrigin`** (`https://f-n.fun` in production) — never `document.location` (preview hosts must not become canonical)
- `SeoService` sets unique `title`, `description`, `canonical`, reciprocal `hreflang` (`uk` / `en` / `x-default`→`/ua/...`), Open Graph / Twitter, and `html[lang]`
- Product pages emit **JSON-LD** `Product` + `BreadcrumbList` (replaced on navigation, cleared on destroy)
- Unmatched localized paths render `NotFoundComponent` with **HTTP 404**, `robots: noindex`, and **no** canonical/hreflang
- `legacyUkRedirect` must not re-prefix when the first segment is already `ua`/`en` (prevents `/ua/x` → `/ua/ua/x` loops under SSR)

### Render modes (`app.routes.server.ts`)
| Mode | Routes |
|------|--------|
| **Server** | home, catalog, product, news list/detail, about, contacts, payment-delivery |
| **Client** | `/admin/**`, auth (login/register/forgot/reset), profile, cart, checkout, order confirmation |

### Transfer cache filter
Cache only public responses: `/api/products`, `/api/categories`, `/api/news`, `/api/settings`, `/api/shipping`. **Never** cache cart, auth, or orders (would leak visitor data into HTML/CDN).

### Host / proxy
- `angular.json` → `security.allowedHosts`: production domain(s), `*.vercel.app`, `localhost`
- SSR engine trusts `X-Forwarded-Host` / `X-Forwarded-Proto` (Vercel)

## Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/:lang` | → catalog | Locale home (catalog) |
| `/:lang/about` | AboutComponent | About / «Про нас» |
| `/:lang/payment-delivery` | PaymentDeliveryComponent | Payment & delivery |
| `/:lang/contacts` | ContactsComponent | Contacts |
| `/:lang/news` | NewsListComponent | News list |
| `/:lang/news/:slug` | NewsDetailComponent | News article |
| `/:lang/catalog` | CatalogComponent | Product grid + filters |
| `/:lang/catalog/:slug` | ProductComponent | Product detail |
| `/:lang/cart` | CartComponent | Cart page (client render) |
| `/:lang/checkout` | CheckoutComponent | Order form (client) |
| `/:lang/order/:id` | OrderConfirmComponent | Order confirmation (client) |
| `/:lang/profile` | ProfileComponent | Profile + orders (client) |
| `/:lang/auth/*` | Login / Register / Forgot / Reset | Auth (client) |
| `/:lang/**` | NotFoundComponent | Localized 404 (HTTP 404) |
| `/admin` | AdminShellComponent | Admin shell (no locale prefix; `adminGuard`) |
| `/admin/products` | AdminProductsComponent | Products |
| `/admin/products/new` | AdminProductFormComponent | Create product |
| `/admin/products/:id/edit` | AdminProductFormComponent | Edit product |
| `/admin/orders` | AdminOrdersComponent | Orders |
| `/admin/categories` | AdminCategoriesComponent | Categories |
| `/admin/news` | AdminNewsComponent | News admin |
| `/admin/news/new` | AdminNewsFormComponent | Create news |
| `/admin/news/:id/edit` | AdminNewsFormComponent | Edit news |
| `/admin/settings` | AdminSettingsComponent | Shop settings |

## Shared Components
- `TestModeBannerComponent` — sticky test-mode marquee (appears in SSR HTML until removed/controlled)
- `NavbarComponent` — logo, nav, cart, auth, language switcher; mobile catalog category tree
- `ProductCardComponent` — `priceFrom`, variants dropdown, optional strength meter
- `ProductStrengthComponent` — flames 1–5
- `CartDrawerComponent` — slide-in cart (browser-only `keydown` / body scroll lock)
- `LanguageSwitcherComponent` — UA / EN

## Services
- `ProductService`, `CategoryService`, `NewsService`, `CartService`, `OrderService`, `AuthService`, `AdminService`
- `LocaleService` — active locale, route commands, formatting (`LOCAL_STORAGE` for persist)
- `SeoService` — meta / canonical / hreflang / OG from `siteOrigin`
- Guest cart session id is created lazily when storage is available (not in a server field initializer)

## State (Signals)
- `CartService.itemCount` — navbar badge
- `CartService.items` — cart contents
- `AuthService.currentUser` — logged-in user (`isAdmin`)
- `CatalogComponent` / store filters
- `LocaleService.lang` — `ua` | `en`

## robots.txt
- Allow public storefront; disallow admin, cart, checkout, auth, profile, order (both locales)
- Disallow catalog query duplicates (`category`, `search`, `minPrice`, `maxPrice`, `sortBy`, `page`)
- `Sitemap: https://f-n.fun/sitemap.xml`

# Frontend Architecture

## Stack
- Angular 22, standalone components
- Tailwind CSS
- Signals for state management
- HttpClient with typed interfaces
- `@jsverse/transloco` for UI strings (`ua` / `en`)

## Locale
- Public routes are locale-prefixed: `/ua/...`, `/en/...`
- Bare `/` redirects to `/ua/`
- Legacy `/uk/...` redirects to `/ua/...`
- Content locale for API reads: query `?locale=` / `Accept-Language` / default `ua`
- BCP 47 `html lang` / hreflang for Ukrainian stay `uk`

## Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/:locale` | → catalog | Locale home (catalog) |
| `/:locale/about` | AboutComponent | About / «Про нас» |
| `/:locale/payment-delivery` | PaymentDeliveryComponent | Payment & delivery / «Оплата і доставка» |
| `/:locale/contacts` | ContactsComponent | Contacts / «Контакти» |
| `/:locale/news` | NewsListComponent | News / «Новини» list |
| `/:locale/news/:slug` | NewsDetailComponent | News article detail |
| `/:locale/catalog` | CatalogComponent | Product grid + filters |
| `/:locale/catalog/:slug` | ProductComponent | Product detail |
| `/:locale/cart` | CartComponent | Cart page |
| `/:locale/checkout` | CheckoutComponent | Order form |
| `/:locale/order/:id` | OrderConfirmComponent | Order confirmation |
| `/:locale/profile` | ProfileComponent | User profile + orders |
| `/:locale/auth/login` | LoginComponent | Login |
| `/:locale/auth/register` | RegisterComponent | Register |
| `/:locale/admin` | → redirect | Redirects to `/admin/products` (locale-prefixed admin shell) |
| `/:locale/admin/products` | AdminProductsComponent | Products table + mobile cards |
| `/:locale/admin/products/new` | AdminProductFormComponent | Create product (7 variant rows) |
| `/:locale/admin/products/:id/edit` | AdminProductFormComponent | Edit product |
| `/:locale/admin/orders` | AdminOrdersComponent | Orders list + detail drawer |
| `/:locale/admin/categories` | AdminCategoriesComponent | Tree table (expand, icons, + subcategory, drawer) |
| `/:locale/admin/news` | AdminNewsComponent | News posts list (drafts + published) |
| `/:locale/admin/news/new` | AdminNewsFormComponent | Create news post |
| `/:locale/admin/news/:id/edit` | AdminNewsFormComponent | Edit news post |

All `/admin/*` routes use `adminGuard` (JWT + `IsAdmin`). Admin shell keeps the shared shop navbar for main-menu navigation.

## Shared Components
- `TestModeBannerComponent` — sticky marigold marquee «Сайт працює в тестовому режимі» / «The site is running in test mode» (above all pages; navbar sticks below it)
- `NavbarComponent` — logo, nav (Catalog, About, News, Payment & delivery, Contacts), cart icon, auth, language switcher; shows «Адмін» → admin when `currentUser.isAdmin`. Mobile menu lists catalog categories and subcategories under Catalog (`?category=`).
- `FooterComponent`
- `ProductCardComponent` — catalog / similar / featured; `priceFrom` + split «В кошик» (main = cheapest variant; dropdown = choose weight when `variants.length > 1`); optional 5-flame `strength` meter
- `ProductStrengthComponent` — five flame icons for optional product `strength` 1–5 (1–2 garden, 3–4 marigold, 5 chili; inactive gray)
- `CartDrawerComponent` — slide-in cart preview
- `LoadingSkeletonComponent`
- `EmptyStateComponent`
- `LanguageSwitcherComponent` — UA / EN (flags)

## Services
- `ProductService` — GET /products, /products/:slug
- `CategoryService` — GET /categories (nested tree with `children[]` / `parentId`)
- `CartService` — cart CRUD + signal for item count; guest `X-Cart-Session-Id`; rotates session after merge / stale-session recovery
- `OrderService` — POST /orders, GET /orders/:id
- `AuthService` — login, register, token management
- `AdminService` — admin product/category/order/news CRUD + image upload (category create/update includes optional `parentId`)
- `NewsService` — GET /news, /news/:slug (public)
- `LocaleService` — active locale, route commands, number/price formatting

## State (Signals)
- `CartService.itemCount` — navbar badge
- `CartService.items` — cart contents
- `AuthService.currentUser` — logged-in user (`isAdmin` for navbar / guard)
- `CatalogComponent.filters` — active filters
- `LocaleService.lang` — `ua` | `en`

# Frontend Architecture

## Stack
- Angular 22, standalone components
- Tailwind CSS
- Signals for state management
- HttpClient with typed interfaces

## Routes
| Path | Component | Description |
|------|-----------|-------------|
| / | HomeComponent | Featured products, categories |
| /catalog | CatalogComponent | Product grid + filters |
| /catalog/:slug | ProductComponent | Product detail |
| /cart | CartComponent | Cart page |
| /checkout | CheckoutComponent | Order form |
| /order/:id | OrderConfirmComponent | Order confirmation |
| /profile | ProfileComponent | User profile + orders |
| /auth/login | LoginComponent | Login |
| /auth/register | RegisterComponent | Register |
| /admin | → redirect | Redirects to `/admin/products` |
| /admin/products | AdminProductsComponent | Product list (admin shell + public navbar) |
| /admin/products/new | AdminProductFormComponent | Create product |
| /admin/products/:id/edit | AdminProductFormComponent | Edit product |
| /admin/orders | AdminOrdersComponent | Orders list + detail drawer |
| /admin/categories | AdminCategoriesComponent | Categories list + drawer |

All `/admin/*` routes use `adminGuard` (JWT + `IsAdmin`). Admin shell keeps the shared shop navbar for main-menu navigation.

## Shared Components
- `NavbarComponent` — logo, nav, cart icon, auth; shows «Адмін» → `/admin` when `currentUser.isAdmin`
- `FooterComponent`
- `ProductCardComponent` — used in catalog and featured
- `CartDrawerComponent` — slide-in cart preview
- `LoadingSkeletonComponent`
- `EmptyStateComponent`

## Services
- `ProductService` — GET /products, /products/:slug
- `CategoryService` — GET /categories
- `CartService` — cart CRUD + signal for item count
- `OrderService` — POST /orders, GET /orders/:id
- `AuthService` — login, register, token management
- `AdminService` — admin product/category/order CRUD + image upload

## State (Signals)
- `CartService.itemCount` — navbar badge
- `CartService.items` — cart contents
- `AuthService.currentUser` — logged-in user (`isAdmin` for navbar / guard)
- `CatalogComponent.filters` — active filters

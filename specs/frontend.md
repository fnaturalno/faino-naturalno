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
| /auth | AuthComponent | Login / register modal |
| /admin | AdminComponent | Admin dashboard |
| /admin/products | AdminProductsComponent | Product management |
| /admin/orders | AdminOrdersComponent | Order management |

## Shared Components
- `NavbarComponent` — logo, nav, cart icon, auth
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

## State (Signals)
- `CartService.itemCount` — navbar badge
- `CartService.items` — cart contents
- `AuthService.currentUser` — logged-in user
- `CatalogComponent.filters` — active filters

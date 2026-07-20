# API Contracts

Base URL: `/api`
All responses: `{ success: bool, data: T, error: string? }`

## Products
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /products | — | List with filters |
| GET | /products/:slug | — | Single product |
| POST | /products | Admin | Create |
| PUT | /products/:id | Admin | Update |
| DELETE | /products/:id | Admin | Delete |

**GET /products query params:** `category`, `search`, `minPrice`, `maxPrice`, `page`, `pageSize`, `sortBy`

## Categories
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /categories | — | All categories |
| POST | /categories | Admin | Create |
| PUT | /categories/:id | Admin | Update |
| DELETE | /categories/:id | Admin | Delete |

## Cart
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /cart | — | Get cart (by session) |
| POST | /cart/items | — | Add item |
| PUT | /cart/items/:id | — | Update quantity |
| DELETE | /cart/items/:id | — | Remove item |
| DELETE | /cart | — | Clear cart |

## Orders
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /orders | — | Place order (returns confirmationToken) |
| GET | /orders/:id | — (token or owner) | Get order confirmation (`?token=` or JWT owner) |
| GET | /orders | User | User's orders |
| GET | /admin/orders | Admin | All orders |
| PUT | /admin/orders/:id/status | Admin | Update status |

## Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /auth/register | — | Register |
| POST | /auth/login | — | Login → tokens |
| POST | /auth/refresh | — | Refresh access token |
| POST | /auth/logout | User | Invalidate refresh token |

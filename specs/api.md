# API Contracts

Base URL: `/api`
All responses: `{ success: bool, data: T, error: string? }`

## Products
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /products | — / Admin | List with filters (`includeInactive` only for Admin) |
| GET | /products/:slug | — | Single active product (public detail) |
| GET | /products/:id | Admin | Single product for admin edit form |
| POST | /products | Admin | Create |
| PUT | /products/:id | Admin | Full update |
| PUT | /products/:id/active | Admin | Toggle `isActive` only |
| DELETE | /products/:id | Admin | Delete |

**GET /products query params:** `category` (slug(s); parent slug expands to parent-direct + subcategory products), `search`, `minPrice`, `maxPrice`, `page`, `pageSize`, `sortBy`, `includeInactive` (Admin only)

## Categories
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /categories | — / Admin | Nested tree: top-level nodes with `children[]`, `parentId`, counts (parent = direct + children; admin count may include inactive) |
| POST | /categories | Admin | Create (optional `parentId`; max depth 2) |
| PUT | /categories/:id | Admin | Update (name / slug / description / `parentId` with hierarchy rules) |
| DELETE | /categories/:id | Admin | Delete (fails if products or child categories remain) |

Hierarchy details: `specs/features/subcategories.md`.

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
| GET | /admin/orders | Admin | All orders (search / status / pagination) |
| GET | /admin/orders/:id | Admin | Order detail for admin drawer |
| PUT | /admin/orders/:id/status | Admin | Update status |

## Uploads
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /admin/uploads/images | Admin | Upload product image (multipart `file`; JPG/PNG ≤ 5 MB) → `{ url }` under `/uploads/products/...` |

Static files: API serves `/uploads` from `MediaStorage:RootPath` (default `wwwroot/uploads`) so `/uploads/products/{file}` is publicly readable; write only via the Admin upload endpoint. On Railway set `MediaStorage__RootPath` to a persistent volume.

## Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /auth/register | — | Register |
| POST | /auth/login | — | Login → tokens |
| POST | /auth/refresh | — | Refresh access token |
| POST | /auth/logout | User | Invalidate refresh token |
| POST | /auth/forgot-password | — | Request password-reset email (no account enumeration) |
| POST | /auth/reset-password | — | Set new password via email token; invalidates all sessions |
| POST | /auth/change-password | User | Change password (`currentPassword`, `newPassword`); keep current session, revoke other sessions |
| GET | /auth/me | User | Current user profile (`isAdmin`, name, `passwordChangedAt`, …) |
| PUT | /auth/me | User | Update first name, last name, phone |

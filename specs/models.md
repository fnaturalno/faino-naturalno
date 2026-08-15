# Data Models

## Product
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| NameUk | string | required; Ukrainian display name |
| NameEn | string? | English; public reads fall back to NameUk when empty |
| Slug | string | unique, URL-friendly; shared across locales |
| DescriptionUk | string? | Ukrainian full description |
| DescriptionEn | string? | English; falls back to DescriptionUk when empty |
| ShortDescriptionUk | string? | Ukrainian catalog-card blurb |
| ShortDescriptionEn | string? | English; falls back to ShortDescriptionUk when empty |
| ImageUrl | string? | main image |
| ImageUrls | string[] | gallery |
| IsActive | bool | default true |
| IsFeatured | bool | homepage highlight |
| IsAvailable | bool | default true; public catalog requires IsActive + IsAvailable + ≥1 active variant |
| Strength | int? | optional 1–5 spice heat; null = not shown |
| CategoryId | int | FK → Category |
| CreatedAt | DateTime | |
| UpdatedAt | DateTime | |
| Variants | collection | ProductVariant rows (priced packagings) |

Price / weight are **not** on Product — see ProductVariant.

## ProductVariant
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| ProductId | int | FK → Product (ON DELETE CASCADE) |
| Weight | decimal | packaging size from predefined list |
| WeightUnit | string | `г` / `кг` / `шт` |
| Price | decimal | UAH; current selling price only |
| IsActive | bool | default true; inactive = not sold publicly |
| SortOrder | int | 1-based index in predefined weight list |

UNIQUE (ProductId, Weight, WeightUnit). No soft delete — clear price hard-deletes unreferenced rows.

## Category
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| NameUk | string | required; Ukrainian display name |
| NameEn | string? | English; public reads fall back to NameUk when empty |
| Slug | string | unique (global across parents and subcategories); shared across locales |
| DescriptionUk | string? | Ukrainian description |
| DescriptionEn | string? | English; falls back to DescriptionUk when empty |
| ImageUrl | string? | |
| SortOrder | int | display order among siblings |
| ParentId | int? | FK → Category; null = top-level; max depth 2 (parent → subcategory only) |

See `specs/features/subcategories.md` for hierarchy, counts, and filter expansion rules.

## Order
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| OrderNumber | string | unique, human-readable |
| Status | enum | Pending, Confirmed, Shipped, Delivered, Cancelled |
| TotalAmount | decimal | |
| RecipientName | string | |
| Phone | string | |
| Email | string | |
| DeliveryAddress | string | |
| Comment | string? | |
| UserId | int? | null = guest order; FK → User |
| CreatedAt | DateTime | |
| UpdatedAt | DateTime | |

## OrderItem
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| OrderId | int | FK → Order |
| ProductId | int | FK → Product (denormalized; ON DELETE RESTRICT) |
| VariantId | int | FK → ProductVariant (ON DELETE RESTRICT) |
| Quantity | int | |
| UnitPrice | decimal | snapshot of Variant.Price at place time |
| Weight | decimal | snapshot of Variant.Weight at place time |
| WeightUnit | string | snapshot of Variant.WeightUnit at place time |

## Cart
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| SessionId | string | browser session |
| UserId | int? | if logged in; FK → User (ON DELETE SET NULL) |
| CreatedAt | DateTime | |
| UpdatedAt | DateTime | |

## CartItem
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| CartId | int | FK → Cart |
| VariantId | int | FK → ProductVariant (ON DELETE RESTRICT); unique per cart |
| Quantity | int | |

Product for display/joins is derived via Variant.Product.

## ShopSettings
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK; singleton row id = 1 |
| UkrposhtaFreeFromAmount | decimal | UAH threshold on Payment & delivery (default 1300) |
| UpdatedAt | DateTime | |

## User
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| Email | string | unique; stored lowercased for case-insensitive lookup |
| PasswordHash | string | bcrypt |
| FirstName | string | |
| LastName | string | |
| Phone | string? | optional; `+380…` when set |
| IsAdmin | bool | default false |
| PasswordChangedAt | DateTime? | null until first change/reset; set on change-password and reset-password |
| CreatedAt | DateTime | |
| UpdatedAt | DateTime | |

## RefreshToken
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| UserId | int | FK → User |
| TokenFamily | Guid | rotation chain; reuse of revoked token revokes family |
| TokenHash | string | unique; hash of opaque refresh token |
| ExpiresAt | DateTime | |
| CreatedAt | DateTime | |
| RevokedAt | DateTime? | set on logout; null = active until expiry |

## PasswordResetToken
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| UserId | int | FK → User |
| TokenHash | string | unique; hash of email-link token |
| ExpiresAt | DateTime | |
| IsUsed | bool | default false |
| CreatedAt | DateTime | |

## UserDeliveryAddress
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| UserId | int | unique FK → User (1:1) |
| CityId | string | Nova Poshta city Ref |
| CityName | string | |
| CityRegion | string? | |
| BranchId | string | branch / parcel-locker Ref |
| BranchLabel | string | |
| Summary | string | display line |
| UpdatedAt | DateTime | |

## NewsPost
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| TitleUk | string | required |
| TitleEn | string? | public reads fall back to TitleUk when empty |
| Slug | string | unique, URL-friendly; shared across locales |
| ExcerptUk | string? | list blurb |
| ExcerptEn | string? | falls back to ExcerptUk when empty |
| BodyUk | string | plain multiline text (v1; no HTML/Markdown pipeline) |
| BodyEn | string? | falls back to BodyUk when empty |
| CoverImageUrl | string? | relative `/uploads/...` from admin upload |
| PublishedAt | DateTime? | required when IsPublished; default now on publish if omitted |
| IsPublished | bool | default false (draft); public APIs return published only |
| IsFeatured | bool | default false; public list highlight |
| CreatedAt | DateTime | |
| UpdatedAt | DateTime | |

See `specs/features/news.md`.

# Data Models

## Product
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| Name | string | required |
| Slug | string | unique, URL-friendly |
| Description | string? | |
| ShortDescription | string? | for catalog cards |
| Price | decimal | UAH |
| OldPrice | decimal? | for discounts |
| ImageUrl | string? | main image |
| ImageUrls | string[] | gallery |
| StockQuantity | int | |
| Weight | decimal? | |
| WeightUnit | string? | г, мл, шт |
| IsActive | bool | default true |
| IsFeatured | bool | homepage highlight |
| CategoryId | int | FK → Category |
| CreatedAt | DateTime | |
| UpdatedAt | DateTime | |

## Category
| Field | Type | Notes |
|-------|------|-------|
| Id | int | PK |
| Name | string | |
| Slug | string | unique |
| Description | string? | |
| ImageUrl | string? | |
| SortOrder | int | display order |

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
| ProductId | int | FK → Product |
| Quantity | int | |
| UnitPrice | decimal | price at time of order |

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
| ProductId | int | FK → Product |
| Quantity | int | |

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

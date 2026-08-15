export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string | null;
}

export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  description?: string | null;
  activeProductCount: number;
  children: CategorySummary[];
}

/** Active variant on public product detail (inactive omitted by API). */
export interface ProductVariantDto {
  id: number;
  weight: number;
  weightUnit: string;
  price: number;
  sortOrder: number;
}

/** Catalog / similar / featured list card. */
export interface CatalogProduct {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  /** MIN price among active priced variants. */
  priceFrom: number;
  /** Cheapest active variant (min price; tie-break sort_order) — for card CTA. */
  cheapestVariantId?: number | null;
  /** Active variants for card weight dropdown (ordered by sortOrder). */
  variants?: ProductVariantDto[];
  imageUrl?: string | null;
  isFeatured: boolean;
  /** False when the product cannot be added to cart. */
  isAvailable?: boolean;
  /** Optional spice strength 1–5; omitted/null = hidden. */
  strength?: number | null;
  createdAt: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
}

/** GET /api/products/:slug — active product with gallery, variants, and similar cards. */
export interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  imageUrls: string[];
  variants: ProductVariantDto[];
  isFeatured: boolean;
  /** False when the product cannot be added to cart. */
  isAvailable?: boolean;
  /** Optional spice strength 1–5; omitted/null = hidden. */
  strength?: number | null;
  createdAt: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  similarProducts: CatalogProduct[];
}

export type CatalogSort = 'popular' | 'price-asc' | 'price-desc' | 'new' | 'name-asc';

export interface CatalogFilters {
  categories: string[];
  search: string;
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: CatalogSort;
  page: number;
}

export interface ProductPage {
  items: CatalogProduct[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  priceMin: number;
  priceMax: number;
}

export interface AddCartItemResponse {
  itemCount: number;
}

/** Format variant weight label from API strings (г / кг / шт). */
export function formatVariantWeight(weight: number, weightUnit: string, formatNumber: (n: number) => string): string {
  return `${formatNumber(weight)} ${weightUnit}`;
}

/** Cheapest active variant: min price, then lower sortOrder. */
export function pickCheapestVariant<T extends { price: number; sortOrder: number }>(
  variants: readonly T[],
): T | null {
  if (!variants.length) return null;
  return [...variants].sort((a, b) => a.price - b.price || a.sortOrder - b.sortOrder)[0] ?? null;
}

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

export interface CatalogProduct {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string | null;
  weight?: number | null;
  weightUnit?: string | null;
  isFeatured: boolean;
  /** False when the product cannot be added to cart. */
  isAvailable?: boolean;
  createdAt: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
}

/** GET /api/products/:slug — active product with gallery and similar cards. */
export interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string | null;
  imageUrls: string[];
  weight?: number | null;
  weightUnit?: string | null;
  isFeatured: boolean;
  /** False when the product cannot be added to cart. */
  isAvailable?: boolean;
  createdAt: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  similarProducts: CatalogProduct[];
}

export type CatalogSort = 'popular' | 'price-asc' | 'price-desc' | 'new';

export interface CatalogFilters {
  categories: string[];
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

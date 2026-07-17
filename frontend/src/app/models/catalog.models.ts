export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string | null;
}

export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  activeProductCount: number;
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
  stockQuantity: number;
  isFeatured: boolean;
  createdAt: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
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

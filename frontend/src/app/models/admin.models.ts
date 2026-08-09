import { OrderLineDto } from './order.models';

export type AdminOrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

/** One of the 7 predefined weight presets for admin variant editor. */
export interface AdminProductVariantDto {
  id?: number | null;
  weight: number;
  weightUnit: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
}

/** Payload entry when saving — only rows with a price. */
export interface SaveProductVariantRequest {
  weight: number;
  weightUnit: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminProduct {
  id: number;
  /** Display name (locale-resolved) — list views. */
  name: string;
  nameUk?: string;
  nameEn?: string | null;
  slug: string;
  categoryId: number;
  categoryName: string;
  shortDescription?: string | null;
  shortDescriptionUk?: string | null;
  shortDescriptionEn?: string | null;
  description?: string | null;
  descriptionUk?: string | null;
  descriptionEn?: string | null;
  /** Min active variant price for list; null/undefined when none. */
  priceFrom?: number | null;
  /** Existing DB variants (may include inactive); UI merges onto 7 presets. */
  variants?: AdminProductVariantDto[];
  imageUrl?: string | null;
  imageUrls: string[];
  isActive: boolean;
  isFeatured: boolean;
  isAvailable: boolean;
}

export interface AdminProductPage {
  items: AdminProduct[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface SaveProductRequest {
  nameUk: string;
  nameEn?: string | null;
  slug?: string;
  categoryId: number;
  shortDescriptionUk?: string | null;
  shortDescriptionEn?: string | null;
  descriptionUk?: string | null;
  descriptionEn?: string | null;
  /** Only presets with a price. */
  variants: SaveProductVariantRequest[];
  imageUrl?: string | null;
  imageUrls: string[];
  isActive: boolean;
  isFeatured: boolean;
  isAvailable: boolean;
}

export interface AdminCategory {
  id: number;
  name: string;
  nameUk?: string;
  nameEn?: string | null;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  description?: string | null;
  descriptionUk?: string | null;
  descriptionEn?: string | null;
  activeProductCount: number;
  children: AdminCategory[];
}

export interface SaveCategoryRequest {
  nameUk: string;
  nameEn?: string | null;
  slug?: string;
  descriptionUk?: string | null;
  descriptionEn?: string | null;
  parentId?: number | null;
}

export interface AdminOrderSummary {
  id: number;
  orderNumber: string;
  createdAt: string;
  recipientName: string;
  phone: string;
  city: string;
  totalAmount: number;
  status: AdminOrderStatus;
}

export interface AdminOrderPage {
  items: AdminOrderSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  email: string;
  deliveryMethod?: string | null;
  deliveryAddress: string;
  comment?: string | null;
  items: OrderLineDto[];
}

/** Predefined weight presets (sort_order = 1-based index). */
export const VARIANT_PRESETS: readonly {
  weight: number;
  weightUnit: string;
  sortOrder: number;
  label: string;
}[] = [
  { weight: 10, weightUnit: 'г', sortOrder: 1, label: '10 г' },
  { weight: 50, weightUnit: 'г', sortOrder: 2, label: '50 г' },
  { weight: 100, weightUnit: 'г', sortOrder: 3, label: '100 г' },
  { weight: 250, weightUnit: 'г', sortOrder: 4, label: '250 г' },
  { weight: 500, weightUnit: 'г', sortOrder: 5, label: '500 г' },
  { weight: 1, weightUnit: 'кг', sortOrder: 6, label: '1 кг' },
  { weight: 1, weightUnit: 'шт', sortOrder: 7, label: '1 шт' },
] as const;

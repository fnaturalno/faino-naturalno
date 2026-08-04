import { OrderLineDto } from './order.models';

export type AdminOrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

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
  price: number;
  oldPrice?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
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
  price: number;
  oldPrice?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
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
  deliveryAddress: string;
  comment?: string | null;
  items: OrderLineDto[];
}

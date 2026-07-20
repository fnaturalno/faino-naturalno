import { OrderLineDto } from './order.models';

export type AdminOrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  categoryName: string;
  shortDescription?: string | null;
  description?: string | null;
  price: number;
  oldPrice?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
  stockQuantity: number;
  imageUrl?: string | null;
  imageUrls: string[];
  isActive: boolean;
  isFeatured: boolean;
}

export interface AdminProductPage {
  items: AdminProduct[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export type SaveProductRequest = Omit<AdminProduct, 'id' | 'categoryName'>;

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  activeProductCount: number;
}

export interface SaveCategoryRequest {
  name: string;
  slug?: string;
  description?: string | null;
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

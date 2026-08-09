import { OrderStatusValue } from './auth.models';
import { ApiResponse } from './catalog.models';

export type { ApiResponse, OrderStatusValue };

export type DeliveryMethod = 'nova-poshta' | 'pickup' | 'city';

/** POST /api/orders body — lines/totals come from the server cart. */
export interface PlaceOrderRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  deliveryMethod: DeliveryMethod;
  cityId: string;
  cityName: string;
  cityRegion?: string | null;
  branchId: string;
  branchLabel: string;
  /** Required when deliveryMethod is city. */
  streetAddress?: string | null;
  /** Optional client hint; server composes the stored address. */
  deliveryAddress: string;
  comment?: string | null;
}

/** Success payload from POST /api/orders (enough to navigate to confirmation). */
export interface PlaceOrderResponse {
  id: number;
  orderNumber: string;
  status: OrderStatusValue;
  totalAmount: number;
  createdAt: string;
  /** Opaque capability for GET /api/orders/:id?token= — pass via redirect query only. */
  confirmationToken: string;
}

/** One line on GET /api/orders/:id — mirrors OrderDetailItemDto (camelCase). */
export interface OrderLineDto {
  productId: number;
  variantId?: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Snapshot of variant weight at place time. */
  weight?: number | null;
  /** Snapshot of variant weight unit at place time. */
  weightUnit?: string | null;
  category?: string | null;
  imageUrl?: string | null;
}

/** GET /api/orders/:id — public confirmation details. */
export interface OrderDetailDto {
  id: number;
  orderNumber: string;
  status: OrderStatusValue;
  totalAmount: number;
  createdAt: string;
  recipientName: string;
  phone: string;
  email: string;
  deliveryMethod: DeliveryMethod | string;
  deliveryAddress: string;
  comment?: string | null;
  items: OrderLineDto[];
}

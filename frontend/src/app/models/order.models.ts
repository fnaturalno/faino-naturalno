import { OrderStatusValue } from './auth.models';
import { ApiResponse } from './catalog.models';

export type { ApiResponse, OrderStatusValue };

/** POST /api/orders body — lines/totals come from the server cart. */
export interface PlaceOrderRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  cityId: string;
  cityName: string;
  cityRegion?: string | null;
  branchId: string;
  branchLabel: string;
  /** Human-readable city + branch summary for storage / confirmation. */
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
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
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
  deliveryAddress: string;
  comment?: string | null;
  items: OrderLineDto[];
}

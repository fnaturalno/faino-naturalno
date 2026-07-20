import { ApiResponse } from './catalog.models';

export type { ApiResponse };

/** GET /api/cart — full cart payload. */
export interface CartDto {
  itemCount: number;
  subtotal: number;
  items: CartLineDto[];
}

/** One cart line as returned by the cart API. */
export interface CartLineDto {
  cartItemId: number;
  productId: number;
  name: string;
  slug: string;
  /** Display category name. */
  category: string;
  imageUrl?: string | null;
  /** Live unit price from the product. */
  price: number;
  quantity: number;
  lineTotal: number;
  stockQuantity: number;
  /** False when the product is inactive / unavailable. */
  isActive: boolean;
}

/** PUT /api/cart/items/:id body. */
export interface UpdateCartItemRequest {
  quantity: number;
}

export type CartLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Ukrainian plural for cart header: N товар / товари / товарів. */
export function cartItemCountLabel(count: number): string {
  const n = Math.abs(Math.trunc(count));
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 > 10 && mod100 < 20) return `${n} товарів`;
  if (mod10 === 1) return `${n} товар`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} товари`;
  return `${n} товарів`;
}

export function cartLineMaxQuantity(stockQuantity: number): number {
  return Math.max(0, Math.min(stockQuantity, 12));
}

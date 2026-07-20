import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { CartMergeResponse } from '../models/auth.models';
import {
  CartDto,
  CartLineDto,
  CartLoadStatus,
  UpdateCartItemRequest,
  cartLineMaxQuantity,
} from '../models/cart.models';
import { AddCartItemResponse, ApiResponse } from '../models/catalog.models';
import { extractApiError } from './auth.service';
import { ToastService } from './toast.service';

const SESSION_KEY = 'fayno.cart.session-id';
const SESSION_HEADER = 'X-Cart-Session-Id';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly toasts = inject(ToastService);
  private sessionId = this.resolveSessionId();

  private readonly itemsSignal = signal<CartLineDto[]>([]);
  private readonly itemCountSignal = signal(0);
  private readonly subtotalSignal = signal(0);
  private readonly loadStatusSignal = signal<CartLoadStatus>('idle');
  private readonly loadErrorSignal = signal<string | null>(null);
  private readonly pendingLinesSignal = signal<Record<number, true>>({});
  private readonly drawerOpenSignal = signal(false);

  readonly items = this.itemsSignal.asReadonly();
  readonly itemCount = this.itemCountSignal.asReadonly();
  readonly subtotal = this.subtotalSignal.asReadonly();
  readonly loadStatus = this.loadStatusSignal.asReadonly();
  readonly loadError = this.loadErrorSignal.asReadonly();
  readonly pendingLines = this.pendingLinesSignal.asReadonly();
  readonly drawerOpen = this.drawerOpenSignal.asReadonly();
  readonly hasItems = computed(() => this.itemCountSignal() > 0);
  readonly isEmpty = computed(
    () => this.loadStatusSignal() === 'ready' && this.itemsSignal().length === 0,
  );

  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Mint a fresh guest session id (e.g. after merge or logout) so the old header
   * cannot address a user-claimed cart.
   */
  rotateSessionId(): void {
    const created = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, created);
    this.sessionId = created;
  }

  /** Clear local cart UI state (badge / lines) without calling the API. */
  resetLocalState(): void {
    this.itemsSignal.set([]);
    this.itemCountSignal.set(0);
    this.subtotalSignal.set(0);
    this.loadStatusSignal.set('idle');
    this.loadErrorSignal.set(null);
    this.pendingLinesSignal.set({});
    this.drawerOpenSignal.set(false);
  }

  openDrawer(): void {
    this.drawerOpenSignal.set(true);
    this.loadCart().subscribe();
  }

  closeDrawer(): void {
    this.drawerOpenSignal.set(false);
  }

  /**
   * Silent bootstrap sync so the navbar badge reflects the session cart on cold load.
   * Only updates itemCount; drawer and /cart still perform a fresh GET for full contents.
   * Failed hydrate leaves the badge unchanged (0) and does not set loadStatus to error.
   */
  hydrateOnInit(): void {
    this.http
      .get<ApiResponse<CartDto>>(`${environment.apiBaseUrl}/api/cart`, {
        headers: this.sessionHeaders(),
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.itemCountSignal.set(response.data.itemCount);
          }
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  /** Fresh GET /api/cart — call when opening drawer or navigating to /cart. */
  loadCart(): Observable<ApiResponse<CartDto>> {
    this.loadStatusSignal.set('loading');
    this.loadErrorSignal.set(null);

    return this.http
      .get<ApiResponse<CartDto>>(`${environment.apiBaseUrl}/api/cart`, {
        headers: this.sessionHeaders(),
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.applyCart(response.data);
            this.loadStatusSignal.set('ready');
            return;
          }
          this.loadStatusSignal.set('error');
          this.loadErrorSignal.set(response.error ?? 'Не вдалося завантажити кошик.');
        }),
        catchError((error: unknown) => {
          this.loadStatusSignal.set('error');
          this.loadErrorSignal.set(extractApiError(error, 'Не вдалося завантажити кошик.'));
          return of({
            success: false,
            data: null as unknown as CartDto,
            error: this.loadErrorSignal(),
          });
        }),
      );
  }

  addItem(productId: number, quantity = 1): Observable<ApiResponse<AddCartItemResponse>> {
    const qty = Math.max(1, Math.min(12, Math.floor(quantity)));
    return this.http
      .post<ApiResponse<AddCartItemResponse>>(
        `${environment.apiBaseUrl}/api/cart/items`,
        { productId, quantity: qty },
        { headers: this.sessionHeaders() },
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.itemCountSignal.set(response.data.itemCount);
          }
        }),
      );
  }

  /** Merge guest cart into authenticated user cart after login/register. */
  mergeGuestCart(): Observable<ApiResponse<CartMergeResponse>> {
    return this.http
      .post<ApiResponse<CartMergeResponse>>(
        `${environment.apiBaseUrl}/api/cart/merge`,
        {},
        { headers: this.sessionHeaders() },
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.itemCountSignal.set(response.data.itemCount);
            // Server rotates session on claim; client must mint a new guest id too.
            this.rotateSessionId();
          }
        }),
      );
  }

  updateQuantity(cartItemId: number, quantity: number): void {
    if (this.pendingLinesSignal()[cartItemId]) return;

    const line = this.itemsSignal().find((item) => item.cartItemId === cartItemId);
    if (!line || !line.isActive) return;

    let nextQty = Math.max(1, Math.floor(quantity));
    const max = cartLineMaxQuantity(line.stockQuantity);
    if (nextQty > line.quantity) {
      if (max <= line.quantity) return;
      nextQty = Math.min(nextQty, max);
    }
    if (nextQty === line.quantity) return;

    const snapshot = this.snapshot();
    this.setLinePending(cartItemId, true);
    this.patchLineLocally(cartItemId, nextQty);

    const body: UpdateCartItemRequest = { quantity: nextQty };
    this.http
      .put<ApiResponse<CartDto>>(
        `${environment.apiBaseUrl}/api/cart/items/${cartItemId}`,
        body,
        { headers: this.sessionHeaders() },
      )
      .pipe(finalize(() => this.setLinePending(cartItemId, false)))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.restore(snapshot);
            this.toasts.error(response.error ?? 'Не вдалося оновити кошик');
            return;
          }
          if (response.data) {
            this.applyCart(response.data);
          }
          // Success: no toast — line total / badge update is enough.
        },
        error: (error: unknown) => {
          this.restore(snapshot);
          this.toasts.error(extractApiError(error, 'Не вдалося оновити кошик'));
        },
      });
  }

  removeItem(cartItemId: number): void {
    if (this.pendingLinesSignal()[cartItemId]) return;

    const line = this.itemsSignal().find((item) => item.cartItemId === cartItemId);
    if (!line) return;

    const snapshot = this.snapshot();
    this.setLinePending(cartItemId, true);
    this.removeLineLocally(cartItemId);

    this.http
      .delete<ApiResponse<CartDto>>(
        `${environment.apiBaseUrl}/api/cart/items/${cartItemId}`,
        { headers: this.sessionHeaders() },
      )
      .pipe(finalize(() => this.setLinePending(cartItemId, false)))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.restore(snapshot);
            this.toasts.error(response.error ?? 'Не вдалося видалити');
            return;
          }
          if (response.data) {
            this.applyCart(response.data);
          }
          this.toasts.success('Видалено з кошика');
        },
        error: (error: unknown) => {
          this.restore(snapshot);
          this.toasts.error(extractApiError(error, 'Не вдалося видалити'));
        },
      });
  }

  /** API-only clear — no UI control in this feature. */
  clearCart(): Observable<ApiResponse<CartDto>> {
    return this.http
      .delete<ApiResponse<CartDto>>(`${environment.apiBaseUrl}/api/cart`, {
        headers: this.sessionHeaders(),
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.applyCart(response.data);
          } else if (response.success) {
            this.applyCart({ itemCount: 0, subtotal: 0, items: [] });
          }
        }),
      );
  }

  isLinePending(cartItemId: number): boolean {
    return !!this.pendingLinesSignal()[cartItemId];
  }

  private applyCart(cart: CartDto): void {
    const items = (cart.items ?? []).map(normalizeCartLine);
    this.itemsSignal.set(items);
    this.itemCountSignal.set(cart.itemCount ?? items.reduce((sum, i) => sum + i.quantity, 0));
    this.subtotalSignal.set(
      cart.subtotal ?? items.reduce((sum, i) => sum + i.lineTotal, 0),
    );
  }

  private patchLineLocally(cartItemId: number, quantity: number): void {
    this.itemsSignal.update((items) =>
      items.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        return {
          ...item,
          quantity,
          lineTotal: item.price * quantity,
        };
      }),
    );
    this.recomputeTotalsFromItems();
  }

  private removeLineLocally(cartItemId: number): void {
    this.itemsSignal.update((items) => items.filter((item) => item.cartItemId !== cartItemId));
    this.recomputeTotalsFromItems();
  }

  private recomputeTotalsFromItems(): void {
    const items = this.itemsSignal();
    this.itemCountSignal.set(items.reduce((sum, i) => sum + i.quantity, 0));
    this.subtotalSignal.set(items.reduce((sum, i) => sum + i.lineTotal, 0));
  }

  private snapshot(): { items: CartLineDto[]; itemCount: number; subtotal: number } {
    return {
      items: this.itemsSignal().map((item) => ({ ...item })),
      itemCount: this.itemCountSignal(),
      subtotal: this.subtotalSignal(),
    };
  }

  private restore(snapshot: { items: CartLineDto[]; itemCount: number; subtotal: number }): void {
    this.itemsSignal.set(snapshot.items);
    this.itemCountSignal.set(snapshot.itemCount);
    this.subtotalSignal.set(snapshot.subtotal);
  }

  private setLinePending(cartItemId: number, pending: boolean): void {
    this.pendingLinesSignal.update((map) => {
      if (pending) return { ...map, [cartItemId]: true };
      const next = { ...map };
      delete next[cartItemId];
      return next;
    });
  }

  private sessionHeaders(): HttpHeaders {
    return new HttpHeaders().set(SESSION_HEADER, this.sessionId);
  }

  private resolveSessionId(): string {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing && isUuid(existing)) {
      return existing;
    }

    const created = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, created);
    return created;
  }
}

function normalizeCartLine(raw: CartLineDto & { categoryName?: string }): CartLineDto {
  const quantity = Math.max(1, Math.floor(raw.quantity ?? 1));
  const price = Number(raw.price) || 0;
  return {
    cartItemId: raw.cartItemId,
    productId: raw.productId,
    name: raw.name ?? '',
    slug: raw.slug ?? '',
    category: raw.category ?? raw.categoryName ?? '',
    imageUrl: raw.imageUrl ?? null,
    price,
    quantity,
    lineTotal: raw.lineTotal ?? price * quantity,
    stockQuantity: raw.stockQuantity ?? 0,
    isActive: raw.isActive !== false,
  };
}

/** Matches backend Guid "D" format (8-4-4-4-12). */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const CART_SESSION_CONTRACT = {
  header: SESSION_HEADER,
  storageKey: SESSION_KEY,
} as const;

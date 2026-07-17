import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AddCartItemResponse, ApiResponse } from '../models/catalog.models';

const SESSION_KEY = 'fayno.cart.session-id';
const SESSION_HEADER = 'X-Cart-Session-Id';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly count = signal(0);
  private readonly sessionId = this.getSessionId();

  readonly itemCount = this.count.asReadonly();
  readonly hasItems = computed(() => this.count() > 0);

  addItem(productId: number): Observable<ApiResponse<AddCartItemResponse>> {
    return this.http
      .post<ApiResponse<AddCartItemResponse>>(
        `${environment.apiBaseUrl}/api/cart/items`,
        { productId, quantity: 1 },
        { headers: new HttpHeaders().set(SESSION_HEADER, this.sessionId) },
      )
      .pipe(
        tap((response) => {
          if (response.success) {
            this.count.set(response.data.itemCount);
          }
        }),
      );
  }

  private getSessionId(): string {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing && isUuid(existing)) {
      return existing;
    }

    const created = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, created);
    return created;
  }
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

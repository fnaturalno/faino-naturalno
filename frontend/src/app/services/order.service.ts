import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { OrderSummary } from '../models/auth.models';
import { ApiResponse } from '../models/catalog.models';
import {
  OrderDetailDto,
  PlaceOrderRequest,
  PlaceOrderResponse,
} from '../models/order.models';
import { CartService, CART_SESSION_CONTRACT } from './cart.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly cart = inject(CartService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/orders`;

  getMyOrders(limit = 20): Observable<ApiResponse<OrderSummary[]>> {
    const params = new HttpParams().set('take', String(limit));
    return this.http.get<ApiResponse<OrderSummary[]>>(this.baseUrl, { params });
  }

  /** Place order from the current cart (guest or logged-in). Sends X-Cart-Session-Id. */
  placeOrder(payload: PlaceOrderRequest): Observable<ApiResponse<PlaceOrderResponse>> {
    return this.http.post<ApiResponse<PlaceOrderResponse>>(this.baseUrl, payload, {
      headers: this.sessionHeaders(),
    });
  }

  /** Order confirmation details — requires capability token from place (or owner JWT). */
  getById(id: number, confirmationToken?: string | null): Observable<ApiResponse<OrderDetailDto>> {
    let params = new HttpParams();
    if (confirmationToken) {
      params = params.set('token', confirmationToken);
    }
    return this.http.get<ApiResponse<OrderDetailDto>>(`${this.baseUrl}/${id}`, { params });
  }

  private sessionHeaders(): HttpHeaders {
    return new HttpHeaders().set(CART_SESSION_CONTRACT.header, this.cart.getSessionId());
  }
}

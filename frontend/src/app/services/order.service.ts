import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { OrderSummary } from '../models/auth.models';
import { ApiResponse } from '../models/catalog.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  getMyOrders(limit = 20): Observable<ApiResponse<OrderSummary[]>> {
    const params = new HttpParams().set('take', String(limit));
    return this.http.get<ApiResponse<OrderSummary[]>>(`${environment.apiBaseUrl}/api/orders`, {
      params,
    });
  }
}

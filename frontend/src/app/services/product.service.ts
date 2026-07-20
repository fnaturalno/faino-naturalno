import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  CatalogFilters,
  ProductDetail,
  ProductPage,
} from '../models/catalog.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/products`;

  getProducts(filters: CatalogFilters): Observable<ApiResponse<ProductPage>> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('pageSize', 9)
      .set('sortBy', filters.sortBy);

    if (filters.categories.length) {
      params = params.set('category', filters.categories.join(','));
    }
    if (filters.minPrice !== null) {
      params = params.set('minPrice', filters.minPrice);
    }
    if (filters.maxPrice !== null) {
      params = params.set('maxPrice', filters.maxPrice);
    }

    return this.http.get<ApiResponse<ProductPage>>(this.url, { params });
  }

  /** Fresh load each call — no client-side detail cache. */
  getBySlug(slug: string): Observable<ApiResponse<ProductDetail>> {
    return this.http.get<ApiResponse<ProductDetail>>(
      `${this.url}/${encodeURIComponent(slug)}`,
    );
  }
}

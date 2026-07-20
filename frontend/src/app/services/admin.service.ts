import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/catalog.models';
import {
  AdminCategory,
  AdminOrderDetail,
  AdminOrderPage,
  AdminOrderStatus,
  AdminProduct,
  AdminProductPage,
  SaveCategoryRequest,
  SaveProductRequest,
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api`;

  getProducts(query: { search: string; category: string; page: number; pageSize: number }): Observable<ApiResponse<AdminProductPage>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize)
      .set('includeInactive', 'true');
    if (query.search) params = params.set('search', query.search);
    if (query.category) params = params.set('category', query.category);
    return this.http.get<ApiResponse<AdminProductPage>>(`${this.apiUrl}/products`, { params });
  }

  getProduct(id: number): Observable<ApiResponse<AdminProduct>> {
    return this.http.get<ApiResponse<AdminProduct>>(`${this.apiUrl}/products/${id}`);
  }

  createProduct(payload: SaveProductRequest): Observable<ApiResponse<AdminProduct>> {
    return this.http.post<ApiResponse<AdminProduct>>(`${this.apiUrl}/products`, payload);
  }

  updateProduct(id: number, payload: SaveProductRequest): Observable<ApiResponse<AdminProduct>> {
    return this.http.put<ApiResponse<AdminProduct>>(`${this.apiUrl}/products/${id}`, payload);
  }

  setProductActive(id: number, isActive: boolean): Observable<ApiResponse<AdminProduct>> {
    return this.http.put<ApiResponse<AdminProduct>>(`${this.apiUrl}/products/${id}/active`, { isActive });
  }

  uploadImage(file: File): Observable<ApiResponse<{ url: string }>> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<ApiResponse<{ url: string }>>(`${this.apiUrl}/admin/uploads/images`, body);
  }

  deleteProduct(id: number): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/products/${id}`);
  }

  getCategories(): Observable<ApiResponse<AdminCategory[]>> {
    return this.http.get<ApiResponse<AdminCategory[]>>(`${this.apiUrl}/categories`);
  }

  createCategory(payload: SaveCategoryRequest): Observable<ApiResponse<AdminCategory>> {
    return this.http.post<ApiResponse<AdminCategory>>(`${this.apiUrl}/categories`, payload);
  }

  updateCategory(id: number, payload: SaveCategoryRequest): Observable<ApiResponse<AdminCategory>> {
    return this.http.put<ApiResponse<AdminCategory>>(`${this.apiUrl}/categories/${id}`, payload);
  }

  deleteCategory(id: number): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/categories/${id}`);
  }

  getOrders(query: { search: string; status: string; page: number; pageSize: number }): Observable<ApiResponse<AdminOrderPage>> {
    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    return this.http.get<ApiResponse<AdminOrderPage>>(`${this.apiUrl}/admin/orders`, { params });
  }

  getOrder(id: number): Observable<ApiResponse<AdminOrderDetail>> {
    return this.http.get<ApiResponse<AdminOrderDetail>>(`${this.apiUrl}/admin/orders/${id}`);
  }

  updateOrderStatus(id: number, status: AdminOrderStatus): Observable<ApiResponse<AdminOrderDetail>> {
    return this.http.put<ApiResponse<AdminOrderDetail>>(`${this.apiUrl}/admin/orders/${id}/status`, { status });
  }
}

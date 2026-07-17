import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse, CategorySummary } from '../models/catalog.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);

  getCategories(): Observable<ApiResponse<CategorySummary[]>> {
    return this.http.get<ApiResponse<CategorySummary[]>>(
      `${environment.apiBaseUrl}/api/categories`,
    );
  }
}

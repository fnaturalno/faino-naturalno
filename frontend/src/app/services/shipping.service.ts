import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { NpBranch, NpCity } from '../models/auth.models';
import { ApiResponse } from '../models/catalog.models';

@Injectable({ providedIn: 'root' })
export class ShippingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/shipping/np`;

  searchCities(query: string): Observable<ApiResponse<NpCity[]>> {
    const params = new HttpParams().set('q', query);
    return this.http.get<ApiResponse<NpCity[]>>(`${this.baseUrl}/cities`, { params });
  }

  getBranches(cityId: string): Observable<ApiResponse<NpBranch[]>> {
    const params = new HttpParams().set('cityId', cityId);
    return this.http.get<ApiResponse<NpBranch[]>>(`${this.baseUrl}/branches`, { params });
  }
}

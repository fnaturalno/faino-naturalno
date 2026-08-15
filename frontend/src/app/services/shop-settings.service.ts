import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/catalog.models';
import { ShopSettings } from '../models/settings.models';

@Injectable({ providedIn: 'root' })
export class ShopSettingsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/settings`;

  get(): Observable<ApiResponse<ShopSettings>> {
    return this.http.get<ApiResponse<ShopSettings>>(this.url);
  }
}

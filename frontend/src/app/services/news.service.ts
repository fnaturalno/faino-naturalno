import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/catalog.models';
import { NewsDetail, NewsPage } from '../models/news.models';

@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/news`;

  getNews(page = 1, pageSize = 9): Observable<ApiResponse<NewsPage>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<ApiResponse<NewsPage>>(this.url, { params });
  }

  getBySlug(slug: string): Observable<ApiResponse<NewsDetail>> {
    return this.http.get<ApiResponse<NewsDetail>>(
      `${this.url}/${encodeURIComponent(slug)}`,
    );
  }
}

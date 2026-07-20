import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();
  const isRefresh = req.url.includes('/api/auth/refresh');
  const isPublicAuth =
    req.url.includes('/api/auth/login') ||
    req.url.includes('/api/auth/register') ||
    req.url.includes('/api/auth/forgot-password') ||
    req.url.includes('/api/auth/reset-password');

  const authedReq =
    token && !isRefresh && !isPublicAuth
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isRefresh || isPublicAuth) {
        return throwError(() => error);
      }

      if (req.headers.has('X-Auth-Retry')) {
        auth.clearSession();
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap((accessToken) => {
          if (!accessToken) {
            return throwError(() => error);
          }
          return next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${accessToken}`,
                'X-Auth-Retry': '1',
              },
            }),
          );
        }),
      );
    }),
  );
};

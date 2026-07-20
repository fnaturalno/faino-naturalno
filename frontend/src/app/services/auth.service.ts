import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AUTH_STORAGE_KEYS,
  AuthSession,
  AuthUser,
  DeliveryAddressDto,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  SaveDeliveryAddressRequest,
  UpdateProfileRequest,
} from '../models/auth.models';
import { ApiResponse } from '../models/catalog.models';
import { CartService } from './cart.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly cart = inject(CartService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/auth`;

  private readonly userSignal = signal<AuthUser | null>(this.readStoredUser());
  private readonly accessTokenSignal = signal<string | null>(
    localStorage.getItem(AUTH_STORAGE_KEYS.accessToken),
  );
  private readonly refreshTokenSignal = signal<string | null>(
    localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken),
  );

  private refreshInFlight: Observable<string | null> | null = null;

  readonly currentUser = this.userSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.accessTokenSignal() && !!this.userSignal());

  register(payload: RegisterRequest): Observable<ApiResponse<AuthSession>> {
    return this.http
      .post<ApiResponse<AuthSession>>(`${this.baseUrl}/register`, payload)
      .pipe(switchMap((response) => this.afterAuthSuccess(response)));
  }

  login(payload: LoginRequest): Observable<ApiResponse<AuthSession>> {
    return this.http
      .post<ApiResponse<AuthSession>>(`${this.baseUrl}/login`, payload)
      .pipe(switchMap((response) => this.afterAuthSuccess(response)));
  }

  refresh(): Observable<string | null> {
    const refreshToken = this.refreshTokenSignal();
    if (!refreshToken) {
      return of(null);
    }

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    // shareReplay: concurrent 401 retries must share one refresh HTTP call
    // (cold HttpClient observables would otherwise fire per subscriber).
    this.refreshInFlight = this.http
      .post<ApiResponse<AuthSession | { accessToken: string; refreshToken?: string }>>(
        `${this.baseUrl}/refresh`,
        { refreshToken },
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            this.clearSession();
            return null;
          }

          const data = response.data as AuthSession & { accessToken: string; refreshToken?: string };
          const nextRefresh = data.refreshToken ?? refreshToken;
          this.persistTokens(data.accessToken, nextRefresh);
          if ('user' in data && data.user) {
            this.persistUser(data.user);
          }
          return data.accessToken;
        }),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
        finalize(() => {
          this.refreshInFlight = null;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );

    return this.refreshInFlight;
  }

  logout(): Observable<void> {
    const refreshToken = this.refreshTokenSignal();
    const request$ = refreshToken
      ? this.http.post<ApiResponse<object>>(`${this.baseUrl}/logout`, { refreshToken }).pipe(
          catchError(() => of(null)),
          map(() => undefined),
        )
      : of(undefined);

    return request$.pipe(
      tap(() => this.clearSession()),
      map(() => undefined),
    );
  }

  me(): Observable<ApiResponse<AuthUser>> {
    return this.http.get<ApiResponse<AuthUser>>(`${this.baseUrl}/me`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.persistUser(response.data);
        }
      }),
    );
  }

  updateProfile(payload: UpdateProfileRequest): Observable<ApiResponse<AuthUser>> {
    return this.http.put<ApiResponse<AuthUser>>(`${this.baseUrl}/me`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.persistUser(response.data);
        }
      }),
    );
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<ApiResponse<object>> {
    return this.http.post<ApiResponse<object>>(`${this.baseUrl}/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<ApiResponse<object>> {
    return this.http.post<ApiResponse<object>>(`${this.baseUrl}/reset-password`, payload);
  }

  getDeliveryAddress(): Observable<ApiResponse<DeliveryAddressDto | null>> {
    return this.http.get<ApiResponse<DeliveryAddressDto | null>>(
      `${this.baseUrl}/me/delivery-address`,
    );
  }

  saveDeliveryAddress(
    payload: SaveDeliveryAddressRequest,
  ): Observable<ApiResponse<DeliveryAddressDto>> {
    return this.http.put<ApiResponse<DeliveryAddressDto>>(
      `${this.baseUrl}/me/delivery-address`,
      payload,
    );
  }

  clearSession(): void {
    localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
    localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.userSignal.set(null);
  }

  private afterAuthSuccess(response: ApiResponse<AuthSession>): Observable<ApiResponse<AuthSession>> {
    if (!response.success || !response.data) {
      return of(response);
    }

    this.persistSession(response.data);
    return this.cart.mergeGuestCart().pipe(
      map(() => response),
      catchError(() => of(response)),
    );
  }

  private persistSession(session: AuthSession): void {
    this.persistTokens(session.accessToken, session.refreshToken);
    this.persistUser(session.user);
  }

  private persistTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
    this.accessTokenSignal.set(accessToken);
    this.refreshTokenSignal.set(refreshToken);
  }

  private persistUser(user: AuthUser): void {
    localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
    this.userSignal.set(user);
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.user);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}

export function extractApiError(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiResponse<unknown> | string | null;
    if (body && typeof body === 'object' && 'error' in body && body.error) {
      return String(body.error);
    }
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
  }
  return fallback;
}

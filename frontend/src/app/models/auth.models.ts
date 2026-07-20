import { ApiResponse } from './catalog.models';

export type { ApiResponse };

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface DeliveryAddressDto {
  cityId: string;
  cityName: string;
  cityRegion?: string | null;
  branchId: string;
  branchLabel: string;
  summary: string;
}

export interface SaveDeliveryAddressRequest {
  cityId: string;
  cityName: string;
  cityRegion?: string | null;
  branchId: string;
  branchLabel: string;
}

/** Matches backend NpCityDto JSON (camelCase). */
export interface NpCity {
  cityId: string;
  cityName: string;
  region?: string | null;
}

/** Matches backend NpBranchDto JSON (camelCase). */
export interface NpBranch {
  branchId: string;
  label: string;
  type?: string | null;
}

/** Backend enum may serialize as number or string. */
export type OrderStatusValue =
  | 'Pending'
  | 'Confirmed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 0
  | 1
  | 2
  | 3
  | 4
  | string
  | number;

export interface OrderSummary {
  id: number;
  orderNumber: string;
  createdAt: string;
  itemCount: number;
  totalAmount: number;
  status: OrderStatusValue;
}

export interface CartMergeResponse {
  itemCount: number;
}

export const AUTH_STORAGE_KEYS = {
  accessToken: 'fayno.auth.access-token',
  refreshToken: 'fayno.auth.refresh-token',
  user: 'fayno.auth.user',
} as const;

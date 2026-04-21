// ─── Canonical API response shapes ────────────────────────────────────────────
// Every Worker returns one of these three envelopes.

export interface ApiResponse<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedMeta {
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface PaginatedResponse<T> {
  ok: true;
  data: T[];
  meta: PaginatedMeta;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
export type PaginatedResult<T> = PaginatedResponse<T> | ApiError;

// ─── Typed-ref domain codes ────────────────────────────────────────────────────
export type DomainCode = 'QR' | 'AL' | 'AR' | 'WV' | 'CM' | 'PL' | 'CORE' | 'LX';

// ─── Auth context (set by middleware, consumed by route handlers) ──────────────
export interface AuthContext {
  userId: string;         // CORE:ULID
  workspaceId?: string;   // CORE:ULID
  role?: string;
  isAdmin: boolean;
}

// ─── Pagination helpers ────────────────────────────────────────────────────────
export interface PaginateOptions {
  page?: number;
  per_page?: number;
}

export interface PaginatedRows<T> {
  rows: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

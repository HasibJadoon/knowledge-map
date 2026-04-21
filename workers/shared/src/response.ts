// ─── Response builders ─────────────────────────────────────────────────────────
// Route handlers return plain Responses. Use these builders — never hand-roll
// JSON strings or set Content-Type manually.

import { json } from './http';
import type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginatedRows,
} from './types';

// ── Success ────────────────────────────────────────────────────────────────────

export function ok<T>(data: T, init: ResponseInit = {}): Response {
  const body: ApiResponse<T> = { ok: true, data };
  return json(body, init);
}

export function created<T>(data: T): Response {
  return ok(data, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function paginated<T>(result: PaginatedRows<T>): Response {
  const body: PaginatedResponse<T> = {
    ok: true,
    data: result.rows,
    meta: {
      total: result.total,
      page: result.page,
      per_page: result.per_page,
      has_more: result.has_more,
    },
  };
  return json(body);
}

// ── Errors ─────────────────────────────────────────────────────────────────────

export function err(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  const body: ApiError = { ok: false, error: { code, message, details } };
  return json(body, { status });
}

export function notFound(resource: string): Response {
  return err('not_found', `${resource} not found`, 404);
}

export function unauthorized(message = 'Unauthorized'): Response {
  return err('unauthorized', message, 401);
}

export function forbidden(message = 'Forbidden'): Response {
  return err('forbidden', message, 403);
}

export function badRequest(message: string, details?: unknown): Response {
  return err('bad_request', message, 400, details);
}

export function unprocessable(issues: unknown): Response {
  return err('validation_error', 'Request body validation failed', 422, issues);
}

export function conflict(message: string): Response {
  return err('conflict', message, 409);
}

export function internalError(message = 'Internal server error'): Response {
  return err('internal_error', message, 500);
}

// ─── Request validation helpers ────────────────────────────────────────────────
// Thin wrappers around Zod (or any .safeParse-compatible schema library).
// Route handlers call these; they never call schema.parse() directly.

import { badRequest, unprocessable } from './response';

// Minimal Zod-compatible interface so we don't import Zod in shared directly.
export interface SafeParseSchema<T> {
  safeParse(data: unknown): SafeParseResult<T>;
}

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: Array<{ path: (string | number)[]; message: string }> } };

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; response: Response };

/**
 * Parse and validate the JSON request body against a Zod schema.
 * Returns either `{ success: true, data }` or `{ success: false, response }`.
 * Route handlers should immediately return `result.response` on failure.
 */
export async function parseBody<T>(
  request: Request,
  schema: SafeParseSchema<T>,
): Promise<ValidationResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { success: false, response: badRequest('Request body must be valid JSON') };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return { success: false, response: unprocessable(issues) };
  }

  return { success: true, data: result.data };
}

/**
 * Parse pagination query params with safe defaults.
 */
export function parsePagination(url: URL): { page: number; per_page: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const per_page = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('per_page') ?? '20', 10) || 20),
  );
  return { page, per_page };
}

/**
 * Parse a required integer path param. Returns null if invalid.
 */
export function parseIntParam(value: string): number | null {
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

/**
 * Parse a required string query param. Returns null if missing or empty.
 */
export function requireParam(url: URL, name: string): string | null {
  return url.searchParams.get(name) || null;
}

/**
 * Read a JSON request body, returning `undefined` when the body is absent or
 * not valid JSON. Use when the caller does its own shape checking; use
 * `readJsonObject` when it just needs "an object or nothing".
 */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

/**
 * Read a JSON request body that must be a plain object. Returns `null` for a
 * missing, malformed, non-object or array body, so callers can reject with a
 * single falsy check.
 */
export async function readJsonObject(
  req: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

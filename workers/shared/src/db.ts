// ─── D1 query helpers ──────────────────────────────────────────────────────────
// All SQL execution in domain repositories should go through these helpers.
// Never call db.prepare() directly in route handlers.

import type { PaginateOptions, PaginatedRows } from './types';

/**
 * Execute a SELECT and return all matching rows.
 */
export async function query<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await db.prepare(sql).bind(...params).all<T>();
  return result.results ?? [];
}

/**
 * Execute a SELECT and return the first row, or null if no match.
 */
export async function queryOne<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const row = await db.prepare(sql).bind(...params).first<T>();
  return row ?? null;
}

/**
 * Execute an INSERT / UPDATE / DELETE statement.
 * Returns the raw D1Result (includes meta.last_row_id, meta.changes).
 */
export async function execute(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<D1Result> {
  return db.prepare(sql).bind(...params).run();
}

/**
 * Execute a batch of INSERT / UPDATE / DELETE statements atomically.
 */
export async function executeBatch(
  db: D1Database,
  statements: Array<{ sql: string; params?: unknown[] }>,
): Promise<D1Result[]> {
  const prepared = statements.map(({ sql, params = [] }) =>
    db.prepare(sql).bind(...params),
  );
  return db.batch(prepared);
}

/**
 * Paginated SELECT.
 *
 * @param sql        - SELECT without LIMIT/OFFSET
 * @param countSql   - SELECT COUNT(*) AS count ... (same WHERE clause)
 * @param params     - bind params for both sql and countSql
 * @param opts       - page / per_page
 */
export async function paginate<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  countSql: string,
  params: unknown[] = [],
  opts: PaginateOptions = {},
): Promise<PaginatedRows<T>> {
  const page = Math.max(1, opts.page ?? 1);
  const per_page = Math.min(100, Math.max(1, opts.per_page ?? 20));
  const offset = (page - 1) * per_page;

  const [rows, countRow] = await Promise.all([
    query<T>(db, `${sql} LIMIT ? OFFSET ?`, [...params, per_page, offset]),
    queryOne<{ count: number }>(db, countSql, params),
  ]);

  const total = countRow?.count ?? 0;
  return { rows, total, page, per_page, has_more: offset + rows.length < total };
}

/**
 * Check whether a row exists.
 */
export async function exists(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<boolean> {
  const row = await db.prepare(sql).bind(...params).first<{ n: number }>();
  return (row?.n ?? 0) > 0;
}

/**
 * Build the `SET` clause of an UPDATE from a partial patch object.
 *
 * Keys whose value is `undefined` are skipped, so callers can pass a patch
 * with optional fields and only the supplied ones are written. A key present
 * with value `null` IS written, as an explicit null.
 */
export function buildPatch(
  patch: Record<string, unknown>,
): { setClauses: string; values: unknown[] } {
  const keys = Object.keys(patch).filter(k => patch[k] !== undefined);
  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => patch[k] ?? null);
  return { setClauses, values };
}

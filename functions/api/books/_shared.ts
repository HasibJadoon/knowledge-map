import type { D1Database } from '@cloudflare/workers-types';

export const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
};

export type BookPageChunk = {
  chunk_id: string;
  heading_raw: string | null;
  text_raw: string;
  order_index: number;
};

export type BookPage = {
  page_no: number;
  pdf_page_index: number | null;
  chunks: BookPageChunk[];
};

type SourceRow = {
  ar_u_source: string;
  source_code: string;
};

type PageNoRow = {
  page_no: number | null;
};

type ChunkRow = {
  page_no: number | null;
  pdf_page_index: number | null;
  chunk_id: string;
  heading_raw: string | null;
  text_raw: string | null;
  order_index: number | null;
};

export const clampLimit = (rawLimit: number): number => {
  if (!Number.isFinite(rawLimit)) return 10;
  return Math.min(15, Math.max(1, Math.trunc(rawLimit)));
};

export const clampStart = (rawStart: number): number => {
  if (!Number.isFinite(rawStart)) return 1;
  return Math.max(1, Math.trunc(rawStart));
};

export const toIntOrNull = (raw: string | null): number | null => {
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function resolveSource(db: D1Database, sourceId: string): Promise<SourceRow | null> {
  const raw = String(sourceId ?? '').trim();
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const direct = await db
    .prepare(
      `
        SELECT s.ar_u_source, s.source_code
        FROM ar_u_sources s
        WHERE s.source_code = ? COLLATE NOCASE
           OR s.source_code = ? COLLATE NOCASE
           OR s.ar_u_source = ?
           OR s.ar_u_source = ?
        LIMIT 1
      `
    )
    .bind(raw, decoded, raw, decoded)
    .first<SourceRow>();
  if (direct) return direct;

  // Fallback when source registry row is missing but chunks exist.
  return db
    .prepare(
      `
        SELECT
          c.ar_u_source AS ar_u_source,
          COALESCE(s.source_code, ?) AS source_code
        FROM ar_source_chunks c
        LEFT JOIN ar_u_sources s ON s.ar_u_source = c.ar_u_source
        WHERE c.ar_u_source = ?
           OR c.ar_u_source = ?
           OR s.source_code = ? COLLATE NOCASE
           OR s.source_code = ? COLLATE NOCASE
        GROUP BY c.ar_u_source
        LIMIT 1
      `
    )
    .bind(decoded, raw, decoded, raw, decoded)
    .first<SourceRow>();
}

export async function fetchPagesByRange(
  db: D1Database,
  arUSource: string,
  start: number,
  limit: number
): Promise<{ pages: BookPage[]; has_more: boolean; next_start: number | null }> {
  const { results: pageRows = [] } = await db
    .prepare(
      `
        SELECT DISTINCT c.page_no
        FROM ar_source_chunks c
        WHERE c.ar_u_source = ?
          AND c.page_no IS NOT NULL
          AND c.page_no >= ?
          AND COALESCE(json_extract(c.content_json, '$.chunk_scope'), 'page') = 'page'
        ORDER BY c.page_no ASC
        LIMIT ?
      `
    )
    .bind(arUSource, start, limit)
    .all<PageNoRow>();

  const pageNos = pageRows
    .map((row) => row.page_no)
    .filter((value): value is number => value !== null && Number.isFinite(Number(value)))
    .map((value) => Number(value));

  if (!pageNos.length) {
    return { pages: [], has_more: false, next_start: null };
  }

  const placeholders = pageNos.map(() => '?').join(', ');
  const stmt = db.prepare(
    `
      SELECT
        c.page_no AS page_no,
        COALESCE(
          CAST(json_extract(c.content_json, '$.pdf_page_index') AS INTEGER),
          CAST(json_extract(c.meta_json, '$.pdf_page_index') AS INTEGER),
          CASE
            WHEN c.locator LIKE 'pdf_page:%' THEN CAST(substr(c.locator, 10) AS INTEGER)
            ELSE NULL
          END
        ) AS pdf_page_index,
        c.chunk_id AS chunk_id,
        c.heading_raw AS heading_raw,
        c.text AS text_raw,
        COALESCE(
          CAST(json_extract(c.content_json, '$.order_index') AS INTEGER),
          CAST(json_extract(c.meta_json, '$.order_index') AS INTEGER),
          0
        ) AS order_index
      FROM ar_source_chunks c
      WHERE c.ar_u_source = ?
        AND c.page_no IN (${placeholders})
        AND COALESCE(json_extract(c.content_json, '$.chunk_scope'), 'page') = 'page'
      ORDER BY c.page_no ASC, order_index ASC, c.chunk_id ASC
    `
  );

  const { results: chunkRows = [] } = await stmt.bind(arUSource, ...pageNos).all<ChunkRow>();

  const pageMap = new Map<number, BookPage>();
  for (const pageNo of pageNos) {
    pageMap.set(pageNo, {
      page_no: pageNo,
      pdf_page_index: null,
      chunks: [],
    });
  }

  for (const row of chunkRows) {
    if (row.page_no === null) continue;
    const page = pageMap.get(Number(row.page_no));
    if (!page) continue;
    const pdfIndex = row.pdf_page_index !== null ? Number(row.pdf_page_index) : null;
    if (page.pdf_page_index === null && pdfIndex !== null && Number.isFinite(pdfIndex)) {
      page.pdf_page_index = pdfIndex;
    }
    page.chunks.push({
      chunk_id: row.chunk_id,
      heading_raw: row.heading_raw,
      text_raw: String(row.text_raw ?? ''),
      order_index: Number.isFinite(Number(row.order_index)) ? Number(row.order_index) : 0,
    });
  }

  const pages = pageNos
    .map((pageNo) => pageMap.get(pageNo))
    .filter((page): page is BookPage => !!page);

  const lastPageNo = pages.length ? pages[pages.length - 1].page_no : start;
  const next = await db
    .prepare(
      `
        SELECT MIN(c.page_no) AS page_no
        FROM ar_source_chunks c
        WHERE c.ar_u_source = ?
          AND c.page_no IS NOT NULL
          AND c.page_no > ?
          AND COALESCE(json_extract(c.content_json, '$.chunk_scope'), 'page') = 'page'
      `
    )
    .bind(arUSource, lastPageNo)
    .first<PageNoRow>();

  const nextStart =
    next?.page_no !== null && next?.page_no !== undefined && Number.isFinite(Number(next.page_no))
      ? Number(next.page_no)
      : null;
  const safeNextStart = nextStart !== null && nextStart > start ? nextStart : null;

  return {
    pages,
    has_more: safeNextStart !== null,
    next_start: safeNextStart,
  };
}

export async function fetchSinglePage(
  db: D1Database,
  arUSource: string,
  pageNo: number
): Promise<{ page: BookPage | null; has_more: boolean; next_start: number | null }> {
  const { pages, has_more, next_start } = await fetchPagesByRange(db, arUSource, pageNo, 1);
  const page = pages.find((item) => item.page_no === pageNo) ?? null;
  if (page) return { page, has_more, next_start };

  const next = await db
    .prepare(
      `
        SELECT MIN(c.page_no) AS page_no
        FROM ar_source_chunks c
        WHERE c.ar_u_source = ?
          AND c.page_no IS NOT NULL
          AND c.page_no > ?
          AND COALESCE(json_extract(c.content_json, '$.chunk_scope'), 'page') = 'page'
      `
    )
    .bind(arUSource, pageNo)
    .first<PageNoRow>();

  const nextStart =
    next?.page_no !== null && next?.page_no !== undefined && Number.isFinite(Number(next.page_no))
      ? Number(next.page_no)
      : null;
  const safeNextStart = nextStart !== null && nextStart > pageNo ? nextStart : null;

  return {
    page: null,
    has_more: safeNextStart !== null,
    next_start: safeNextStart,
  };
}

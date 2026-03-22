// POST /api/admin/populate-ayah-text
//
// Fixes verse-number contamination across ar_quran_ayah text columns
// and updates verse_mark to the proper Unicode Quran medallion format.
//
// PROBLEM (confirmed via hex analysis of production D1):
//   text            ends with U+00A0 (NBSP) + Arabic-Indic digit — verse number embedded
//   text_diacritics identical bytes to text — same problem
//   verse_mark      stores "LRM + ornamental brackets + Latin digit" — won't render as medallion
//
// COLUMNS WRITTEN:
//   text_uthmani_clean  NEW  — text with trailing NBSP+digit stripped (canonical diacritic display)
//   text_diacritics     FIXED— trailing verse number removed in place
//   text_bare           NEW  — text_simple normalised for search/FTS
//   verse_mark          FIXED— U+06DD + Arabic-Indic digits (e.g. ۝٢١)
//                              Quran fonts render this as the decorative circular medallion
//
// COLUMNS LEFT UNCHANGED:
//   text                raw source (kept as-is, labeled raw_uthmani in view)
//   verse_full          intentionally carries verse number
//   text_simple / text_normalized / text_non_diacritics — already clean
//
// STRIP PATTERNS (from hex analysis):
//   current format: trailing NBSP or space + Arabic-Indic digit(s) at string end
//   legacy format:  U+06DD or U+06DE circle preceding Arabic-Indic digits
//
// VERSE MARK: U+06DD (Arabic End of Ayah) + Arabic-Indic digits
//   Quran fonts (KFGQPC Hafs, Scheherazade) render this as the decorative medallion
//   Max ayah = 286, so up to 3 Arabic-Indic digits
//
// IDEMPOTENT: only rows with text_uthmani_clean IS NULL are processed.
//
// Auth:   X-Admin-Secret: <ADMIN_SECRET env var>
// Params: ?batch=200  ?offset=0  ?dry_run=1
// Drive:  scripts/populate-ayah-text.sh

import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

type AyahRow = {
  surah: number;
  ayah: number;
  text: string | null;
  text_simple: string | null;
  text_diacritics: string | null;
};

// ─────────────────────────────────────────────────────────────
// Arabic text transformations
// ─────────────────────────────────────────────────────────────

/**
 * Convert a Western integer to Arabic-Indic digit string.
 * 286 → "٢٨٦"   1 → "١"   21 → "٢١"
 */
function toArabicIndic(n: number): string {
  return String(n)
    .split('')
    .map(d => String.fromCharCode(0x0660 + parseInt(d, 10)))
    .join('');
}

/**
 * Build the proper verse-end medallion string.
 * U+06DD (۝) + Arabic-Indic digits.
 * Quran fonts render this as the decorative circular verse marker.
 *
 * Before: "‎﴿21﴾"  (LRM + ornamental brackets + Latin digits) — no rendering
 * After:  "۝٢١"    (U+06DD + Arabic-Indic)                   — renders as ○ medallion
 */
function toVerseMark(ayahNumber: number): string {
  return '\u06DD' + toArabicIndic(ayahNumber);
}

// Strip the trailing verse number from a diacritic text string.
//
// Observed format (hex):  ...diacritic  C2A0  D9A2
//                          = text    + NBSP  + Arabic-Indic digit
//
// Handles two formats:
//   1. Legacy: U+06DD/U+06DE circle immediately before Arabic-Indic digit(s)
//   2. Current: NBSP or space before Arabic-Indic digit(s) at end of string
function stripVerseNumber(s: string): string {
  return s
    .replace(/[\u06DD\u06DE][\u0660-\u0669]*/g, '')         // legacy: ۝ circle + digits
    .replace(/[\u00A0\u0020\t]+[\u0660-\u0669]+\s*$/, '')   // current: NBSP/space + trailing digit
    .trimEnd();
}

/**
 * text_uthmani_clean — Uthmani WITH diacritics, WITHOUT verse number.
 */
function toUthmaniClean(raw: string): string {
  return stripVerseNumber(raw);
}

/**
 * text_diacritics (fix in place) — same source as text, strip verse number.
 * Falls back to raw text if text_diacritics column is null.
 */
function toCleanDiacritics(diacritics: string | null, raw: string | null): string | null {
  const source = diacritics ?? raw;
  return source ? stripVerseNumber(source) : null;
}

// text_bare — stripped bare for search / FTS / matching.
// Source: text_simple (already: no harakat, no verse number, simple script).
//
//   1. Strip tatweel (kashida) U+0640
//   2. Collapse alef variants → ا (U+0627)
//      [آ U+0622, أ U+0623, إ U+0625, ٱ U+0671, ٲ U+0672, ٳ U+0673]
//   3. Collapse alef maqsura ى (U+0649) → ya ي (U+064A)
//   4. Strip residual diacritics: U+0610-U+061A, U+064B-U+065F
function toBare(simple: string): string {
  return simple
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/[\u0610-\u061A\u064B-\u065F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(body),
    { status, headers: JSON_HEADERS }
  ) as unknown as Response;
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const t0 = Date.now();
  const { request, env } = ctx;

  // ── Auth ──────────────────────────────────────────────────
  const secret = request.headers.get('x-admin-secret');
  if (!secret || secret !== env.ADMIN_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url      = new URL(request.url);
  const batchSize = Math.min(parseInt(url.searchParams.get('batch')  ?? '200', 10), 500);
  const offsetParam = url.searchParams.get('offset');
  const dryRun   = url.searchParams.get('dry_run') === '1';

  // ── Count remaining ───────────────────────────────────────
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM ar_quran_ayah WHERE text_uthmani_clean IS NULL`
  ).first<{ n: number }>();

  const totalRemaining = countRow?.n ?? 0;

  if (totalRemaining === 0) {
    return jsonResponse({
      processed: 0,
      skipped: 0,
      total_remaining: 0,
      next_offset: null,
      done: true,
      message: 'All rows already populated.',
      elapsed_ms: Date.now() - t0,
    });
  }

  // ── Fetch batch ───────────────────────────────────────────
  const offset = offsetParam !== null ? parseInt(offsetParam, 10) : 0;

  const rows = await env.DB.prepare(
    `SELECT surah, ayah, text, text_simple, text_diacritics
     FROM ar_quran_ayah
     WHERE text_uthmani_clean IS NULL
     ORDER BY surah, ayah
     LIMIT ? OFFSET ?`
  ).bind(batchSize, offset).all<AyahRow>();

  if (!rows.results.length) {
    return jsonResponse({
      processed: 0,
      skipped: 0,
      total_remaining: totalRemaining,
      next_offset: null,
      done: true,
      elapsed_ms: Date.now() - t0,
    });
  }

  // ── Build UPDATE statements ───────────────────────────────
  let processed = 0;
  let skipped   = 0;
  const statements: ReturnType<D1Database['prepare']>[] = [];

  for (const row of rows.results) {
    if (!row.text && !row.text_simple) {
      skipped++;
      continue;
    }

    const uthmaniClean    = row.text         ? toUthmaniClean(row.text)                      : null;
    const cleanDiacritics = toCleanDiacritics(row.text_diacritics, row.text);
    const bare            = row.text_simple  ? toBare(row.text_simple)                       : null;
    const verseMark       = toVerseMark(row.ayah);  // ۝٢١ — proper medallion format

    if (!dryRun) {
      statements.push(
        env.DB.prepare(
          `UPDATE ar_quran_ayah
           SET text_uthmani_clean = ?,
               text_bare          = ?,
               text_diacritics    = ?,
               verse_mark         = ?
           WHERE surah = ? AND ayah = ?`
        ).bind(uthmaniClean, bare, cleanDiacritics, verseMark, row.surah, row.ayah)
      );
    }
    processed++;
  }

  // ── Execute batch ─────────────────────────────────────────
  if (!dryRun && statements.length > 0) {
    await env.DB.batch(statements);
  }

  const nextOffset     = offset + rows.results.length;
  const stillRemaining = totalRemaining - processed;
  const done           = stillRemaining <= 0;

  return jsonResponse({
    processed,
    skipped,
    total_remaining: stillRemaining,
    next_offset: done ? null : nextOffset,
    done,
    dry_run: dryRun,
    elapsed_ms: Date.now() - t0,
  });
};

// ── Info ──────────────────────────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async () =>
  jsonResponse({
    endpoint: 'POST /api/admin/populate-ayah-text',
    fixes: [
      'text_uthmani_clean — NEW: Uthmani diacritics, verse number stripped',
      'text_bare          — NEW: text_simple normalised for search/FTS',
      'text_diacritics    — FIXED: trailing NBSP+digit removed',
      'verse_mark         — FIXED: ﴿2﴾ → ۝٢  (U+06DD + Arabic-Indic digits)',
    ],
    verse_mark_note: 'U+06DD + Arabic-Indic digits renders as decorative medallion in Quran fonts',
    params: {
      batch:   'rows per call (default 200, max 500)',
      offset:  'manual offset (use next_offset from previous response)',
      dry_run: '1 = compute without writing (for verification)',
    },
    auth:  'Header: X-Admin-Secret: <ADMIN_SECRET>',
    drive: 'scripts/populate-ayah-text.sh',
  });

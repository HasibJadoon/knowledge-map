// ─── /al/source-rag routes ────────────────────────────────────────────────────
// Serves pre-embedded source chunks for Quran word/ayah study.
//
// This worker owns DB_AL (km_arabic_linguistic) only.
// It covers:
//   - ar_ling_source_chunk  → lexicon / irab / balagha / near-synonym chunks
//   - ar_ling_vector_records → links to qr_tafsir_entries + qr_translations
//     (text for those lives in km_quran, resolved by the backend proxy)
//
// Endpoints:
//   GET /al/source-rag/health
//   GET /al/source-rag/al-chunks      → lexicon/irab/balagha text (DB_AL)
//   GET /al/source-rag/vector-links   → vector record refs for all source types
//   GET /al/source-rag/bundle         → combined: al-chunks + tafsir/trans refs

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';

// ── types ─────────────────────────────────────────────────────────────────────

interface AlChunk {
  id: string;
  source_slug: string | null;
  chunk_kind: string | null;
  heading_norm: string | null;
  text_ar: string;
  text_en: string | null;
  page_no: number | null;
  volume_no: number | null;
  surah_no: number | null;
  ayah_start: number | null;
  ayah_end: number | null;
  source_url: string | null;
}

interface VectorLink {
  id: string;
  target_db: string;
  target_table: string;
  target_id: string;
  work_id: string | null;
  scholar_id: string | null;
  chunk_kind: string | null;
  source_slug: string | null;
  surah_no: number | null;
  ayah_start: number | null;
  ayah_end: number | null;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function parseAyah(url: URL): { surah: number | null; ayah: number | null } {
  const surah = parseInt(url.searchParams.get('surah') || '');
  const ayah  = parseInt(url.searchParams.get('ayah')  || '');
  return {
    surah: isNaN(surah) ? null : surah,
    ayah:  isNaN(ayah)  ? null : ayah,
  };
}

function extractSourceUrl(metaJson: string | null): string | null {
  if (!metaJson) return null;
  try {
    const m = JSON.parse(metaJson);
    return m?.source_url ?? m?.locator?.source_url ?? null;
  } catch {
    return null;
  }
}

function extractSourceSlug(metaJson: string | null): string | null {
  if (!metaJson) return null;
  try {
    const m = JSON.parse(metaJson);
    return m?.source_slug ?? null;
  } catch {
    return null;
  }
}

// ── route registration ────────────────────────────────────────────────────────

export function sourceRagRoutes(router: Router<ArLinguisticsEnv>) {

  // ── health ─────────────────────────────────────────────────────────────────
  router.get('/al/source-rag/health', async (_req, env) => {
    const row = await env.DB_AL
      .prepare('SELECT COUNT(*) as cnt FROM ar_ling_source_chunk WHERE is_embedded=1')
      .first<{ cnt: number }>();
    const vr = await env.DB_AL
      .prepare('SELECT COUNT(*) as cnt FROM ar_ling_vector_records')
      .first<{ cnt: number }>();
    return ok({
      status: 'ok',
      al_chunks_embedded: row?.cnt ?? 0,
      vector_records:     vr?.cnt ?? 0,
    });
  });

  // ── GET /al/source-rag/al-chunks ───────────────────────────────────────────
  // Returns lexicon / irab / balagha / near-synonym chunks from DB_AL.
  // Query params:
  //   surah        (required)
  //   ayah         (optional — if omitted returns whole surah range)
  //   kind         (optional) — filter by chunk_kind
  //   source_slug  (optional) — filter by source
  //   limit        (default 50)
  router.get('/al/source-rag/al-chunks', async (req, env) => {
    const url = new URL(req.url);
    const { surah, ayah } = parseAyah(url);
    if (!surah) return badRequest('surah param required');

    const kind       = url.searchParams.get('kind');
    const sourceSlug = url.searchParams.get('source_slug');
    const limit      = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

    const conditions: string[] = [
      'surah_no = ?',
      'is_embedded = 1',
      "text_ar IS NOT NULL",
    ];
    const params: (number | string)[] = [surah];

    if (ayah !== null) {
      // Match chunks whose range overlaps the requested ayah
      conditions.push('ayah_start <= ? AND ayah_end >= ?');
      params.push(ayah, ayah);
    }
    if (kind) {
      conditions.push('chunk_kind = ?');
      params.push(kind);
    }
    if (sourceSlug) {
      conditions.push("meta_json LIKE ?");
      params.push(`%${sourceSlug}%`);
    }

    const sql = `
      SELECT id, chunk_kind, heading_norm, text_ar, text_en,
             page_no, volume_no, meta_json,
             surah_no, ayah_start, ayah_end
      FROM ar_ling_source_chunk
      WHERE ${conditions.join(' AND ')}
      ORDER BY chunk_kind, ayah_start, id
      LIMIT ?
    `;
    params.push(limit);

    const { results } = await env.DB_AL
      .prepare(sql)
      .bind(...params)
      .all<Record<string, unknown>>();

    const chunks: AlChunk[] = results.map(r => ({
      id:           r.id as string,
      source_slug:  extractSourceSlug(r.meta_json as string | null),
      chunk_kind:   r.chunk_kind as string | null,
      heading_norm: r.heading_norm as string | null,
      text_ar:      r.text_ar as string,
      text_en:      r.text_en as string | null,
      page_no:      r.page_no as number | null,
      volume_no:    r.volume_no as number | null,
      surah_no:     r.surah_no as number | null,
      ayah_start:   r.ayah_start as number | null,
      ayah_end:     r.ayah_end as number | null,
      source_url:   extractSourceUrl(r.meta_json as string | null),
    }));

    return ok({ surah, ayah, chunks, total: chunks.length });
  });

  // ── GET /al/source-rag/vector-links ────────────────────────────────────────
  // Returns ar_ling_vector_records for surah/ayah — includes refs to
  // qr_tafsir_entries and qr_translations in km_quran.
  // The backend proxy uses these to fetch actual text from km_quran worker.
  // Query params:
  //   surah        (required)
  //   ayah         (optional)
  //   target_table (optional) — e.g. 'qr_tafsir_entries'
  //   work_id      (optional) — filter to one tafsir work
  //   limit        (default 100)
  router.get('/al/source-rag/vector-links', async (req, env) => {
    const url = new URL(req.url);
    const { surah, ayah } = parseAyah(url);
    if (!surah) return badRequest('surah param required');

    const targetTable = url.searchParams.get('target_table');
    const workId      = url.searchParams.get('work_id');
    const limit       = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);

    const conditions: string[] = ['surah_no = ?'];
    const params: (number | string)[] = [surah];

    if (ayah !== null) {
      conditions.push('ayah_start <= ? AND ayah_end >= ?');
      params.push(ayah, ayah);
    }
    if (targetTable) {
      conditions.push('target_table = ?');
      params.push(targetTable);
    }
    if (workId) {
      conditions.push('work_id = ?');
      params.push(workId);
    }

    const sql = `
      SELECT id, target_db, target_table, target_id,
             work_id, scholar_id, chunk_kind, source_slug,
             surah_no, ayah_start, ayah_end
      FROM ar_ling_vector_records
      WHERE ${conditions.join(' AND ')}
      ORDER BY chunk_kind, ayah_start
      LIMIT ?
    `;
    params.push(limit);

    const { results } = await env.DB_AL
      .prepare(sql)
      .bind(...params)
      .all<VectorLink>();

    return ok({ surah, ayah, links: results, total: results.length });
  });

  // ── GET /al/source-rag/bundle ──────────────────────────────────────────────
  // Combined endpoint: returns al-chunks (text included) +
  // tafsir/translation refs (text to be fetched from km_quran by caller).
  // This is the primary endpoint for the study panel.
  //
  // Query params:
  //   surah  (required)
  //   ayah   (optional — omit for whole-surah balagha/thematic chunks)
  //   kinds  (optional, comma-sep) — filter chunk_kinds to return
  //          default: lexical_entry,lexical_word_entry,irab,irab_tafsir,semantic,balagha_concept
  //
  // Response shape:
  //   {
  //     surah, ayah,
  //     al_chunks:       AlChunk[],          -- text in DB_AL (lexicon, irab, etc.)
  //     tafsir_refs:     VectorLink[],       -- caller fetches from km_quran
  //     translation_refs: VectorLink[],      -- caller fetches from km_quran
  //   }
  router.get('/al/source-rag/bundle', async (req, env) => {
    const url  = new URL(req.url);
    const { surah, ayah } = parseAyah(url);
    if (!surah) return badRequest('surah param required');

    const kindsParam = url.searchParams.get('kinds');
    const kinds = kindsParam
      ? kindsParam.split(',').map(k => k.trim()).filter(Boolean)
      : ['lexical_entry', 'lexical_word_entry', 'irab', 'irab_tafsir', 'semantic', 'balagha_concept'];

    const ayahCondition = ayah !== null
      ? 'AND ayah_start <= ? AND ayah_end >= ?'
      : '';
    const ayahParams: number[] = ayah !== null ? [ayah, ayah] : [];

    // 1. AL chunks (text in DB_AL)
    const kindPlaceholders = kinds.map(() => '?').join(',');
    const alSql = `
      SELECT id, chunk_kind, heading_norm, text_ar, text_en,
             page_no, volume_no, meta_json,
             surah_no, ayah_start, ayah_end
      FROM ar_ling_source_chunk
      WHERE surah_no = ? ${ayahCondition}
        AND chunk_kind IN (${kindPlaceholders})
        AND is_embedded = 1
      ORDER BY chunk_kind, ayah_start
      LIMIT 100
    `;
    const alParams: (number | string)[] = [surah, ...ayahParams, ...kinds];

    // 2. Tafsir refs (km_quran)
    const tafsirSql = `
      SELECT id, target_db, target_table, target_id,
             work_id, scholar_id, chunk_kind, source_slug,
             surah_no, ayah_start, ayah_end
      FROM ar_ling_vector_records
      WHERE surah_no = ? ${ayahCondition}
        AND target_table = 'qr_tafsir_entries'
      ORDER BY work_id, ayah_start
      LIMIT 100
    `;

    // 3. Translation refs (km_quran)
    const transSql = `
      SELECT id, target_db, target_table, target_id,
             work_id, scholar_id, chunk_kind, source_slug,
             surah_no, ayah_start, ayah_end
      FROM ar_ling_vector_records
      WHERE surah_no = ? ${ayahCondition}
        AND chunk_kind = 'translation'
      ORDER BY source_slug, ayah_start
      LIMIT 50
    `;

    const [alRes, tafsirRes, transRes] = await Promise.all([
      env.DB_AL.prepare(alSql).bind(...alParams).all<Record<string, unknown>>(),
      env.DB_AL.prepare(tafsirSql).bind(surah, ...ayahParams).all<VectorLink>(),
      env.DB_AL.prepare(transSql).bind(surah, ...ayahParams).all<VectorLink>(),
    ]);

    const alChunks: AlChunk[] = alRes.results.map(r => ({
      id:           r.id as string,
      source_slug:  extractSourceSlug(r.meta_json as string | null),
      chunk_kind:   r.chunk_kind as string | null,
      heading_norm: r.heading_norm as string | null,
      text_ar:      r.text_ar as string,
      text_en:      r.text_en as string | null,
      page_no:      r.page_no as number | null,
      volume_no:    r.volume_no as number | null,
      surah_no:     r.surah_no as number | null,
      ayah_start:   r.ayah_start as number | null,
      ayah_end:     r.ayah_end as number | null,
      source_url:   extractSourceUrl(r.meta_json as string | null),
    }));

    return ok({
      surah,
      ayah,
      al_chunks:        alChunks,
      al_chunks_count:  alChunks.length,
      tafsir_refs:      tafsirRes.results,
      tafsir_count:     tafsirRes.results.length,
      translation_refs: transRes.results,
      trans_count:      transRes.results.length,
    });
  });
}

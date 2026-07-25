// ─── /qr/irab/dep-graph routes ────────────────────────────────────────────────
// Serves ayah dependency-graph SVGs from R2 (km-quran-dep-graphs bucket).
// SVGs were uploaded by scripts/irab-ingestion/upload-dep-graphs-r2.mjs.
// Key format in R2: dep-graphs/{surah}/{surah}:{ayah}.svg

import type { Router } from '../../../shared/src/router';
import { badRequest } from '../../../shared/src/response';
import type { QuranEnv } from '../env';

function r2Key(surah: number, ayah: number): string {
  return `dep-graphs/${surah}/${surah}:${ayah}.svg`;
}

export function depGraphRoutes(router: Router<QuranEnv>) {

  // GET /qr/irab/dep-graph/:surah/:ayah
  // Returns the raw SVG for the given ayah. Cache-Control: immutable (SVGs never change).
  router.get('/qr/irab/dep-graph/:surah/:ayah', async (_req, env, params) => {
    const surah = parseInt(params.surah ?? '');
    const ayah  = parseInt(params.ayah  ?? '');
    if (isNaN(surah) || isNaN(ayah)) return badRequest('surah and ayah must be numbers');

    const obj = await env.DEP_GRAPHS_BUCKET.get(r2Key(surah, ayah));
    if (!obj) return new Response('Dependency graph not found', { status: 404 });

    return new Response(obj.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(obj.size),
      },
    });
  });

  // GET /qr/irab/dep-graph/:surah/:ayah/meta
  // Returns chunk metadata (r2_key, svg_bytes, ayah span) from D1 without fetching the SVG.
  router.get('/qr/irab/dep-graph/:surah/:ayah/meta', async (_req, env, params) => {
    const surah = parseInt(params.surah ?? '');
    const ayah  = parseInt(params.ayah  ?? '');
    if (isNaN(surah) || isNaN(ayah)) return badRequest('surah and ayah must be numbers');

    const row = await env.DB_QR
      .prepare(
        `SELECT id, source_record_id, ayah_key, group_ayah_key, ayah_from, ayah_to, clean_text
         FROM qr_irab_source_chunk
         WHERE source_slug = 'qul_dep_graphs' AND surah = ? AND ayah_from = ?
         LIMIT 1`,
      )
      .bind(surah, ayah)
      .first<{
        id: string;
        source_record_id: string;
        ayah_key: string;
        group_ayah_key: string | null;
        ayah_from: number;
        ayah_to: number;
        clean_text: string | null;
      }>();

    if (!row) return new Response('Dependency graph not found', { status: 404 });

    let meta: Record<string, unknown> = {};
    try { meta = JSON.parse(row.clean_text ?? '{}'); } catch { /* ignore */ }

    return Response.json({
      id: row.id,
      ayah_key: row.ayah_key,
      surah,
      ayah_from: row.ayah_from,
      ayah_to: row.ayah_to,
      r2_key: meta.r2_key ?? null,
      svg_bytes: meta.svg_bytes ?? null,
      svg_url: `/qr/irab/dep-graph/${surah}/${ayah}`,
    });
  });
}

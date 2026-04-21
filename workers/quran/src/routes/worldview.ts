// ─── /qr/surahs/:id/worldview routes ─────────────────────────────────────────
// Surah-scoped worldview projection data owned by the Quran worker.

import type { Router } from '../../../shared/src/router';
import { badRequest, ok } from '../../../shared/src/response';
import { parseIntParam, parsePagination } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { ProjectionRepo, type DocLink, type WorldviewNode } from '../repositories/projection.repo';

function parseSurahId(id: string): number | null {
  const surahId = parseIntParam(id);
  return surahId && surahId >= 1 && surahId <= 114 ? surahId : null;
}

function emptyHub(surahId: number) {
  return {
    ok: true,
    surahId,
    counts: { nodes: 0, sources: 0, notes: 0, documents: 0 },
  };
}

function mapNode(row: WorldviewNode, edgeCount = 0) {
  return {
    id: row.id,
    title: row.label_en,
    node_type: row.node_type,
    text_plain: row.summary_md ?? undefined,
    summary: row.summary_md ?? undefined,
    slug: row.label_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    status: 'active',
    edge_count: edgeCount,
    evidence_count: row.source_claim_id ? 1 : 0,
    quran_link_count: 1,
  };
}

function mapDocLink(row: DocLink) {
  return {
    id: row.id,
    title: row.cm_doc_ref,
    doc_type: row.link_type,
    summary: row.note_md ?? undefined,
    status: 'active',
    block_count: 0,
    node_count: 0,
  };
}

async function listNodes(env: QuranEnv, surahId: number, request: Request) {
  const page = await new ProjectionRepo(env.DB_QR).worldviewNodes(
    { surah: surahId },
    parsePagination(new URL(request.url)),
  );

  return page;
}

export function worldviewRoutes(router: Router<QuranEnv>) {
  router.get('/qr/surahs/:id/worldview', async (request, env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');

    const repo = new ProjectionRepo(env.DB_QR);
    const [nodes, documents] = await Promise.all([
      listNodes(env, surahId, request).catch(() => null),
      repo.docLinks('surah', String(surahId)).catch(() => []),
    ]);

    const response = emptyHub(surahId);
    response.counts.nodes = nodes?.total ?? 0;
    response.counts.documents = documents.length;
    return ok(response);
  });

  router.get('/qr/surahs/:id/worldview/nodes', async (request, env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');

    const page = await listNodes(env, surahId, request).catch(() => ({ rows: [], total: 0 }));

    return ok({
      ok: true,
      surahId,
      total: page.total,
      nodes: page.rows.map((row) => mapNode(row)),
    });
  });

  router.get('/qr/surahs/:id/worldview/documents', async (_request, env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');

    const documents = await new ProjectionRepo(env.DB_QR)
      .docLinks('surah', String(surahId))
      .catch(() => []);

    return ok({
      ok: true,
      surahId,
      total: documents.length,
      documents: documents.map(mapDocLink),
    });
  });

  router.get('/qr/surahs/:id/worldview/sources', async (_request, _env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');
    return ok({ ok: true, surahId, total: 0, sources: [] });
  });

  router.get('/qr/surahs/:id/worldview/notes', async (_request, _env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');
    return ok({ ok: true, surahId, total: 0, notes: [] });
  });

  router.get('/qr/surahs/:id/worldview/podcasts', async (_request, _env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');
    return ok({ ok: true, surahId, total: 0, items: [], podcasts: [] });
  });

  router.get('/qr/surahs/:id/worldview/links', async (_request, _env, { id }) => {
    const surahId = parseSurahId(id);
    if (!surahId) return badRequest('Invalid surah ID');
    return ok({ ok: true, surahId, total: 0, links: [] });
  });
}

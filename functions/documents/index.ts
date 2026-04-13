import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import { json, parseBody, readTrimmed, readInteger, asRecord } from '../_utils/sprint';
import { createEmptyWorldviewStudyNoteDocument } from '../worldview/_document-tiptap';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const ALLOWED_DOC_TYPES = new Set([
  'study_note', 'article', 'lesson', 'podcast_script',
  'research_paper', 'reflection', 'draft',
  'running_notes', 'morphology', 'nahw', 'passage_notes', 'tafsir',
]);

const ALLOWED_DOMAINS = new Set([
  'quran', 'arabic', 'worldview', 'classical_theology',
  'jewish_wv', 'christian_wv', 'history', 'planner', 'workspace', 'other',
]);

// GET /documents — list documents by scope
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const domain = readTrimmed(url.searchParams.get('domain'));
    const surah = readInteger(url.searchParams.get('surah'));
    const sourceId = readTrimmed(url.searchParams.get('source_id') ?? url.searchParams.get('sourceId'));
    const sourceUnitId = readTrimmed(url.searchParams.get('source_unit_id') ?? url.searchParams.get('sourceUnitId'));
    const unitId = readTrimmed(url.searchParams.get('unit_id') ?? url.searchParams.get('unitId'));
    const docType = readTrimmed(url.searchParams.get('doc_type') ?? url.searchParams.get('docType'));

    const whereClauses: string[] = ['deleted_at IS NULL'];
    const binds: (string | number | null)[] = [];
    let idx = 1;

    if (domain) {
      whereClauses.push(`domain = ?${idx++}`);
      binds.push(domain);
    }
    if (surah !== null) {
      whereClauses.push(`surah = ?${idx++}`);
      binds.push(surah);
    }
    if (sourceId) {
      whereClauses.push(`source_id = ?${idx++}`);
      binds.push(sourceId);
    }
    if (sourceUnitId) {
      whereClauses.push(`(source_unit_id = ?${idx} OR unit_id = ?${idx})`);
      binds.push(sourceUnitId);
      idx++;
    } else if (unitId) {
      whereClauses.push(`unit_id = ?${idx++}`);
      binds.push(unitId);
    }
    if (docType) {
      whereClauses.push(`doc_type = ?${idx++}`);
      binds.push(docType);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const { results } = await ctx.env.DB.prepare(`
      SELECT id, title, doc_type, summary, status, is_published, domain, surah,
             source_id, source_unit_id, unit_id, created_at, updated_at
      FROM wv_documents
      ${where}
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 100
    `).bind(...binds).all<Record<string, unknown>>();

    return json({
      ok: true,
      total: (results ?? []).length,
      documents: (results ?? []).map(normalizeListItem),
    });
  } catch (err: unknown) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
};

// POST /documents — create a new document
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) return json({ ok: false, error: 'Unauthorized' }, 401);

    const body = await parseBody(ctx.request);
    if (!body) return json({ ok: false, error: 'Invalid JSON' }, 400);

    const title = readTrimmed(body['title']);
    const docType = readTrimmed(body['doc_type'] ?? body['docType']) ?? 'draft';
    const domain = readTrimmed(body['domain']) ?? 'quran';
    const surah = readInteger(body['surah']);
    const sourceId = readTrimmed(body['source_id'] ?? body['sourceId']);
    const sourceUnitId = readTrimmed(body['source_unit_id'] ?? body['sourceUnitId']);
    const unitId = readTrimmed(body['unit_id'] ?? body['unitId']);
    const summary = readTrimmed(body['summary']);
    const workspaceId = readTrimmed(body['workspace_id'] ?? body['workspaceId']);

    if (!title) return json({ ok: false, error: 'title is required' }, 400);
    if (!ALLOWED_DOC_TYPES.has(docType)) return json({ ok: false, error: `Invalid doc_type: ${docType}` }, 400);
    if (!ALLOWED_DOMAINS.has(domain)) return json({ ok: false, error: `Invalid domain: ${domain}` }, 400);

    // Resolve workspace_id — try to derive from source if not provided
    let finalWorkspaceId = workspaceId;
    if (!finalWorkspaceId && sourceId) {
      const src = await ctx.env.DB.prepare(
        'SELECT workspace_id FROM wv_sources WHERE id = ?1 LIMIT 1'
      ).bind(sourceId).first<{ workspace_id?: string }>();
      finalWorkspaceId = readTrimmed(src?.workspace_id);
    }
    if (!finalWorkspaceId) {
      const ws = await ctx.env.DB.prepare(
        'SELECT id FROM workspaces WHERE user_id = ?1 ORDER BY created_at ASC LIMIT 1'
      ).bind(user.id).first<{ id?: string }>();
      finalWorkspaceId = readTrimmed(ws?.id);
    }
    if (!finalWorkspaceId) return json({ ok: false, error: 'No workspace found for this user' }, 400);

    const slug = slugify(title);
    const uuid8 = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const scopeKey = surah ? `q${surah}` : sourceId ? slugify(sourceId) : domain;
    const docId = `wv_doc_${scopeKey}_${slug}_${uuid8}`;
    const canonicalInput = `wv_document:${domain}:${scopeKey}:${slugify(docType)}:${uuid8}`;
    const emptyDoc = createEmptyWorldviewStudyNoteDocument();

    await ctx.env.DB.prepare(`
      INSERT INTO wv_documents (
        id, canonical_input, workspace_id, user_id, doc_type, title, summary,
        status, domain, surah, source_id, source_unit_id, unit_id, document_json, meta_json
      )
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active', ?8, ?9, ?10, ?11, ?12, ?13, NULL)
    `).bind(
      docId, canonicalInput, finalWorkspaceId, user.id,
      docType, title, summary,
      domain, surah, sourceId, sourceUnitId, unitId,
      JSON.stringify(emptyDoc),
    ).run();

    return json({ ok: true, document_id: docId, document: {
      id: docId,
      title,
      doc_type: docType,
      summary,
      domain,
      surah,
      source_id: sourceId,
      source_unit_id: sourceUnitId,
      unit_id: unitId,
      status: 'active',
      is_published: 0,
      document_json: emptyDoc,
    }}, 201);
  } catch (err: unknown) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
  });

function normalizeListItem(row: Record<string, unknown>) {
  return {
    id: String(row['id'] ?? ''),
    title: String(row['title'] ?? ''),
    doc_type: String(row['doc_type'] ?? 'draft'),
    summary: readTrimmed(row['summary']),
    status: String(row['status'] ?? 'active'),
    is_published: Number(row['is_published'] ?? 0) === 1,
    domain: readTrimmed(row['domain']),
    surah: readInteger(row['surah']),
    source_id: readTrimmed(row['source_id']),
    source_unit_id: readTrimmed(row['source_unit_id']),
    unit_id: readTrimmed(row['unit_id']),
    created_at: String(row['created_at'] ?? ''),
    updated_at: readTrimmed(row['updated_at']),
  };
}

function slugify(value: string): string {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'doc';
}

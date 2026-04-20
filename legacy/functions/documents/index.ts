import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { asRecord, json, parseBody, readTrimmed, readInteger } from '../_utils/sprint';
import { createEmptyWorldviewStudyNoteDocument } from '../worldview/_document-tiptap';

interface Env {
  DB: D1Database;
}

const ALLOWED_DOC_TYPES = new Set([
  'study_note', 'article', 'lesson', 'podcast_script',
  'research_paper', 'reflection', 'draft',
  'running_notes', 'morphology', 'nahw', 'passage_notes', 'tafsir',
]);

const STORED_DOC_TYPE_BY_REQUESTED: Record<string, string> = {
  running_notes: 'study_note',
  morphology: 'study_note',
  nahw: 'study_note',
  passage_notes: 'study_note',
  tafsir: 'study_note',
};

const ALLOWED_DOMAINS = new Set([
  'quran', 'arabic', 'worldview', 'classical_theology',
  'jewish_wv', 'christian_wv', 'history', 'planner', 'workspace', 'other',
]);

const DEFAULT_WORKSPACE_IDS_BY_DOMAIN: Record<string, string[]> = {
  quran: ['ws_quran'],
};

const FALLBACK_WORKSPACE_IDS = ['ws_user_1'];

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
      const storedDocType = mapRequestedDocTypeToStoredDocType(docType);
      if (storedDocType === docType) {
        whereClauses.push(`doc_type = ?${idx++}`);
        binds.push(docType);
      } else {
        whereClauses.push(`doc_type = ?${idx} AND json_extract(meta_json, '$.requested_doc_type') = ?${idx + 1}`);
        binds.push(storedDocType, docType);
        idx += 2;
      }
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const { results } = await ctx.env.DB.prepare(`
      SELECT id, title, doc_type, summary, status, is_published, domain, surah,
             source_id, source_unit_id, unit_id, meta_json, created_at, updated_at
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
    const userId = readInteger(body['user_id'] ?? body['userId']);

    if (!title) return json({ ok: false, error: 'title is required' }, 400);
    if (!ALLOWED_DOC_TYPES.has(docType)) return json({ ok: false, error: `Invalid doc_type: ${docType}` }, 400);
    if (!ALLOWED_DOMAINS.has(domain)) return json({ ok: false, error: `Invalid domain: ${domain}` }, 400);

    if (workspaceId) {
      const requestedWorkspace = await ctx.env.DB.prepare(
        `SELECT id
         FROM workspaces
         WHERE id = ?1
           AND status = 'active'
         LIMIT 1`
      ).bind(workspaceId).first<{ id?: string }>();

      if (!readTrimmed(requestedWorkspace?.id)) {
        return json({ ok: false, error: `Invalid workspace_id: ${workspaceId}` }, 400);
      }
    }

    const finalWorkspaceId = await resolveDocumentWorkspaceId(ctx.env.DB, {
      requestedWorkspaceId: workspaceId,
      sourceId,
      domain,
    });
    if (!finalWorkspaceId) {
      return json({ ok: false, error: 'No active workspace available for document creation' }, 400);
    }

    const storedDocType = mapRequestedDocTypeToStoredDocType(docType);
    const slug = slugify(title);
    const uuid8 = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const scopeKey = surah ? `q${surah}` : sourceId ? slugify(sourceId) : domain;
    const docId = `wv_doc_${scopeKey}_${slug}_${uuid8}`;
    const canonicalInput = `wv_document:${domain}:${scopeKey}:${slugify(docType)}:${uuid8}`;
    const emptyDoc = createEmptyWorldviewStudyNoteDocument();
    const metaJson = buildDocumentMetaJson(docType, storedDocType);

    await ctx.env.DB.prepare(`
      INSERT INTO wv_documents (
        id, canonical_input, workspace_id, user_id, doc_type, title, summary,
        status, domain, surah, source_id, source_unit_id, unit_id, document_json, meta_json
      )
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active', ?8, ?9, ?10, ?11, ?12, ?13, ?14)
    `).bind(
      docId, canonicalInput, finalWorkspaceId, userId,
      storedDocType, title, summary,
      domain, surah, sourceId, sourceUnitId, unitId,
      JSON.stringify(emptyDoc),
      metaJson ? JSON.stringify(metaJson) : null,
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
  const meta = parseMetaJson(row['meta_json']);
  return {
    id: String(row['id'] ?? ''),
    title: String(row['title'] ?? ''),
    doc_type: resolveResponseDocType(String(row['doc_type'] ?? 'draft'), meta),
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

function mapRequestedDocTypeToStoredDocType(docType: string): string {
  return STORED_DOC_TYPE_BY_REQUESTED[docType] ?? docType;
}

function buildDocumentMetaJson(requestedDocType: string, storedDocType: string): Record<string, string> | null {
  if (requestedDocType === storedDocType) return null;
  return { requested_doc_type: requestedDocType };
}

function parseMetaJson(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function resolveResponseDocType(storedDocType: string, meta: Record<string, unknown> | null): string {
  return readTrimmed(meta?.['requested_doc_type']) ?? storedDocType;
}

async function resolveDocumentWorkspaceId(
  db: D1Database,
  input: { requestedWorkspaceId: string | null; sourceId: string | null; domain: string }
): Promise<string | null> {
  if (input.requestedWorkspaceId) return input.requestedWorkspaceId;

  if (input.sourceId) {
    const sourceWorkspace = await db.prepare(
      `SELECT s.workspace_id
       FROM wv_sources s
       INNER JOIN workspaces w
         ON w.id = s.workspace_id
       WHERE s.id = ?1
         AND w.status = 'active'
       LIMIT 1`
    ).bind(input.sourceId).first<{ workspace_id?: string }>();

    const sourceWorkspaceId = readTrimmed(sourceWorkspace?.workspace_id);
    if (sourceWorkspaceId) return sourceWorkspaceId;
  }

  const candidateIds = [
    ...(DEFAULT_WORKSPACE_IDS_BY_DOMAIN[input.domain] ?? []),
    ...FALLBACK_WORKSPACE_IDS,
  ];

  for (const candidateId of candidateIds) {
    const workspace = await db.prepare(
      `SELECT id
       FROM workspaces
       WHERE id = ?1
         AND status = 'active'
       LIMIT 1`
    ).bind(candidateId).first<{ id?: string }>();

    const workspaceId = readTrimmed(workspace?.id);
    if (workspaceId) return workspaceId;
  }

  const firstWorkspace = await db.prepare(
    `SELECT id
     FROM workspaces
     WHERE status = 'active'
     ORDER BY created_at ASC
     LIMIT 1`
  ).first<{ id?: string }>();

  return readTrimmed(firstWorkspace?.id);
}

function slugify(value: string): string {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'doc';
}

import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { json, parseBody, readTrimmed, readInteger, asRecord } from '../_utils/sprint';
import {
  deriveWorldviewDocumentBlocksFromTiptap,
} from '../worldview/_document-blocks';

interface Env {
  DB: D1Database;
}

type Row = Record<string, unknown>;

function safeJson(s: unknown): unknown {
  if (typeof s !== 'string' || !s.trim()) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function isTiptapDoc(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
    && (v as Record<string, unknown>)['type'] === 'doc';
}

// GET /documents/:id
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = String(ctx.params['id']);

    const row = await ctx.env.DB.prepare(`
      SELECT id, title, doc_type, summary, status, is_published, domain, surah,
             source_id, source_unit_id, unit_id, document_json, meta_json,
             workspace_id, group_id, user_id, created_at, updated_at
      FROM wv_documents
      WHERE id = ?1 AND deleted_at IS NULL
      LIMIT 1
    `).bind(id).first<Row>();

    if (!row) return json({ ok: false, error: 'Document not found' }, 404);

    const documentJson = safeJson(row['document_json'] as string | null);
    const metaJson = safeJson(row['meta_json'] as string | null);
    const metaRecord = asRecord(metaJson) ?? {};

    return json({
      ok: true,
      document: {
        id: String(row['id']),
        title: String(row['title'] ?? ''),
        doc_type: resolveResponseDocType(String(row['doc_type'] ?? 'draft'), metaRecord),
        summary: readTrimmed(row['summary']),
        status: String(row['status'] ?? 'active'),
        is_published: Number(row['is_published'] ?? 0) === 1,
        domain: readTrimmed(row['domain']),
        surah: readInteger(row['surah']),
        source_id: readTrimmed(row['source_id']),
        source_unit_id: readTrimmed(row['source_unit_id']),
        unit_id: readTrimmed(row['unit_id']),
        document_json: isTiptapDoc(documentJson) ? documentJson : { type: 'doc', content: [] },
        meta_json: metaRecord,
        workspace_id: String(row['workspace_id'] ?? ''),
        created_at: String(row['created_at'] ?? ''),
        updated_at: readTrimmed(row['updated_at']),
      },
    });
  } catch (err: unknown) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
};

// PUT /documents/:id — save document JSON + sync blocks
export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const id = String(ctx.params['id']);
    const body = await parseBody(ctx.request);
    if (!body) return json({ ok: false, error: 'Invalid JSON' }, 400);

    // Load existing document for workspace/group/user context
    const existing = await ctx.env.DB.prepare(`
      SELECT id, workspace_id, group_id, user_id, title
      FROM wv_documents
      WHERE id = ?1 AND deleted_at IS NULL
      LIMIT 1
    `).bind(id).first<Row>();

    if (!existing) return json({ ok: false, error: 'Document not found' }, 404);

    const newTitle = readTrimmed(body['title']);
    const rawDoc = body['document_json'] ?? body['documentJson'];

    // Validate document_json
    let documentJson: Record<string, unknown>;
    if (isTiptapDoc(rawDoc)) {
      documentJson = rawDoc as Record<string, unknown>;
    } else {
      return json({ ok: false, error: 'document_json must be a valid Tiptap document' }, 400);
    }

    const now = new Date().toISOString();
    const workspaceId = String(existing['workspace_id'] ?? '');
    const groupId = readTrimmed(existing['group_id']);
    const docUserId = readInteger(existing['user_id']);

    // Derive blocks from the tiptap document
    const derivedBlocks = deriveWorldviewDocumentBlocksFromTiptap(documentJson);

    // Build batch statements
    const statements: ReturnType<D1Database['prepare']>[] = [];

    // 1. Update document
    statements.push(
      ctx.env.DB.prepare(`
        UPDATE wv_documents
        SET document_json = ?1,
            title = CASE WHEN ?2 IS NOT NULL THEN ?2 ELSE title END,
            updated_at = ?3
        WHERE id = ?4
      `).bind(JSON.stringify(documentJson), newTitle, now, id)
    );

    // 2. Delete old blocks
    statements.push(
      ctx.env.DB.prepare(
        'DELETE FROM wv_document_blocks WHERE document_id = ?1'
      ).bind(id)
    );

    // 3. Insert new blocks
    for (let i = 0; i < derivedBlocks.length; i++) {
      const block = derivedBlocks[i];
      const blockId = `${id}:block:${String(i + 1).padStart(4, '0')}`;
      const canonicalInput = `wv_document_block:${slugify(id)}:${String(i + 1).padStart(4, '0')}`;

      statements.push(
        ctx.env.DB.prepare(`
          INSERT INTO wv_document_blocks (
            id, canonical_input, workspace_id, group_id, user_id,
            document_id, parent_block_id, order_index,
            block_type, block_level, text_plain, content_json, attrs_json,
            block_kind, renderer
          )
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
        `).bind(
          blockId,
          canonicalInput,
          workspaceId,
          groupId,
          docUserId,
          id,
          i + 1,
          block.blockType,
          block.blockLevel,
          block.textPlain,
          block.contentJson ? JSON.stringify(block.contentJson) : null,
          block.attrsJson && Object.keys(block.attrsJson).length ? JSON.stringify(block.attrsJson) : null,
          block.blockKind,
          block.renderer,
        )
      );
    }

    await ctx.env.DB.batch(statements);

    return json({ ok: true, document_id: id, blocks_synced: derivedBlocks.length });
  } catch (err: unknown) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
};

// PATCH /documents/:id — update metadata only (title, status, summary)
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  try {
    const id = String(ctx.params['id']);
    const body = await parseBody(ctx.request);
    if (!body) return json({ ok: false, error: 'Invalid JSON' }, 400);

    const title = readTrimmed(body['title']);
    const status = readTrimmed(body['status']);
    const summary = readTrimmed(body['summary']);

    const fields: string[] = [`updated_at = ?1`];
    const binds: (string | null)[] = [new Date().toISOString()];
    let idx = 2;

    if (title) { fields.push(`title = ?${idx++}`); binds.push(title); }
    if (status) { fields.push(`status = ?${idx++}`); binds.push(status); }
    if (summary !== undefined) { fields.push(`summary = ?${idx++}`); binds.push(summary); }

    if (fields.length === 1) return json({ ok: false, error: 'Nothing to update' }, 400);

    binds.push(id);
    await ctx.env.DB.prepare(
      `UPDATE wv_documents SET ${fields.join(', ')} WHERE id = ?${idx}`
    ).bind(...binds).run();

    return json({ ok: true });
  } catch (err: unknown) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
};

// DELETE /documents/:id — soft delete
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    const id = String(ctx.params['id']);
    await ctx.env.DB.prepare(
      `UPDATE wv_documents SET deleted_at = ?1 WHERE id = ?2`
    ).bind(new Date().toISOString(), id).run();

    return json({ ok: true });
  } catch (err: unknown) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
  });

function slugify(value: string): string {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'doc';
}

function resolveResponseDocType(storedDocType: string, meta: Record<string, unknown> | null): string {
  return readTrimmed(meta?.['requested_doc_type']) ?? storedDocType;
}

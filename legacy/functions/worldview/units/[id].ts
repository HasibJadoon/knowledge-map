import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import {
  deriveWorldviewDocumentBlocksFromTiptap,
  mapStoredDocumentBlocksToReaderBlocks,
} from '../_document-blocks';
import {
  estimateReadingMinutesFromTiptap,
  extractPlainTextFromTiptap,
} from '../_document-tiptap';

interface Env { DB: D1Database; }

const h = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

type Row = Record<string, unknown>;

function safeJson(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .map((entry) => readOptionalString(entry))
    .filter((entry): entry is string => entry != null);
}

// GET /worldview/units/:id
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) return new Response(JSON.stringify({ ok: false, error: 'Missing id' }), { status: 400, headers: h });

    const [unitRow, childrenRes] = await Promise.all([
      ctx.env.DB.prepare(
        `SELECT u.id, u.source_id, u.parent_unit_id, u.unit_type, u.title,
                u.order_index, u.start_ref, u.end_ref, u.anchor_text, u.summary,
                u.unit_json, u.meta_json,
                s.title AS source_title, s.source_type, s.creator
         FROM wv_source_units u
         LEFT JOIN wv_sources s ON s.id = u.source_id
         WHERE u.id = ?1`
      ).bind(id).first<Row>(),
      ctx.env.DB.prepare(
        `SELECT id, source_id, parent_unit_id, unit_type, title, order_index, start_ref, end_ref, anchor_text, summary
         FROM wv_source_units
         WHERE parent_unit_id = ?1
         ORDER BY order_index ASC`
      ).bind(id).all<Row>(),
    ]);

    if (!unitRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Unit not found' }), { status: 404, headers: h });
    }

    const unitJson = safeJson((unitRow.unit_json as string | null) ?? null) as Record<string, unknown> | null;
    const metaJson = safeJson((unitRow.meta_json as string | null) ?? null) as Record<string, unknown> | null;
    const locatorLabel =
      readOptionalString(unitJson?.['locatorLabel']) ||
      readOptionalString(unitJson?.['locator_label']) ||
      readOptionalString(metaJson?.['locatorLabel']) ||
      readOptionalString(metaJson?.['locator_label']);

    const sourceId = readOptionalString(unitRow.source_id);
    const document = sourceId ? await readChapterDocument(ctx.env.DB, sourceId, id) : null;
    const storedBlocks = document ? await readDocumentBlocks(ctx.env.DB, document.id) : [];
    const derivedBlocks = document?.document_json
      ? deriveWorldviewDocumentBlocksFromTiptap(document.document_json)
      : [];
    const readerBlocks = storedBlocks.length
      ? mapStoredDocumentBlocksToReaderBlocks(storedBlocks)
      : mapStoredDocumentBlocksToReaderBlocks(derivedBlocks.map(toStoredBlockShape));
    const documentText = document?.document_json ? extractPlainTextFromTiptap(document.document_json) : '';
    const readingBody = readerBlocks
      .map((block) => readOptionalString(block.text))
      .filter((entry): entry is string => entry != null);
    const readingMinutes = document?.document_json
      ? estimateReadingMinutesFromTiptap(document.document_json)
      : estimateReadingMinutesFromText([unitRow.summary, unitRow.anchor_text].filter(Boolean).join(' '));

    const result = {
      ...unitRow,
      locatorLabel,
      readingMinutes,
      readingSchema: document?.document_json ? 'tiptap' : null,
      readingBody: readingBody.length ? readingBody : readStringArray(unitJson?.['readingBody']) ?? null,
      readingBlocks: readerBlocks,
      documentId: document?.id ?? null,
      documentTitle: document?.title ?? null,
      documentSummary: document?.summary ?? null,
      documentJson: document?.document_json ?? null,
      documentBlocks: storedBlocks.length ? storedBlocks : derivedBlocks.map(toStoredBlockShape),
      documentText: documentText || null,
      unit_json: undefined,
      meta: metaJson,
      meta_json: undefined,
      children: (childrenRes.results ?? []).map((child) => ({
        ...child,
        body_preview: child.summary ?? child.anchor_text ?? null,
      })),
    };

    return new Response(JSON.stringify({ ok: true, result }), { headers: h });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: h });
  }
};

async function readChapterDocument(db: D1Database, sourceId: string, unitId: string): Promise<{
  id: string;
  title: string | null;
  summary: string | null;
  document_json: Record<string, unknown> | null;
} | null> {
  const row = await db
    .prepare(
      `
      SELECT id, title, summary, document_json
      FROM wv_documents
      WHERE doc_type = 'study_note'
        AND domain = 'worldview'
        AND source_id = ?1
        AND (source_unit_id = ?2 OR unit_id = ?2)
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 1
      `
    )
    .bind(sourceId, unitId)
    .first<Row>();

  const id = readOptionalString(row?.['id']);
  if (!id) {
    return null;
  }

  return {
    id,
    title: readOptionalString(row?.['title']),
    summary: readOptionalString(row?.['summary']),
    document_json: safeJson((row?.['document_json'] as string | null) ?? null) as Record<string, unknown> | null,
  };
}

async function readDocumentBlocks(db: D1Database, documentId: string): Promise<Row[]> {
  const result = await db
    .prepare(
      `
      SELECT
        id,
        document_id,
        parent_block_id,
        order_index,
        block_type,
        block_level,
        text_plain,
        content_json,
        attrs_json,
        block_kind,
        renderer,
        created_at,
        updated_at
      FROM wv_document_blocks
      WHERE document_id = ?1
      ORDER BY order_index ASC, created_at ASC
      `
    )
    .bind(documentId)
    .all<Row>();

  return (result.results ?? []).map((row) => ({
    ...row,
    content_json: safeJson((row.content_json as string | null) ?? null),
    attrs_json: safeJson((row.attrs_json as string | null) ?? null) ?? {},
  }));
}

function toStoredBlockShape(block: {
  orderIndex: number;
  blockType: string;
  blockLevel: number | null;
  textPlain: string | null;
  contentJson: Record<string, unknown> | null;
  attrsJson: Record<string, unknown>;
  blockKind: string | null;
  renderer: string | null;
}): Row {
  return {
    id: `derived-${block.orderIndex}`,
    document_id: null,
    parent_block_id: null,
    order_index: block.orderIndex,
    block_type: block.blockType,
    block_level: block.blockLevel,
    text_plain: block.textPlain,
    content_json: block.contentJson,
    attrs_json: block.attrsJson,
    block_kind: block.blockKind,
    renderer: block.renderer,
    created_at: null,
    updated_at: null,
  };
}

function estimateReadingMinutesFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) {
    return 0;
  }

  return Math.max(1, Math.round(words / 180));
}

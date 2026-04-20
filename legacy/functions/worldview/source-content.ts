import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import { json } from '../_utils/sprint';

interface Env {
  DB: D1Database;
}

type Row = Record<string, unknown>;

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const url = new URL(ctx.request.url);
    const sourceId = (url.searchParams.get('source_id') ?? url.searchParams.get('sourceId') ?? '').trim();
    const sourceUnitId = (url.searchParams.get('source_unit_id') ?? url.searchParams.get('sourceUnitId') ?? '').trim() || null;

    if (!sourceId) {
      return json({ ok: false, error: 'source_id is required.' }, 400);
    }

    const source = await readSource(ctx.env.DB, sourceId, user.id);
    if (!source) {
      return json({ ok: false, error: 'Worldview source not found.' }, 404);
    }

    const [units, documents, podcasts, nodes] = await Promise.all([
      listUnits(ctx.env.DB, sourceId),
      listDocuments(ctx.env.DB, sourceId, sourceUnitId, user.id),
      listPodcasts(ctx.env.DB, sourceId, sourceUnitId, user.id),
      listNodes(ctx.env.DB, sourceId, sourceUnitId, user.id),
    ]);
    const documentBlocks = documents.length
      ? await listDocumentBlocks(ctx.env.DB, sourceId, sourceUnitId, user.id)
      : new Map<string, Row[]>();

    return json({
      ok: true,
      source,
      units,
      documents: documents.map((document) => ({
        ...document,
        blocks: documentBlocks.get(readText(document['id'])) ?? [],
      })),
      podcasts,
      nodes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load worldview source content.';
    return json({ ok: false, error: message }, 500);
  }
};

async function readSource(db: D1Database, sourceId: string, userId: number): Promise<Row | null> {
  const row = await db
    .prepare(
      `
      SELECT
        id,
        canonical_input,
        source_type,
        title,
        subtitle,
        description,
        creator,
        publisher,
        publication_year,
        language,
        source_url,
        source_ref,
        status,
        source_json,
        meta_json,
        created_at,
        updated_at
      FROM wv_sources
      WHERE id = ?1
        AND (user_id = ?2 OR user_id IS NULL)
      LIMIT 1
      `,
    )
    .bind(sourceId, userId)
    .first<Row>();

  return row ? normalizeSource(row) : null;
}

async function listUnits(db: D1Database, sourceId: string): Promise<Row[]> {
  const result = await db
    .prepare(
      `
      SELECT
        id,
        canonical_input,
        source_id,
        parent_unit_id,
        unit_type,
        title,
        order_index,
        start_ref,
        end_ref,
        anchor_text,
        summary,
        unit_json,
        meta_json,
        created_at,
        updated_at
      FROM wv_source_units
      WHERE source_id = ?1
      ORDER BY order_index ASC, created_at ASC
      `,
    )
    .bind(sourceId)
    .all<Row>();

  return (result.results ?? []).map(normalizeUnit);
}

async function listDocuments(
  db: D1Database,
  sourceId: string,
  sourceUnitId: string | null,
  userId: number,
): Promise<Row[]> {
  const result = await db
    .prepare(
      `
      SELECT
        id,
        title,
        summary,
        doc_type,
        domain,
        source_id,
        source_unit_id,
        unit_id,
        related_node_id,
        document_json,
        meta_json,
        created_at,
        updated_at
      FROM wv_documents
      WHERE (user_id = ?1 OR user_id IS NULL)
        AND doc_type = 'study_note'
        AND domain = 'worldview'
        AND source_id = ?2
        AND (?3 IS NULL OR source_unit_id = ?3 OR unit_id = ?3)
      ORDER BY COALESCE(updated_at, created_at) DESC, title ASC
      `,
    )
    .bind(userId, sourceId, sourceUnitId)
    .all<Row>();

  return (result.results ?? []).map((row) => ({
    id: readText(row['id']),
    title: readText(row['title']),
    summary: readNullableText(row['summary']),
    doc_type: readText(row['doc_type']),
    domain: readNullableText(row['domain']),
    source_id: readNullableText(row['source_id']),
    source_unit_id: readNullableText(row['source_unit_id']),
    unit_id: readNullableText(row['unit_id']),
    related_node_id: readNullableText(row['related_node_id']),
    document_json: parseJsonObject(row['document_json']),
    meta_json: parseJsonObject(row['meta_json']),
    created_at: readText(row['created_at']),
    updated_at: readNullableText(row['updated_at']),
  }));
}

async function listDocumentBlocks(
  db: D1Database,
  sourceId: string,
  sourceUnitId: string | null,
  userId: number,
): Promise<Map<string, Row[]>> {
  const result = await db
    .prepare(
      `
      SELECT
        b.id,
        b.document_id,
        b.parent_block_id,
        b.order_index,
        b.block_type,
        b.block_level,
        b.text_plain,
        b.content_json,
        b.attrs_json,
        b.block_kind,
        b.renderer,
        b.created_at,
        b.updated_at
      FROM wv_document_blocks b
      INNER JOIN wv_documents d ON d.id = b.document_id
      WHERE (d.user_id = ?1 OR d.user_id IS NULL)
        AND d.doc_type = 'study_note'
        AND d.domain = 'worldview'
        AND d.source_id = ?2
        AND (?3 IS NULL OR d.source_unit_id = ?3 OR d.unit_id = ?3)
      ORDER BY b.document_id ASC, b.order_index ASC, b.created_at ASC
      `,
    )
    .bind(userId, sourceId, sourceUnitId)
    .all<Row>();

  const grouped = new Map<string, Row[]>();
  for (const row of result.results ?? []) {
    const documentId = readText(row['document_id']);
    if (!documentId) {
      continue;
    }

    const block: Row = {
      id: readText(row['id']),
      document_id: documentId,
      parent_block_id: readNullableText(row['parent_block_id']),
      order_index: readNullableNumber(row['order_index']) ?? 0,
      block_type: readText(row['block_type']),
      block_level: readNullableNumber(row['block_level']) ?? 1,
      text_plain: readText(row['text_plain']),
      content_json: parseJsonObject(row['content_json']),
      attrs_json: parseJsonObject(row['attrs_json']),
      block_kind: readNullableText(row['block_kind']),
      renderer: readNullableText(row['renderer']),
      created_at: readText(row['created_at']),
      updated_at: readNullableText(row['updated_at']),
    };

    const current = grouped.get(documentId) ?? [];
    current.push(block);
    grouped.set(documentId, current);
  }

  return grouped;
}

async function listPodcasts(
  db: D1Database,
  sourceId: string,
  sourceUnitId: string | null,
  userId: number,
): Promise<Row[]> {
  const result = await db
    .prepare(
      `
      SELECT
        id,
        title,
        status,
        related_id,
        refs_json,
        content_json,
        created_at,
        updated_at
      FROM wv_content_items
      WHERE user_id = ?1
        AND content_type = 'podcast_episode'
        AND json_extract(content_json, '$.source_id') = ?2
        AND (
          ?3 IS NULL
          OR json_extract(content_json, '$.source_unit_id') = ?3
          OR related_id = ?3
        )
      ORDER BY COALESCE(updated_at, created_at) DESC, title ASC
      `,
    )
    .bind(userId, sourceId, sourceUnitId)
    .all<Row>();

  return (result.results ?? []).map((row) => ({
    id: readText(row['id']),
    title: readText(row['title']),
    status: readText(row['status']),
    related_id: readNullableText(row['related_id']),
    refs_json: parseJsonObject(row['refs_json']),
    content_json: parseJsonObject(row['content_json']),
    created_at: readText(row['created_at']),
    updated_at: readNullableText(row['updated_at']),
  }));
}

async function listNodes(
  db: D1Database,
  sourceId: string,
  sourceUnitId: string | null,
  userId: number,
): Promise<Row[]> {
  const result = await db
    .prepare(
      `
      SELECT
        id,
        node_type,
        title,
        text_plain,
        summary,
        slug,
        meta_json
      FROM wv_nodes
      WHERE user_id = ?1
        AND node_type IN ('concept', 'claim')
        AND json_extract(meta_json, '$.source_id') = ?2
        AND (?3 IS NULL OR json_extract(meta_json, '$.source_unit_id') = ?3)
      ORDER BY
        CASE node_type
          WHEN 'concept' THEN 0
          WHEN 'claim' THEN 1
          ELSE 2
        END ASC,
        COALESCE(json_extract(meta_json, '$.order_index'), 9999) ASC,
        title ASC
      `,
    )
    .bind(userId, sourceId, sourceUnitId)
    .all<Row>();

  return (result.results ?? []).map((row) => ({
    id: readText(row['id']),
    node_type: readText(row['node_type']),
    title: readText(row['title']),
    text_plain: readText(row['text_plain']),
    summary: readText(row['summary']),
    slug: readText(row['slug']),
    meta_json: parseJsonObject(row['meta_json']),
  }));
}

function normalizeSource(row: Row): Row {
  return {
    id: readText(row['id']),
    canonical_input: readText(row['canonical_input']),
    source_type: readText(row['source_type']),
    title: readText(row['title']),
    subtitle: readNullableText(row['subtitle']),
    description: readNullableText(row['description']),
    creator: readNullableText(row['creator']),
    publisher: readNullableText(row['publisher']),
    publication_year: readNullableNumber(row['publication_year']),
    language: readNullableText(row['language']),
    source_url: readNullableText(row['source_url']),
    source_ref: readNullableText(row['source_ref']),
    status: readText(row['status']),
    source_json: parseJsonObject(row['source_json']),
    meta_json: parseJsonObject(row['meta_json']),
    created_at: readText(row['created_at']),
    updated_at: readNullableText(row['updated_at']),
  };
}

function normalizeUnit(row: Row): Row {
  const unitJson = parseJsonObject(row['unit_json']);
  const locatorLabel = readNullableText(unitJson['locatorLabel']) ?? readNullableText(unitJson['locator_label']);
  return {
    id: readText(row['id']),
    canonical_input: readText(row['canonical_input']),
    source_id: readText(row['source_id']),
    parent_unit_id: readNullableText(row['parent_unit_id']),
    unit_type: readText(row['unit_type']),
    title: readText(row['title']),
    order_index: readNullableNumber(row['order_index']) ?? 0,
    start_ref: readNullableText(row['start_ref']),
    end_ref: readNullableText(row['end_ref']),
    anchor_text: readNullableText(row['anchor_text']),
    summary: readNullableText(row['summary']),
    locatorLabel,
    unit_json: unitJson,
    meta_json: parseJsonObject(row['meta_json']),
    created_at: readText(row['created_at']),
    updated_at: readNullableText(row['updated_at']),
  };
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNullableText(value: unknown): string | null {
  const text = readText(value);
  return text || null;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

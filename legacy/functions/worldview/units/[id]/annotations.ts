import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import {
  enrichWorldviewEvidenceLinkRows,
  enrichWorldviewNodeEdgeRows,
  enrichWorldviewNodeRows,
} from '../../graph-display-labels';

interface Env {
  DB: D1Database;
}

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const HIGHLIGHT_KINDS = new Set(['highlight', 'quote']);

async function hasTable(db: D1Database, tableName: string): Promise<boolean> {
  const row = await db
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = ?1
      LIMIT 1
      `
    )
    .bind(tableName)
    .first<{ name?: string }>();

  return !!row?.name;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing id' }), { status: 400, headers });
    }

    const unit = await ctx.env.DB
      .prepare(
        `
        SELECT id, source_id, workspace_id
        FROM wv_source_units
        WHERE id = ?1
        LIMIT 1
        `
      )
      .bind(id)
      .first<{ id?: string; source_id?: string; workspace_id?: string }>();

    if (!unit?.id || !unit.source_id || !unit.workspace_id) {
      return new Response(JSON.stringify({ ok: false, error: 'Unit not found' }), { status: 404, headers });
    }

    const [
      notesTableAvailable,
      highlightsTableAvailable,
      nodesTableAvailable,
      evidenceLinksTableAvailable,
      nodeEdgesTableAvailable,
    ] = await Promise.all([
      hasTable(ctx.env.DB, 'wv_notes'),
      hasTable(ctx.env.DB, 'wv_highlights'),
      hasTable(ctx.env.DB, 'wv_nodes'),
      hasTable(ctx.env.DB, 'wv_evidence_links'),
      hasTable(ctx.env.DB, 'wv_node_edges'),
    ]);

    const [notesResult, highlightsResult, worldviewResult, evidenceLinksResult, nodeEdgesResult, scopedUnitsResult] =
      await Promise.all([
        notesTableAvailable
          ? ctx.env.DB
              .prepare(
                `
                WITH RECURSIVE unit_scope(id) AS (
                  SELECT id
                  FROM wv_source_units
                  WHERE id = ?1
                  UNION ALL
                  SELECT child.id
                  FROM wv_source_units child
                  INNER JOIN unit_scope scope ON scope.id = child.parent_unit_id
                )
                SELECT
                  n.id,
                  n.source_id,
                  n.source_unit_id,
                  n.note_kind,
                  n.title,
                  n.body_md,
                  n.excerpt_text,
                  n.locator,
                  n.status,
                  n.created_at
                FROM wv_notes n
                WHERE n.status != 'archived'
                  AND n.source_unit_id IN (SELECT id FROM unit_scope)
                ORDER BY n.created_at ASC
                `
              )
              .bind(id)
              .all()
          : Promise.resolve({ results: [] }),
        highlightsTableAvailable
          ? ctx.env.DB
              .prepare(
                `
                WITH RECURSIVE unit_scope(id) AS (
                  SELECT id
                  FROM wv_source_units
                  WHERE id = ?1
                  UNION ALL
                  SELECT child.id
                  FROM wv_source_units child
                  INNER JOIN unit_scope scope ON scope.id = child.parent_unit_id
                )
                SELECT
                  h.id,
                  h.source_id,
                  h.source_unit_id,
                  h.locator,
                  h.anchor_text,
                  h.selected_text,
                  h.start_offset,
                  h.end_offset,
                  h.color,
                  h.meta_json,
                  h.created_at
                FROM wv_highlights h
                WHERE h.source_unit_id IN (SELECT id FROM unit_scope)
                ORDER BY h.created_at ASC
                `
              )
              .bind(id)
              .all()
          : Promise.resolve({ results: [] }),
        nodesTableAvailable
          ? ctx.env.DB
              .prepare(
                `
                WITH RECURSIVE unit_scope(id) AS (
                  SELECT id
                  FROM wv_source_units
                  WHERE id = ?1
                  UNION ALL
                  SELECT child.id
                  FROM wv_source_units child
                  INNER JOIN unit_scope scope ON scope.id = child.parent_unit_id
                )
                SELECT
                  n.id,
                  n.node_type,
                  n.title,
                  n.text_plain,
                  n.summary,
                  n.slug,
                  n.status,
                  COALESCE(
                    json_extract(n.data_json, '$.display_label_short'),
                    json_extract(n.meta_json, '$.display_label_short')
                  ) AS display_label_short,
                  COALESCE(
                    json_extract(n.data_json, '$.display_label_medium'),
                    json_extract(n.meta_json, '$.display_label_medium')
                  ) AS display_label_medium,
                  n.data_json,
                  n.meta_json,
                  n.created_at
                FROM wv_nodes n
                WHERE n.workspace_id = ?2
                  AND COALESCE(json_extract(n.data_json, '$.source_id'), json_extract(n.meta_json, '$.source_id')) = ?3
                  AND COALESCE(json_extract(n.data_json, '$.source_unit_id'), json_extract(n.meta_json, '$.source_unit_id')) IN (SELECT id FROM unit_scope)
                ORDER BY
                  COALESCE(json_extract(n.data_json, '$.chapter_role'), json_extract(n.meta_json, '$.chapter_role')) ASC,
                  n.title ASC,
                  n.created_at ASC
                `
              )
              .bind(id, unit.workspace_id, unit.source_id)
              .all()
          : Promise.resolve({ results: [] }),
        evidenceLinksTableAvailable
          ? ctx.env.DB
              .prepare(
                `
                WITH RECURSIVE unit_scope(id) AS (
                  SELECT id
                  FROM wv_source_units
                  WHERE id = ?1
                  UNION ALL
                  SELECT child.id
                  FROM wv_source_units child
                  INNER JOIN unit_scope scope ON scope.id = child.parent_unit_id
                ),
                scoped_nodes AS (
                  SELECT n.id
                  FROM wv_nodes n
                  WHERE n.workspace_id = ?2
                    AND COALESCE(json_extract(n.data_json, '$.source_id'), json_extract(n.meta_json, '$.source_id')) = ?3
                    AND COALESCE(json_extract(n.data_json, '$.source_unit_id'), json_extract(n.meta_json, '$.source_unit_id')) IN (SELECT id FROM unit_scope)
                )
                SELECT
                  id,
                  source_type,
                  source_id,
                  target_node_id,
                  relation,
                  evidence_text,
                  locator,
                  note,
                  json_extract(meta_json, '$.display_label_short') AS display_label_short,
                  json_extract(meta_json, '$.display_label_medium') AS display_label_medium,
                  meta_json,
                  created_at
                FROM wv_evidence_links
                WHERE workspace_id = ?2
                  AND target_node_id IN (SELECT id FROM scoped_nodes)
                ORDER BY created_at ASC
                `
              )
              .bind(id, unit.workspace_id, unit.source_id)
              .all()
          : Promise.resolve({ results: [] }),
        nodeEdgesTableAvailable
          ? ctx.env.DB
              .prepare(
                `
                WITH RECURSIVE unit_scope(id) AS (
                  SELECT id
                  FROM wv_source_units
                  WHERE id = ?1
                  UNION ALL
                  SELECT child.id
                  FROM wv_source_units child
                  INNER JOIN unit_scope scope ON scope.id = child.parent_unit_id
                ),
                scoped_nodes AS (
                  SELECT n.id
                  FROM wv_nodes n
                  WHERE n.workspace_id = ?2
                    AND COALESCE(json_extract(n.data_json, '$.source_id'), json_extract(n.meta_json, '$.source_id')) = ?3
                    AND COALESCE(json_extract(n.data_json, '$.source_unit_id'), json_extract(n.meta_json, '$.source_unit_id')) IN (SELECT id FROM unit_scope)
                )
                SELECT
                  id,
                  from_node_id,
                  to_node_id,
                  relation_type,
                  strength,
                  order_index,
                  note,
                  json_extract(meta_json, '$.display_label_short') AS display_label_short,
                  json_extract(meta_json, '$.display_label_medium') AS display_label_medium,
                  meta_json,
                  created_at
                FROM wv_node_edges
                WHERE workspace_id = ?2
                  AND from_node_id IN (SELECT id FROM scoped_nodes)
                  AND to_node_id IN (SELECT id FROM scoped_nodes)
                ORDER BY order_index ASC, created_at ASC
                `
              )
              .bind(id, unit.workspace_id, unit.source_id)
              .all()
          : Promise.resolve({ results: [] }),
        ctx.env.DB
          .prepare(
            `
            WITH RECURSIVE unit_scope(id) AS (
              SELECT id
              FROM wv_source_units
              WHERE id = ?1
              UNION ALL
              SELECT child.id
              FROM wv_source_units child
              INNER JOIN unit_scope scope ON scope.id = child.parent_unit_id
            )
            SELECT id
            FROM unit_scope
            `
          )
          .bind(id)
          .all(),
      ]);

    const noteRows = (notesResult.results ?? []) as Array<Record<string, unknown>>;
    const highlightRows = (highlightsResult.results ?? []) as Array<Record<string, unknown>>;
    const worldviewRows = enrichWorldviewNodeRows(
      (worldviewResult.results ?? []) as Array<Record<string, unknown>>,
    );
    const wvEvidenceLinks = enrichWorldviewEvidenceLinkRows(
      (evidenceLinksResult.results ?? []) as Array<Record<string, unknown>>,
    );
    const wvNodeEdges = enrichWorldviewNodeEdgeRows(
      (nodeEdgesResult.results ?? []) as Array<Record<string, unknown>>,
    );

    const highlights = [
      ...highlightRows.map((highlight) => ({
        id: String(highlight['id'] ?? ''),
        source_id: readString(highlight['source_id']),
        source_unit_id: readString(highlight['source_unit_id']),
        note_kind: 'highlight',
        title: null,
        body_md: readString(highlight['selected_text']),
        excerpt_text: readString(highlight['anchor_text']),
        locator: readString(highlight['locator']),
        color: readString(highlight['color']),
        source: 'highlight',
        created_at: readString(highlight['created_at']),
      })),
      ...noteRows
        .filter((note) => HIGHLIGHT_KINDS.has(String(note['note_kind'] ?? '')))
        .map((note) => ({
          id: String(note['id'] ?? ''),
          source_id: readString(note['source_id']),
          source_unit_id: readString(note['source_unit_id']),
          note_kind: String(note['note_kind'] ?? 'highlight'),
          title: readString(note['title']),
          body_md: readString(note['body_md']),
          excerpt_text: readString(note['excerpt_text']),
          locator: readString(note['locator']),
          color: null,
          source: 'note',
          created_at: readString(note['created_at']),
        })),
    ]
      .filter((highlight) => highlight.id && highlight.body_md)
      .sort((left, right) => compareCreatedAt(left.created_at, right.created_at));

    const notes = noteRows.filter((note) => !HIGHLIGHT_KINDS.has(String(note['note_kind'] ?? '')));
    const scopedUnitIds = (scopedUnitsResult.results ?? [])
      .map((row) => String((row as Record<string, unknown>)['id'] ?? ''))
      .filter(Boolean);

    return new Response(
      JSON.stringify({
        ok: true,
        unitId: id,
        scopedUnitIds,
        notes,
        highlights,
        wv: worldviewRows,
        wv_evidence_links: wvEvidenceLinks,
        wv_node_edges: wvNodeEdges,
      }),
      { headers }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ ok: false, error: error?.message ?? String(error) }),
      { status: 500, headers }
    );
  }
};

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function compareCreatedAt(left?: string | null, right?: string | null): number {
  const leftTs = left ? Date.parse(left) : 0;
  const rightTs = right ? Date.parse(right) : 0;
  return leftTs - rightTs;
}

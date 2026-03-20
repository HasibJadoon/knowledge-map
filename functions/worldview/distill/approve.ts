import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import { json, parseBody, readTrimmed } from '../../_utils/sprint';
import {
  applyDecisionsToDraft,
  hasTable,
  loadDistillBatchSnapshot,
  mapDecisionRow,
  mapSuggestionRow,
  upsertPodcastEpisode,
} from '../_distill';

interface Env {
  DB: D1Database;
}

type ApproveInput = {
  batchId: string;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }
    if (user.role !== 'admin') {
      return json({ ok: false, error: 'Admin role required.' }, 403);
    }

    const db = ctx.env.DB;
    if (!(await ensureTables(db))) {
      return json({ ok: false, error: 'Worldview approval tables are not available.' }, 500);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const input = normalizeInput(body);
    if (!input) {
      return json({ ok: false, error: 'A batch id is required.' }, 400);
    }

    const snapshot = await loadDistillBatchSnapshot(db, input.batchId, user.id);
    if (!snapshot) {
      return json({ ok: false, error: 'Worldview distill batch not found.' }, 404);
    }

    if (!snapshot.draft_output) {
      return json({ ok: false, error: 'This distill batch does not have generated draft output yet.' }, 400);
    }

    const committed = applyDecisionsToDraft(snapshot.draft_output, snapshot.decisions, input.batchId);

    await deleteCommittedRows(db, input.batchId);
    await insertCommittedRows(db, committed);

    await upsertPodcastEpisode(db, committed.podcast_episode, {
      batchId: input.batchId,
      sourceId: snapshot.batch.source_id,
      sourceUnitId: snapshot.batch.source_unit_id,
      userId: user.id,
    });

    await db
      .prepare(
        `
        UPDATE wv_insight_suggestions
        SET status = CASE WHEN status = 'rejected' THEN 'rejected' ELSE 'saved' END,
            updated_at = datetime('now')
        WHERE batch_id = ?1
          AND workspace_id = ?2
        `
      )
      .bind(input.batchId, snapshot.batch.workspace_id)
      .run();

    await db
      .prepare(
        `
        UPDATE wv_distill_batches
        SET status = 'approved',
            updated_at = datetime('now'),
            meta_json = json_set(COALESCE(meta_json, json('{}')), '$.approved_at', datetime('now'))
        WHERE id = ?1
        `
      )
      .bind(input.batchId)
      .run();

    const updatedSnapshot = await loadDistillBatchSnapshot(db, input.batchId, user.id);
    return json({
      ok: true,
      batch: updatedSnapshot?.batch ?? snapshot.batch,
      items: updatedSnapshot?.items ?? snapshot.items,
      suggestions: (updatedSnapshot?.suggestions ?? snapshot.suggestions).map(mapSuggestionRow),
      decisions: (updatedSnapshot?.decisions ?? snapshot.decisions).map(mapDecisionRow),
      draft_output: updatedSnapshot?.draft_output ?? snapshot.draft_output,
      committed_counts: {
        wv_nodes: committed.wv_nodes.length,
        wv_node_edges: committed.wv_node_edges.length,
        wv_documents: committed.wv_documents.length,
        wv_document_blocks: committed.wv_document_blocks.length,
        wv_block_node_links: committed.wv_block_node_links.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve worldview distill batch.';
    return json({ ok: false, error: message }, 500);
  }
};

async function ensureTables(db: D1Database): Promise<boolean> {
  const required = [
    'wv_distill_batches',
    'wv_insight_suggestions',
    'wv_insight_decisions',
    'wv_nodes',
    'wv_node_edges',
    'wv_documents',
    'wv_document_blocks',
    'wv_block_node_links',
    'wv_content_items',
  ];

  for (const table of required) {
    if (!(await hasTable(db, table))) {
      return false;
    }
  }

  return true;
}

function normalizeInput(body: Record<string, unknown>): ApproveInput | null {
  const batchId = readTrimmed(body['batchId'] ?? body['batch_id']);
  return batchId ? { batchId } : null;
}

async function deleteCommittedRows(db: D1Database, batchId: string): Promise<void> {
  await db
    .prepare(
      `
      DELETE FROM wv_block_node_links
      WHERE block_id IN (
        SELECT b.id
        FROM wv_document_blocks b
        INNER JOIN wv_documents d ON d.id = b.document_id
        WHERE json_extract(d.meta_json, '$.batch_id') = ?1
      )
      `
    )
    .bind(batchId)
    .run();

  await db
    .prepare(
      `
      DELETE FROM wv_document_blocks
      WHERE document_id IN (
        SELECT id
        FROM wv_documents
        WHERE json_extract(meta_json, '$.batch_id') = ?1
      )
      `
    )
    .bind(batchId)
    .run();

  await db
    .prepare(
      `
      DELETE FROM wv_documents
      WHERE json_extract(meta_json, '$.batch_id') = ?1
      `
    )
    .bind(batchId)
    .run();

  await db
    .prepare(
      `
      DELETE FROM wv_node_edges
      WHERE json_extract(meta_json, '$.batch_id') = ?1
      `
    )
    .bind(batchId)
    .run();

  await db
    .prepare(
      `
      DELETE FROM wv_nodes
      WHERE json_extract(meta_json, '$.batch_id') = ?1
      `
    )
    .bind(batchId)
    .run();
}

async function insertCommittedRows(
  db: D1Database,
  draft: ReturnType<typeof applyDecisionsToDraft>,
): Promise<void> {
  for (const node of draft.wv_nodes) {
    await db
      .prepare(
        `
        INSERT OR REPLACE INTO wv_nodes (
          id,
          canonical_input,
          workspace_id,
          group_id,
          user_id,
          node_type,
          title,
          text_plain,
          summary,
          slug,
          status,
          data_json,
          meta_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        `
      )
      .bind(
        node.id,
        node.canonical_input,
        node.workspace_id,
        node.group_id,
        node.user_id,
        node.node_type,
        node.title,
        node.text_plain,
        node.summary,
        node.slug,
        node.status,
        JSON.stringify(node.data_json),
        JSON.stringify(node.meta_json),
      )
      .run();
  }

  for (const edge of draft.wv_node_edges) {
    await db
      .prepare(
        `
        INSERT OR REPLACE INTO wv_node_edges (
          id,
          canonical_input,
          workspace_id,
          group_id,
          from_node_id,
          to_node_id,
          relation_type,
          strength,
          order_index,
          note,
          meta_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        `
      )
      .bind(
        edge.id,
        edge.canonical_input,
        edge.workspace_id,
        edge.group_id,
        edge.from_node_id,
        edge.to_node_id,
        edge.relation_type,
        edge.strength,
        edge.order_index,
        edge.note,
        JSON.stringify(edge.meta_json),
      )
      .run();
  }

  for (const document of draft.wv_documents) {
    await db
      .prepare(
        `
        INSERT OR REPLACE INTO wv_documents (
          id,
          canonical_input,
          workspace_id,
          group_id,
          user_id,
          doc_type,
          title,
          summary,
          cover_image_url,
          status,
          related_node_id,
          document_json,
          meta_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        `
      )
      .bind(
        document.id,
        document.canonical_input,
        document.workspace_id,
        document.group_id,
        document.user_id,
        document.doc_type,
        document.title,
        document.summary,
        document.cover_image_url,
        document.status,
        document.related_node_id,
        JSON.stringify(document.document_json),
        JSON.stringify(document.meta_json),
      )
      .run();
  }

  for (const block of draft.wv_document_blocks) {
    await db
      .prepare(
        `
        INSERT OR REPLACE INTO wv_document_blocks (
          id,
          canonical_input,
          workspace_id,
          group_id,
          user_id,
          document_id,
          parent_block_id,
          order_index,
          block_type,
          block_level,
          text_plain,
          content_json,
          attrs_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        `
      )
      .bind(
        block.id,
        block.canonical_input,
        block.workspace_id,
        block.group_id,
        block.user_id,
        block.document_id,
        block.parent_block_id,
        block.order_index,
        block.block_type,
        block.block_level,
        block.text_plain,
        block.content_json ? JSON.stringify(block.content_json) : null,
        JSON.stringify(block.attrs_json),
      )
      .run();
  }

  for (const link of draft.wv_block_node_links) {
    await db
      .prepare(
        `
        INSERT OR REPLACE INTO wv_block_node_links (
          id,
          canonical_input,
          workspace_id,
          group_id,
          user_id,
          block_id,
          node_id,
          relation
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        `
      )
      .bind(
        link.id,
        link.canonical_input,
        link.workspace_id,
        link.group_id,
        link.user_id,
        link.block_id,
        link.node_id,
        link.relation,
      )
      .run();
  }
}

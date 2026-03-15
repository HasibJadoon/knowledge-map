import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

import { requireAuth } from '../../_utils/auth';
import { runOpenAITextPrompt } from '../../_utils/openai';
import { asRecord, json, parseBody, readOptionalString, readTrimmed } from '../../_utils/sprint';
import {
  buildDistillPrompt,
  DistillOutputDraft,
  hasTable,
  loadDistillBatchSnapshot,
  mapDecisionRow,
  mapSuggestionRow,
  normalizeDistillOutput,
  slugify,
} from '../_distill';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  OPENAI_API_KEY?: string;
}

type GenerateInput = {
  batchId: string;
  sourceId: string;
  sourceUnitId: string;
  items: Array<{
    itemId: string;
    role: string | null;
  }>;
  model: string | null;
};

type SourceScope = {
  workspaceId: string;
  groupId: string | null;
  title: string;
};

type UnitScope = {
  id: string;
  title: string;
  locatorLabel: string | null;
  readingBody: string[];
};

const PROMPT_VERSION = 'wv_distill_v1';

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const db = ctx.env.DB;
    if (!(await ensureTables(db))) {
      return json({ ok: false, error: 'Worldview distill tables are not available.' }, 500);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const input = normalizeInput(body);
    if (!input) {
      return json({ ok: false, error: 'A batch id, source, unit, and selected items are required.' }, 400);
    }

    const source = await readSourceScope(db, input.sourceId, user.id);
    if (!source) {
      return json({ ok: false, error: 'Worldview source not found.' }, 404);
    }

    const unit = await readUnitScope(db, input.sourceId, input.sourceUnitId);
    if (!unit) {
      return json({ ok: false, error: 'Worldview unit not found in this source.' }, 404);
    }

    const selected = await loadSelectedEvidence(db, input, user.id);
    if (!selected.notes.length && !selected.highlights.length) {
      return json({ ok: false, error: 'No selected worldview evidence was found for this batch.' }, 400);
    }

    const prompt = buildDistillPrompt({
      batchId: input.batchId,
      workspaceId: source.workspaceId,
      groupId: source.groupId,
      userId: user.id,
      sourceId: input.sourceId,
      sourceUnitId: input.sourceUnitId,
      sourceTitle: source.title,
      unitTitle: unit.title,
      locatorLabel: unit.locatorLabel,
      readingBody: unit.readingBody,
      highlights: selected.highlights,
      notes: selected.notes,
    });

    const result = await runOpenAITextPrompt(
      {
        prompt,
        model: input.model,
        maxOutputTokens: 2_000,
      },
      ctx.env,
    );

    const draftOutput = normalizeDistillOutput(result.outputText, {
      batchId: input.batchId,
      sourceId: input.sourceId,
      sourceUnitId: input.sourceUnitId,
      sourceTitle: source.title,
      unitTitle: unit.title,
      workspaceId: source.workspaceId,
      groupId: source.groupId,
      userId: user.id,
    });

    await upsertBatch(db, {
      batchId: input.batchId,
      sourceId: input.sourceId,
      sourceUnitId: input.sourceUnitId,
      workspaceId: source.workspaceId,
      groupId: source.groupId,
      userId: user.id,
      unitTitle: unit.title,
      model: result.model,
      usage: result.usage,
      draftOutput,
      selectedItemIds: input.items.map((item) => item.itemId),
    });

    await replaceBatchItems(db, source.workspaceId, input.batchId, input.items, selected);
    await replaceSuggestions(db, {
      batchId: input.batchId,
      workspaceId: source.workspaceId,
      groupId: source.groupId,
      userId: user.id,
      sourceId: input.sourceId,
      sourceUnitId: input.sourceUnitId,
      draft: draftOutput,
      sourceItemIds: input.items.map((item) => item.itemId),
    });

    const snapshot = await loadDistillBatchSnapshot(db, input.batchId, user.id);
    if (!snapshot) {
      return json({ ok: false, error: 'Distill batch was generated but could not be loaded.' }, 500);
    }

    return json({
      ok: true,
      batch: snapshot.batch,
      items: snapshot.items,
      suggestions: snapshot.suggestions.map(mapSuggestionRow),
      decisions: snapshot.decisions.map(mapDecisionRow),
      draft_output: snapshot.draft_output,
      prompt_version: snapshot.prompt_version,
      model: snapshot.model,
      usage: result.usage,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate worldview distill output.';
    const status = message.includes('OPENAI_API_KEY is not configured') ? 503 : 500;
    return json({ ok: false, error: message }, status);
  }
};

async function ensureTables(db: D1Database): Promise<boolean> {
  const required = [
    'wv_distill_batches',
    'wv_distill_batch_items',
    'wv_insight_suggestions',
    'wv_insight_decisions',
    'wv_sources',
    'wv_source_units',
    'wv_notes',
    'wv_highlights',
  ];

  for (const table of required) {
    if (!(await hasTable(db, table))) {
      return false;
    }
  }

  return true;
}

function normalizeInput(body: Record<string, unknown>): GenerateInput | null {
  const batchId = readTrimmed(body['batchId'] ?? body['batch_id']);
  const sourceId = readTrimmed(body['sourceId'] ?? body['source_id']);
  const sourceUnitId = readTrimmed(body['sourceUnitId'] ?? body['source_unit_id']);
  const items = Array.isArray(body['items'])
    ? body['items']
        .map((entry) => {
          const row = asRecord(entry);
          const itemId = readTrimmed(row?.['itemId'] ?? row?.['item_id']);
          if (!itemId) {
            return null;
          }

          return {
            itemId,
            role: readOptionalString(row?.['role']),
          };
        })
        .filter((item): item is { itemId: string; role: string | null } => item !== null)
    : [];

  if (!batchId || !sourceId || !sourceUnitId || !items.length) {
    return null;
  }

  return {
    batchId,
    sourceId,
    sourceUnitId,
    items,
    model: readOptionalString(body['model']),
  };
}

async function readSourceScope(db: D1Database, sourceId: string, userId: number): Promise<SourceScope | null> {
  const row = await db
    .prepare(
      `
      SELECT workspace_id, group_id, title
      FROM wv_sources
      WHERE id = ?1
        AND (user_id = ?2 OR user_id IS NULL)
      LIMIT 1
      `
    )
    .bind(sourceId, userId)
    .first<Record<string, unknown>>();

  const workspaceId = readTrimmed(row?.['workspace_id']);
  const title = readTrimmed(row?.['title']);
  if (!workspaceId || !title) {
    return null;
  }

  return {
    workspaceId,
    groupId: readOptionalString(row?.['group_id']),
    title,
  };
}

async function readUnitScope(db: D1Database, sourceId: string, unitId: string): Promise<UnitScope | null> {
  const row = await db
    .prepare(
      `
      SELECT id, title, start_ref, end_ref, unit_json, meta_json
      FROM wv_source_units
      WHERE id = ?1
        AND source_id = ?2
      LIMIT 1
      `
    )
    .bind(unitId, sourceId)
    .first<Record<string, unknown>>();

  const id = readTrimmed(row?.['id']);
  const title = readTrimmed(row?.['title']);
  if (!id || !title) {
    return null;
  }

  const unitJson = parseJson(row?.['unit_json']);
  const metaJson = parseJson(row?.['meta_json']);
  const locatorLabel =
    readOptionalString(unitJson?.['locatorLabel']) ||
    readOptionalString(unitJson?.['locator_label']) ||
    readOptionalString(metaJson?.['locatorLabel']) ||
    joinLocator(readOptionalString(row?.['start_ref']), readOptionalString(row?.['end_ref']));

  return {
    id,
    title,
    locatorLabel,
    readingBody: readStringArray(unitJson?.['readingBody']) ?? readStringArray(unitJson?.['reading_body']) ?? [],
  };
}

async function loadSelectedEvidence(
  db: D1Database,
  input: GenerateInput,
  userId: number,
): Promise<{
  notes: Array<Record<string, unknown>>;
  highlights: Array<Record<string, unknown>>;
  itemTypeById: Map<string, 'note' | 'highlight'>;
}> {
  const notes: Array<Record<string, unknown>> = [];
  const highlights: Array<Record<string, unknown>> = [];
  const itemTypeById = new Map<string, 'note' | 'highlight'>();

  for (let index = 0; index < input.items.length; index += 1) {
    const item = input.items[index];
    const noteRow = await db
      .prepare(
        `
        SELECT id, note_kind, title, body_md, excerpt_text, locator, note_json, meta_json, created_at, updated_at
        FROM wv_notes
        WHERE id = ?1
          AND source_id = ?2
          AND source_unit_id = ?3
          AND (user_id = ?4 OR user_id IS NULL)
        LIMIT 1
        `
      )
      .bind(item.itemId, input.sourceId, input.sourceUnitId, userId)
      .first<Record<string, unknown>>();

    if (noteRow) {
      notes.push({
        id: item.itemId,
        role: item.role,
        order_index: index + 1,
        note_kind: readTrimmed(noteRow['note_kind']),
        title: readOptionalString(noteRow['title']),
        body_md: readTrimmed(noteRow['body_md']) ?? '',
        excerpt_text: readOptionalString(noteRow['excerpt_text']),
        locator: readOptionalString(noteRow['locator']),
        note_json: parseJson(noteRow['note_json']) ?? {},
        meta_json: parseJson(noteRow['meta_json']) ?? {},
        created_at: readOptionalString(noteRow['created_at']),
        updated_at: readOptionalString(noteRow['updated_at']),
      });
      itemTypeById.set(item.itemId, 'note');
      continue;
    }

    const highlightRow = await db
      .prepare(
        `
        SELECT id, locator, anchor_text, selected_text, start_offset, end_offset, color, meta_json, created_at, updated_at
        FROM wv_highlights
        WHERE id = ?1
          AND source_id = ?2
          AND source_unit_id = ?3
          AND (user_id = ?4 OR user_id IS NULL)
        LIMIT 1
        `
      )
      .bind(item.itemId, input.sourceId, input.sourceUnitId, userId)
      .first<Record<string, unknown>>();

    if (!highlightRow) {
      continue;
    }

    highlights.push({
      id: item.itemId,
      role: item.role,
      order_index: index + 1,
      locator: readOptionalString(highlightRow['locator']),
      anchor_text: readOptionalString(highlightRow['anchor_text']),
      selected_text: readTrimmed(highlightRow['selected_text']) ?? '',
      start_offset: readNumber(highlightRow['start_offset']),
      end_offset: readNumber(highlightRow['end_offset']),
      color: readOptionalString(highlightRow['color']),
      meta_json: parseJson(highlightRow['meta_json']) ?? {},
      created_at: readOptionalString(highlightRow['created_at']),
      updated_at: readOptionalString(highlightRow['updated_at']),
    });
    itemTypeById.set(item.itemId, 'highlight');
  }

  return { notes, highlights, itemTypeById };
}

async function upsertBatch(
  db: D1Database,
  input: {
    batchId: string;
    sourceId: string;
    sourceUnitId: string;
    workspaceId: string;
    groupId: string | null;
    userId: number;
    unitTitle: string;
    model: string;
    usage: unknown;
    draftOutput: DistillOutputDraft;
    selectedItemIds: string[];
  },
): Promise<void> {
  const canonicalInput = `wv_distill_batch:${slugify(input.sourceUnitId, 'unit')}:${input.batchId}`;
  const title = `Distill ${input.unitTitle}`;
  const batchJson = {
    source_id: input.sourceId,
    source_unit_id: input.sourceUnitId,
  };
  const metaJson = {
    prompt_version: PROMPT_VERSION,
    model: input.model,
    usage: input.usage,
    generated_at: new Date().toISOString(),
    selected_item_ids: input.selectedItemIds,
    draft_output: input.draftOutput,
  };

  await db
    .prepare(
      `
      INSERT OR IGNORE INTO wv_distill_batches (
        id,
        canonical_input,
        workspace_id,
        group_id,
        user_id,
        batch_type,
        title,
        instructions_md,
        status,
        batch_json,
        meta_json
      )
      VALUES (?1, ?2, ?3, ?4, ?5, 'distill', ?6, NULL, 'ready', ?7, ?8)
      `
    )
    .bind(
      input.batchId,
      canonicalInput,
      input.workspaceId,
      input.groupId,
      input.userId,
      title,
      JSON.stringify(batchJson),
      JSON.stringify(metaJson),
    )
    .run();

  await db
    .prepare(
      `
      UPDATE wv_distill_batches
      SET
        workspace_id = ?2,
        group_id = ?3,
        user_id = ?4,
        title = ?5,
        status = 'ready',
        batch_json = ?6,
        meta_json = ?7,
        updated_at = datetime('now')
      WHERE id = ?1
      `
    )
    .bind(
      input.batchId,
      input.workspaceId,
      input.groupId,
      input.userId,
      title,
      JSON.stringify(batchJson),
      JSON.stringify(metaJson),
    )
    .run();
}

async function replaceBatchItems(
  db: D1Database,
  workspaceId: string,
  batchId: string,
  items: GenerateInput['items'],
  selected: {
    itemTypeById: Map<string, 'note' | 'highlight'>;
  },
): Promise<void> {
  await db
    .prepare(
      `
      DELETE FROM wv_distill_batch_items
      WHERE batch_id = ?1
        AND workspace_id = ?2
      `
    )
    .bind(batchId, workspaceId)
    .run();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const itemType = selected.itemTypeById.get(item.itemId);
    if (!itemType) {
      continue;
    }

    await db
      .prepare(
        `
        INSERT INTO wv_distill_batch_items (
          workspace_id,
          batch_id,
          item_type,
          item_id,
          order_index,
          role
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        `
      )
      .bind(workspaceId, batchId, itemType, item.itemId, index + 1, item.role)
      .run();
  }
}

async function replaceSuggestions(
  db: D1Database,
  input: {
    batchId: string;
    workspaceId: string;
    groupId: string | null;
    userId: number;
    sourceId: string;
    sourceUnitId: string;
    draft: DistillOutputDraft;
    sourceItemIds: string[];
  },
): Promise<void> {
  await db
    .prepare(
      `
      DELETE FROM wv_insight_decisions
      WHERE suggestion_id IN (
        SELECT id
        FROM wv_insight_suggestions
        WHERE batch_id = ?1
          AND workspace_id = ?2
      )
      `
    )
    .bind(input.batchId, input.workspaceId)
    .run();

  await db
    .prepare(
      `
      DELETE FROM wv_insight_suggestions
      WHERE batch_id = ?1
        AND workspace_id = ?2
      `
    )
    .bind(input.batchId, input.workspaceId)
    .run();

  for (let index = 0; index < input.draft.wv_nodes.length; index += 1) {
    const node = input.draft.wv_nodes[index];
    await db
      .prepare(
        `
        INSERT INTO wv_insight_suggestions (
          id,
          canonical_input,
          workspace_id,
          group_id,
          batch_id,
          user_id,
          suggestion_type,
          payload_json,
          confidence,
          rationale,
          status,
          meta_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'node', ?7, ?8, ?9, 'suggested', ?10)
        `
      )
      .bind(
        `wv_sug_${input.batchId.slice(-8)}_node_${index + 1}`,
        `wv_insight_suggestion:${input.batchId}:node:${node.id}`,
        input.workspaceId,
        input.groupId,
        input.batchId,
        input.userId,
        JSON.stringify({
          node_id: node.id,
          node_type: node.node_type,
          title: node.title,
          summary: node.summary,
          text_plain: node.text_plain,
        }),
        0.86,
        'Generated from selected passage highlights and notes.',
        JSON.stringify({
          kind: node.node_type,
          relation_type: null,
          source_id: input.sourceId,
          source_unit_id: input.sourceUnitId,
          source_item_ids: input.sourceItemIds,
          order_index: index + 1,
        }),
      )
      .run();
  }

  for (let index = 0; index < input.draft.wv_node_edges.length; index += 1) {
    const edge = input.draft.wv_node_edges[index];
    const fromNode = input.draft.wv_nodes.find((node) => node.id === edge.from_node_id);
    const toNode = input.draft.wv_nodes.find((node) => node.id === edge.to_node_id);
    const title = `${fromNode?.title || edge.from_node_id} ${edge.relation_type.replace(/_/g, ' ')} ${toNode?.title || edge.to_node_id}`;

    await db
      .prepare(
        `
        INSERT INTO wv_insight_suggestions (
          id,
          canonical_input,
          workspace_id,
          group_id,
          batch_id,
          user_id,
          suggestion_type,
          payload_json,
          confidence,
          rationale,
          status,
          meta_json
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'edge', ?7, ?8, ?9, 'suggested', ?10)
        `
      )
      .bind(
        `wv_sug_${input.batchId.slice(-8)}_edge_${index + 1}`,
        `wv_insight_suggestion:${input.batchId}:edge:${edge.id}`,
        input.workspaceId,
        input.groupId,
        input.batchId,
        input.userId,
        JSON.stringify({
          edge_id: edge.id,
          node_type: 'edge',
          title,
          summary: edge.note || `${edge.relation_type.replace(/_/g, ' ')} relationship`,
          relation_type: edge.relation_type,
          from_node_id: edge.from_node_id,
          to_node_id: edge.to_node_id,
        }),
        0.78,
        'Generated from relationships implied by the selected evidence.',
        JSON.stringify({
          kind: 'edge',
          relation_type: edge.relation_type,
          source_id: input.sourceId,
          source_unit_id: input.sourceUnitId,
          source_item_ids: input.sourceItemIds,
          order_index: index + 1,
        }),
      )
      .run();
  }
}

function parseJson(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readStringArray(value: unknown): string[] | null {
  return Array.isArray(value)
    ? value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
    : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function joinLocator(startRef: string | null, endRef: string | null): string | null {
  if (startRef && endRef) {
    return startRef === endRef ? startRef : `${startRef}-${endRef}`;
  }

  return startRef || endRef || null;
}

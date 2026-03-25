import type { D1Database } from '@cloudflare/workers-types';

import { asRecord, readOptionalString, readTrimmed } from '../_utils/sprint';

export const WORLDVIEW_NODE_TYPES = [
  'cluster',
  'subcluster',
  'group',
  'collection',
  'theme',
  'concept',
  'principle',
  'law',
  'pattern',
  'framework',
  'claim',
  'evidence',
  'proof_step',
  'counter_claim',
  'assumption',
  'inference',
  'flow',
  'process',
  'sequence_step',
  'transition',
  'cause',
  'effect',
  'state',
  'event',
  'actor',
  'role',
  'trait',
  'intention',
  'emotion',
  'decision',
  'psych_state',
  'cognitive_bias',
  'moral_state',
  'spiritual_state',
  'ayah_ref',
  'surah_ref',
  'quranic_pattern',
  'source',
  'source_unit',
  'quote',
  'reference',
  'question',
  'reflection',
  'insight',
  'warning',
  'lesson',
  'content_piece',
  'podcast_segment',
  'lesson_block',
  'short_clip',
  'diagram_anchor',
  'highlight',
  'focus_node',
] as const;

export type DistillNodeType = (typeof WORLDVIEW_NODE_TYPES)[number];
export type DistillEdgeType = 'supports' | 'illustrates' | 'related_to' | 'defines' | 'derived_from' | 'about';
export type DistillBlockType = 'heading' | 'paragraph' | 'bullet_item' | 'numbered_item' | 'quote' | 'callout' | 'divider';
export type DistillBlockRelation = 'mentions' | 'supports' | 'defines' | 'references' | 'illustrates' | 'feeds';

export interface DistillNodeDraft {
  id: string;
  canonical_input: string;
  workspace_id: string;
  group_id: string | null;
  user_id: number;
  node_type: DistillNodeType;
  title: string;
  text_plain: string;
  summary: string;
  slug: string;
  status: 'active';
  data_json: Record<string, unknown>;
  meta_json: Record<string, unknown>;
}

export interface DistillEdgeDraft {
  id: string;
  canonical_input: string;
  workspace_id: string;
  group_id: string | null;
  from_node_id: string;
  to_node_id: string;
  relation_type: DistillEdgeType;
  strength: number | null;
  order_index: number;
  note: string | null;
  meta_json: Record<string, unknown>;
}

export interface DistillDocumentDraft {
  id: string;
  canonical_input: string;
  workspace_id: string;
  group_id: string | null;
  user_id: number;
  doc_type: 'study_note';
  title: string;
  summary: string;
  cover_image_url: null;
  status: 'active';
  related_node_id: string | null;
  document_json: Record<string, unknown>;
  meta_json: Record<string, unknown>;
}

export interface DistillDocumentBlockDraft {
  id: string;
  canonical_input: string;
  workspace_id: string;
  group_id: string | null;
  user_id: number;
  document_id: string;
  parent_block_id: string | null;
  order_index: number;
  block_type: DistillBlockType;
  block_level: number | null;
  text_plain: string | null;
  content_json: Record<string, unknown> | null;
  attrs_json: Record<string, unknown>;
  meta_json: Record<string, unknown>;
}

export interface DistillBlockNodeLinkDraft {
  id: string;
  canonical_input: string;
  workspace_id: string;
  group_id: string | null;
  user_id: number;
  block_id: string;
  node_id: string;
  relation: DistillBlockRelation;
}

export interface DistillPodcastEpisodeDraft {
  id: string;
  source_unit_id: string;
  title: string;
  hook: string;
  intro: string;
  main_points: string[];
  closing: string;
}

export interface DistillOutputDraft {
  wv_nodes: DistillNodeDraft[];
  wv_node_edges: DistillEdgeDraft[];
  wv_documents: DistillDocumentDraft[];
  wv_document_blocks: DistillDocumentBlockDraft[];
  wv_block_node_links: DistillBlockNodeLinkDraft[];
  podcast_episode: DistillPodcastEpisodeDraft;
}

export interface DistillBatchSnapshot {
  batch: {
    id: string;
    source_id: string;
    source_unit_id: string;
    workspace_id: string;
    group_id: string | null;
    title: string | null;
    status: string;
    created_at: string;
    updated_at: string | null;
  };
  items: Array<{
    item_id: string;
    item_type: 'note' | 'highlight';
    role: string | null;
    order_index: number;
  }>;
  suggestions: Array<Record<string, unknown>>;
  decisions: Array<Record<string, unknown>>;
  draft_output: DistillOutputDraft | null;
  prompt_version: string | null;
  model: string | null;
}

export interface DistillPromptContext {
  batchId: string;
  workspaceId: string;
  groupId: string | null;
  userId: number;
  sourceId: string;
  sourceUnitId: string;
  sourceTitle: string;
  unitTitle: string;
  locatorLabel: string | null;
  readingBody: string[];
  highlights: Array<Record<string, unknown>>;
  notes: Array<Record<string, unknown>>;
}

const NODE_TYPES = new Set<DistillNodeType>(WORLDVIEW_NODE_TYPES);
const EDGE_TYPES = new Set<DistillEdgeType>(['supports', 'illustrates', 'related_to', 'defines', 'derived_from', 'about']);
const BLOCK_TYPES = new Set<DistillBlockType>(['heading', 'paragraph', 'bullet_item', 'numbered_item', 'quote', 'callout', 'divider']);
const BLOCK_RELATIONS = new Set<DistillBlockRelation>(['mentions', 'supports', 'defines', 'references', 'illustrates', 'feeds']);

export async function hasTable(db: D1Database, tableName: string): Promise<boolean> {
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
    .first<Record<string, unknown>>();

  return Boolean(row);
}

export async function loadDistillBatchSnapshot(
  db: D1Database,
  batchId: string,
  userId: number,
): Promise<DistillBatchSnapshot | null> {
  const batchRow = await db
    .prepare(
      `
      SELECT
        b.id,
        b.workspace_id,
        b.group_id,
        b.title,
        b.status,
        b.batch_json,
        b.meta_json,
        b.created_at,
        b.updated_at
      FROM wv_distill_batches b
      WHERE b.id = ?1
        AND b.user_id = ?2
      LIMIT 1
      `
    )
    .bind(batchId, userId)
    .first<Record<string, unknown>>();

  if (!batchRow) {
    return null;
  }

  const batchJson = parseJsonObject(batchRow['batch_json']);
  const metaJson = parseJsonObject(batchRow['meta_json']);
  const sourceId = readTrimmed(batchJson?.['source_id']);
  const sourceUnitId = readTrimmed(batchJson?.['source_unit_id']);
  const workspaceId = readTrimmed(batchRow['workspace_id']);
  if (!sourceId || !sourceUnitId || !workspaceId) {
    return null;
  }

  const [itemsResult, suggestionsResult, decisionsResult] = await Promise.all([
    db
      .prepare(
        `
        SELECT item_id, item_type, role, order_index
        FROM wv_distill_batch_items
        WHERE batch_id = ?1
          AND workspace_id = ?2
        ORDER BY order_index ASC, id ASC
        `
      )
      .bind(batchId, workspaceId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `
        SELECT id, batch_id, suggestion_type, payload_json, confidence, rationale, status, meta_json, created_at, updated_at
        FROM wv_insight_suggestions
        WHERE batch_id = ?1
          AND workspace_id = ?2
        ORDER BY created_at ASC, id ASC
        `
      )
      .bind(batchId, workspaceId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `
        SELECT d.id, d.suggestion_id, d.decision, d.target_type, d.target_id, d.edited_payload_json, d.note, d.created_at, d.updated_at
        FROM wv_insight_decisions d
        INNER JOIN wv_insight_suggestions s ON s.id = d.suggestion_id
        WHERE s.batch_id = ?1
          AND d.workspace_id = ?2
          AND d.user_id = ?3
        ORDER BY d.created_at ASC, d.id ASC
        `
      )
      .bind(batchId, workspaceId, userId)
      .all<Record<string, unknown>>(),
  ]);

  const items: DistillBatchSnapshot['items'] = [];
  for (const row of itemsResult.results ?? []) {
    const itemId = readTrimmed(row['item_id']);
    if (!itemId) {
      continue;
    }

    items.push({
      item_id: itemId,
      item_type: readTrimmed(row['item_type']) === 'highlight' ? 'highlight' : 'note',
      role: readOptionalString(row['role']),
      order_index: readNumber(row['order_index']) ?? 0,
    });
  }

  return {
    batch: {
      id: readTrimmed(batchRow['id']) ?? batchId,
      source_id: sourceId,
      source_unit_id: sourceUnitId,
      workspace_id: workspaceId,
      group_id: readOptionalString(batchRow['group_id']),
      title: readOptionalString(batchRow['title']),
      status: readTrimmed(batchRow['status']) ?? 'draft',
      created_at: readTrimmed(batchRow['created_at']) ?? new Date().toISOString(),
      updated_at: readOptionalString(batchRow['updated_at']),
    },
    items,
    suggestions: suggestionsResult.results ?? [],
    decisions: decisionsResult.results ?? [],
    draft_output: parseDistillOutput(metaJson?.['draft_output']),
    prompt_version: readOptionalString(metaJson?.['prompt_version']),
    model: readOptionalString(metaJson?.['model']),
  };
}

export async function loadLatestDistillBatchSnapshotForUnit(
  db: D1Database,
  sourceId: string,
  sourceUnitId: string,
  userId: number,
): Promise<DistillBatchSnapshot | null> {
  const row = await db
    .prepare(
      `
      SELECT id
      FROM wv_distill_batches
      WHERE user_id = ?1
        AND json_extract(batch_json, '$.source_id') = ?2
        AND json_extract(batch_json, '$.source_unit_id') = ?3
      ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC, id DESC
      LIMIT 1
      `
    )
    .bind(userId, sourceId, sourceUnitId)
    .first<Record<string, unknown>>();

  const batchId = readTrimmed(row?.['id']);
  if (!batchId) {
    return null;
  }

  return loadDistillBatchSnapshot(db, batchId, userId);
}

export function buildDistillPrompt(context: DistillPromptContext): string {
  const passageJson = {
    passage_context: {
      batch_id: context.batchId,
      workspace_id: context.workspaceId,
      group_id: context.groupId,
      user_id: context.userId,
      source_id: context.sourceId,
      source_unit_id: context.sourceUnitId,
      source_title: context.sourceTitle,
      source_unit_title: context.unitTitle,
      locator_label: context.locatorLabel,
      reading_body: context.readingBody,
    },
    highlights: context.highlights,
    notes: context.notes,
  };

  return [
    'You are a structured knowledge distillation engine for the K-Maps system.',
    '',
    'Your task is to convert passage-level reading evidence into structured worldview suggestions and one spoken-content episode outline.',
    '',
    'You will receive JSON containing:',
    '- passage_context',
    '- highlights',
    '- notes',
    '',
    'STRICT RULES',
    '- Use ONLY the provided highlights, notes, and passage context.',
    '- Do NOT invent unsupported tafsir, historical claims, or external commentary.',
    '- Keep titles concise and usually under 6 words.',
    '- Keep summaries short but meaningful and usually under 18 words.',
    '- Keep text_plain short and usually under 28 words.',
    '- Prefer concept and claim nodes first.',
    '- Keep the total output compact enough to fit in one response.',
    '- Generate 4 to 6 nodes total.',
    '- Generate no more than 5 edges total.',
    '- Create exactly one study_note document.',
    '- Edges must connect only generated nodes.',
    '- Block-node links must connect only generated blocks and generated nodes.',
    '- Return ONLY valid JSON.',
    '- Do not include markdown fences.',
    '- Do not include explanations before or after the JSON.',
    '',
    'WORLDVIEW RULES',
    `- Node types allowed: ${WORLDVIEW_NODE_TYPES.join(', ')}.`,
    '- Edge relation types allowed: supports, illustrates, related_to, defines, derived_from, about.',
    '- Block types allowed: heading, paragraph, bullet_item, numbered_item, quote, callout, divider.',
    '- Block-node link relations allowed: mentions, supports, defines, references, illustrates, feeds.',
    '',
    'DOCUMENT RULES',
    '- Create exactly one study_note document in wv_documents.',
    '- Create document blocks in logical reading order.',
    '- Generate 6 to 8 document blocks total.',
    '- The first block should usually be a heading or a paragraph.',
    '- Keep each block text short and usually under 20 words.',
    '- Keep block text grounded in the evidence.',
    '',
    'PODCAST / YOUTUBE RULES',
    '- Create one spoken episode outline grounded in the same passage evidence.',
    '- Make it suitable for podcast or YouTube teaching content.',
    '- Include: title, hook, intro, main_points, closing.',
    '- Keep main_points to 3 to 5 items.',
    '- Keep hook, intro, and closing concise.',
    '- main_points must be an array of short speaking points as plain strings.',
    '- Do not return objects inside main_points.',
    '',
    'ID RULES',
    '- Use short local ids like n01, n02, e01 when you provide ids.',
    '- The server will normalize ids into passage-scoped stable ids automatically.',
    '- Keep all ids internally consistent within the returned JSON.',
    '',
    'RETURN JSON WITH EXACTLY THIS TOP-LEVEL SHAPE',
    '{',
    '  "wv_nodes": [',
    '    {',
    '      "id": "string",',
    '      "canonical_input": "string",',
    '      "node_type": "one of the allowed worldview node types",',
    '      "title": "string",',
    '      "text_plain": "string",',
    '      "summary": "string",',
    '      "slug": "string",',
    '      "data_json": {},',
    '      "meta_json": {}',
    '    }',
    '  ],',
    '  "wv_node_edges": [',
    '    {',
    '      "id": "string",',
    '      "canonical_input": "string",',
    '      "from_node_id": "string",',
    '      "to_node_id": "string",',
    '      "relation_type": "supports | illustrates | related_to | defines | derived_from | about",',
    '      "strength": 0.0,',
    '      "order_index": 1,',
    '      "note": "string or null",',
    '      "meta_json": {}',
    '    }',
    '  ],',
    '  "wv_documents": [',
    '    {',
    '      "id": "string",',
    '      "canonical_input": "string",',
    '      "doc_type": "study_note",',
    '      "title": "string",',
    '      "summary": "string",',
    '      "document_json": {},',
    '      "meta_json": {}',
    '    }',
    '  ],',
    '  "wv_document_blocks": [',
    '    {',
    '      "id": "string",',
    '      "canonical_input": "string",',
    '      "document_id": "string",',
    '      "parent_block_id": null,',
    '      "order_index": 1,',
    '      "block_type": "heading | paragraph | bullet_item | numbered_item | quote | callout | divider",',
    '      "block_level": 1,',
    '      "text_plain": "string",',
    '      "content_json": {},',
    '      "attrs_json": {},',
    '      "meta_json": {}',
    '    }',
    '  ],',
    '  "wv_block_node_links": [',
    '    {',
    '      "id": "string",',
    '      "canonical_input": "string",',
    '      "block_id": "string",',
    '      "node_id": "string",',
    '      "relation": "mentions | supports | defines | references | illustrates | feeds"',
    '    }',
    '  ],',
    '  "podcast_episode": {',
    '    "id": "string",',
    '    "source_unit_id": "string",',
    '    "title": "string",',
    '    "hook": "string",',
    '    "intro": "string",',
    '    "main_points": ["string", "string"],',
    '    "closing": "string"',
    '  }',
    '}',
    '',
    'IMPORTANT',
    '- Return all top-level keys even if some arrays are empty.',
    '- wv_documents must contain exactly one study_note document.',
    '- podcast_episode.main_points must be an array of strings only.',
    '- Keep the response compact and clean.',
    '',
    'PASSAGE DATA',
    JSON.stringify(passageJson, null, 2),
  ].join('\n');
}

export function normalizeDistillOutput(
  raw: string,
  context: {
    batchId: string;
    sourceId: string;
    sourceUnitId: string;
    sourceTitle: string;
    unitTitle: string;
    locatorLabel: string | null;
    workspaceId: string;
    groupId: string | null;
    userId: number;
  },
): DistillOutputDraft {
  const parsed = parseJsonObject(extractJson(raw));
  if (!parsed) {
    throw new Error('Distill generation did not return valid JSON.');
  }

  const rawNodes = readArray(parsed['wv_nodes']);
  const nodeIdsInUse = new Set<string>();
  const nodeIdMap = new Map<string, string>();
  const nodes = rawNodes
    .map((entry, index) => normalizeNode(entry, index, context, nodeIdsInUse, nodeIdMap))
    .filter((node): node is DistillNodeDraft => node !== null);

  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const rawEdges = readArray(parsed['wv_node_edges']);
  const edges = rawEdges
    .map((entry, index) => normalizeEdge(entry, index, context, nodeIdSet, nodeIdMap))
    .filter((edge): edge is DistillEdgeDraft => edge !== null);

  const rawDocuments = readArray(parsed['wv_documents']);
  const document = normalizeDocument(rawDocuments[0], context, nodes[0]?.id ?? null);
  const documents = document ? [document] : [];

  const rawBlocks = readArray(parsed['wv_document_blocks']);
  const blocks = document
    ? rawBlocks
        .map((entry, index) => normalizeBlock(entry, index, context, document.id))
        .filter((block): block is DistillDocumentBlockDraft => block !== null)
    : [];
  const blockIdSet = new Set(blocks.map((block) => block.id));

  const rawLinks = readArray(parsed['wv_block_node_links']);
  const links = rawLinks
    .map((entry, index) => normalizeBlockNodeLink(entry, index, context, blockIdSet, nodeIdSet, nodeIdMap))
    .filter((link): link is DistillBlockNodeLinkDraft => link !== null);

  const podcast = normalizePodcastEpisode(parsed['podcast_episode'], context);

  return {
    wv_nodes: nodes,
    wv_node_edges: edges,
    wv_documents: documents,
    wv_document_blocks: blocks,
    wv_block_node_links: links,
    podcast_episode: podcast,
  };
}

export function applyDecisionsToDraft(
  draft: DistillOutputDraft,
  decisions: Array<Record<string, unknown>>,
  batchId: string,
): DistillOutputDraft {
  const nodeDecisions = new Map<
    string,
    {
      decision: string;
      editedPayload: Record<string, unknown> | null;
    }
  >();

  for (const row of decisions) {
    const targetId = readOptionalString(row['target_id']);
    if (!targetId) {
      continue;
    }

    nodeDecisions.set(targetId, {
      decision: readTrimmed(row['decision']) ?? 'approve',
      editedPayload: parseJsonObject(row['edited_payload_json']),
    });
  }

  const keptNodes: DistillNodeDraft[] = [];
  for (const node of draft.wv_nodes) {
    const decision = nodeDecisions.get(node.id);
    if (decision?.decision === 'reject') {
      continue;
    }

    const edited = decision?.editedPayload;
    const nodeType = normalizeNodeType(edited?.['node_type']) ?? node.node_type;
    const title = sanitizeSentence(edited?.['title'], 120) || node.title;
    const summary = sanitizeSentence(edited?.['summary'], 220) || node.summary;

    keptNodes.push({
      ...node,
      node_type: nodeType,
      title,
      summary,
      text_plain: sanitizeSentence(edited?.['text_plain'], 420) || node.text_plain,
      meta_json: {
        ...node.meta_json,
        batch_id: batchId,
        approved_via: decision?.decision ?? 'implicit',
      },
    });
  }

  const keptNodeIds = new Set(keptNodes.map((node) => node.id));
  const keptEdges = draft.wv_node_edges.filter(
    (edge) => keptNodeIds.has(edge.from_node_id) && keptNodeIds.has(edge.to_node_id),
  );
  const relatedNodeId = draft.wv_documents[0]?.related_node_id && keptNodeIds.has(draft.wv_documents[0].related_node_id)
    ? draft.wv_documents[0].related_node_id
    : keptNodes[0]?.id ?? null;
  const keptDocuments = draft.wv_documents.map((document) => ({
    ...document,
    related_node_id: relatedNodeId,
    meta_json: {
      ...document.meta_json,
      batch_id: batchId,
    },
  }));
  const keptLinks = draft.wv_block_node_links.filter((link) => keptNodeIds.has(link.node_id));

  return {
    ...draft,
    wv_nodes: keptNodes,
    wv_node_edges: keptEdges,
    wv_documents: keptDocuments,
    wv_block_node_links: keptLinks,
  };
}

export async function upsertPodcastEpisode(
  db: D1Database,
  draft: DistillPodcastEpisodeDraft,
  context: {
    batchId: string;
    sourceId: string;
    sourceUnitId: string;
    userId: number;
  },
): Promise<void> {
  if (!(await hasTable(db, 'wv_content_items'))) {
    throw new Error('wv_content_items table is not available.');
  }

  const contentItemId = `pod_ep_${slugify(context.sourceUnitId, 'source-unit')}`;
  const worldview = await readPodcastWorldviewContext(db, context.sourceId, context.sourceUnitId);
  const canonicalInput = `wv_podcast:${context.batchId}:${slugify(draft.title || 'episode', 'episode')}`;
  const primaryReference = [
    worldview.source_title,
    worldview.unit_title,
    worldview.subunit_title,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' / ');
  const refsJson = {
    primary: {
      related_type: 'wv_source_unit',
      related_id: context.sourceUnitId,
      label: primaryReference || draft.title,
      citation: null,
    },
    references: [
      {
        related_type: 'external',
        related_id: null,
        label: 'Generated from worldview distill batch',
        locator: null,
        citation: null,
        tags: ['worldview', 'distill', 'podcast'],
      },
    ],
    primary_reference: primaryReference || null,
    worldview,
    batch_id: context.batchId,
    source_id: context.sourceId,
    source_unit_id: context.sourceUnitId,
  };
  const outlineSections = [
    draft.hook,
    draft.intro,
    ...draft.main_points,
    draft.closing,
  ]
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((title, index) => ({
      id: `outline-${index + 1}`,
      title,
    }));
  const contentJson = {
    schema_version: 1,
    source: 'wv_distill_batch',
    batch_id: context.batchId,
    source_id: context.sourceId,
    source_unit_id: draft.source_unit_id,
    worldview,
    source_title: worldview.source_title,
    unit_title: worldview.unit_title,
    subunit_title: worldview.subunit_title,
    locator_label: worldview.locator_label,
    topic: draft.title,
    summary: draft.intro || draft.hook || draft.closing || '',
    kind: 'outline',
    outline: outlineSections.map((entry) => entry.title),
    outline_sections: outlineSections,
    episode_outline: {
      hook: draft.hook,
      intro: draft.intro,
      main_points: draft.main_points,
      closing: draft.closing,
    },
    script: '',
    script_md: '',
    checklist: [],
    generated_episode_id: draft.id,
  };

  await db
    .prepare(
      `
      INSERT OR IGNORE INTO wv_content_items (
        id,
        canonical_input,
        user_id,
        title,
        content_type,
        status,
        related_type,
        related_id,
        refs_json,
        content_json,
        created_at,
        updated_at
      )
      VALUES (?1, ?2, ?3, ?4, 'podcast_episode', 'draft', 'wv_source_unit', ?5, ?6, ?7, datetime('now'), datetime('now'))
      `
    )
    .bind(
      contentItemId,
      canonicalInput,
      context.userId,
      draft.title,
      context.sourceUnitId,
      JSON.stringify(refsJson),
      JSON.stringify(contentJson),
    )
    .run();

  await db
    .prepare(
      `
      UPDATE wv_content_items
      SET
        canonical_input = ?2,
        title = ?3,
        content_type = 'podcast_episode',
        status = 'draft',
        related_type = 'wv_source_unit',
        related_id = ?4,
        refs_json = ?5,
        content_json = ?6,
        updated_at = datetime('now')
      WHERE id = ?1
        AND user_id = ?7
      `
    )
    .bind(
      contentItemId,
      canonicalInput,
      draft.title,
      context.sourceUnitId,
      JSON.stringify(refsJson),
      JSON.stringify(contentJson),
      context.userId,
    )
    .run();
}

async function readPodcastWorldviewContext(
  db: D1Database,
  sourceId: string,
  sourceUnitId: string,
): Promise<{
  source_id: string;
  source_title: string | null;
  unit_id: string | null;
  unit_title: string | null;
  subunit_id: string | null;
  subunit_title: string | null;
  selected_unit_id: string;
  locator_label: string | null;
}> {
  const sourceRow = await db
    .prepare(
      `
      SELECT id, title
      FROM wv_sources
      WHERE id = ?1
      LIMIT 1
      `
    )
    .bind(sourceId)
    .first<Record<string, unknown>>();

  const unitRow = await db
    .prepare(
      `
      SELECT id, parent_unit_id, title, start_ref, end_ref, unit_json, meta_json
      FROM wv_source_units
      WHERE id = ?1
        AND source_id = ?2
      LIMIT 1
      `
    )
    .bind(sourceUnitId, sourceId)
    .first<Record<string, unknown>>();

  const sourceTitle = readOptionalString(sourceRow?.['title']);
  const selectedUnitTitle = readOptionalString(unitRow?.['title']);
  const parentUnitId = readOptionalString(unitRow?.['parent_unit_id']);

  let unitId: string | null = sourceUnitId;
  let unitTitle: string | null = selectedUnitTitle;
  let subunitId: string | null = null;
  let subunitTitle: string | null = null;

  if (parentUnitId) {
    const parentRow = await db
      .prepare(
        `
        SELECT id, title
        FROM wv_source_units
        WHERE id = ?1
          AND source_id = ?2
        LIMIT 1
        `
      )
      .bind(parentUnitId, sourceId)
      .first<Record<string, unknown>>();

    unitId = readOptionalString(parentRow?.['id']) ?? parentUnitId;
    unitTitle = readOptionalString(parentRow?.['title']) ?? unitTitle;
    subunitId = sourceUnitId;
    subunitTitle = selectedUnitTitle;
  }

  const unitJson = parseJsonObject(unitRow?.['unit_json']);
  const metaJson = parseJsonObject(unitRow?.['meta_json']);
  const locatorLabel =
    readOptionalString(unitJson?.['locatorLabel']) ||
    readOptionalString(unitJson?.['locator_label']) ||
    readOptionalString(metaJson?.['locatorLabel']) ||
    joinLocator(readOptionalString(unitRow?.['start_ref']), readOptionalString(unitRow?.['end_ref']));

  return {
    source_id: sourceId,
    source_title: sourceTitle,
    unit_id: unitId,
    unit_title: unitTitle,
    subunit_id: subunitId,
    subunit_title: subunitTitle,
    selected_unit_id: sourceUnitId,
    locator_label: locatorLabel,
  };
}

export function mapSuggestionRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: readTrimmed(row['id']),
    batch_id: readTrimmed(row['batch_id']),
    suggestion_type: readTrimmed(row['suggestion_type']),
    payload_json: parseJsonObject(row['payload_json']),
    confidence: readNumber(row['confidence']),
    rationale: readOptionalString(row['rationale']),
    status: readTrimmed(row['status']),
    meta_json: parseJsonObject(row['meta_json']),
    created_at: readTrimmed(row['created_at']),
    updated_at: readOptionalString(row['updated_at']),
  };
}

export function mapDecisionRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: readNumber(row['id']),
    suggestion_id: readTrimmed(row['suggestion_id']),
    decision: readTrimmed(row['decision']),
    target_type: readOptionalString(row['target_type']),
    target_id: readOptionalString(row['target_id']),
    edited_payload_json: parseJsonObject(row['edited_payload_json']),
    note: readOptionalString(row['note']),
    created_at: readTrimmed(row['created_at']),
    updated_at: readOptionalString(row['updated_at']),
  };
}

function normalizeNode(
  value: unknown,
  index: number,
  context: {
    batchId: string;
    sourceId: string;
    sourceUnitId: string;
    locatorLabel: string | null;
    workspaceId: string;
    groupId: string | null;
    userId: number;
  },
  usedIds: Set<string>,
  idMap: Map<string, string>,
): DistillNodeDraft | null {
  const row = asRecord(value);
  const title = sanitizeSentence(row?.['title'], 120);
  const summary = sanitizeSentence(row?.['summary'], 220);
  if (!title || !summary) {
    return null;
  }

  const rawId = readOptionalString(row?.['id']);
  const slug = slugify(readOptionalString(row?.['slug']) || title, `node-${index + 1}`);
  const nodeType = normalizeNodeType(row?.['node_type']) ?? 'concept';
  const idPrefix = buildWorldviewNodeIdPrefix(row, context);
  let localKey = buildWorldviewNodeLocalKey(rawId, idPrefix, nodeType, slug, index);
  let id = `wv_node_${idPrefix}_${localKey}`;
  if (usedIds.has(id)) {
    localKey = `${localKey}-${String(index + 1).padStart(2, '0')}`;
    id = `wv_node_${idPrefix}_${localKey}`;
  }

  usedIds.add(id);
  if (rawId) {
    idMap.set(rawId, id);
  }
  idMap.set(id, id);

  return {
    id,
    canonical_input: `wv_node:${idPrefix}:${localKey}`,
    workspace_id: context.workspaceId,
    group_id: context.groupId,
    user_id: context.userId,
    node_type: nodeType,
    title,
    text_plain: sanitizeSentence(row?.['text_plain'], 420) || summary,
    summary,
    slug,
    status: 'active',
    data_json: parseJsonObject(row?.['data_json']) ?? {},
    meta_json: {
      ...(parseJsonObject(row?.['meta_json']) ?? {}),
      batch_id: context.batchId,
      source_id: context.sourceId,
      source_unit_id: context.sourceUnitId,
      order_index: index + 1,
      node_id_prefix: idPrefix,
      ...(rawId ? { local_node_id: rawId } : {}),
    },
  };
}

function normalizeEdge(
  value: unknown,
  index: number,
  context: { batchId: string; workspaceId: string; groupId: string | null },
  nodeIds: Set<string>,
  nodeIdMap: Map<string, string>,
): DistillEdgeDraft | null {
  const row = asRecord(value);
  const fromNodeId = resolveMappedId(readOptionalString(row?.['from_node_id']), nodeIdMap);
  const toNodeId = resolveMappedId(readOptionalString(row?.['to_node_id']), nodeIdMap);
  if (!fromNodeId || !toNodeId || !nodeIds.has(fromNodeId) || !nodeIds.has(toNodeId)) {
    return null;
  }

  const relationType = normalizeEdgeType(row?.['relation_type']) ?? 'related_to';
  const id = readOptionalString(row?.['id']) || `wv_edge_${context.batchId.slice(-8)}_${index + 1}`;
  return {
    id,
    canonical_input:
      readOptionalString(row?.['canonical_input']) || `wv_edge:${context.batchId}:${fromNodeId}:${relationType}:${toNodeId}`,
    workspace_id: context.workspaceId,
    group_id: context.groupId,
    from_node_id: fromNodeId,
    to_node_id: toNodeId,
    relation_type: relationType,
    strength: clampStrength(row?.['strength']),
    order_index: index + 1,
    note: sanitizeSentence(row?.['note'], 240),
    meta_json: {
      ...(parseJsonObject(row?.['meta_json']) ?? {}),
      batch_id: context.batchId,
      order_index: index + 1,
    },
  };
}

function normalizeDocument(
  value: unknown,
  context: {
    batchId: string;
    sourceId: string;
    sourceUnitId: string;
    sourceTitle: string;
    unitTitle: string;
    workspaceId: string;
    groupId: string | null;
    userId: number;
  },
  relatedNodeId: string | null,
): DistillDocumentDraft | null {
  const row = asRecord(value);
  const title =
    sanitizeSentence(row?.['title'], 140) || `${context.sourceTitle} ${context.unitTitle} Study Note`;
  const summary = sanitizeSentence(row?.['summary'], 240) || `Study note derived from ${context.unitTitle}.`;
  const docId = readOptionalString(row?.['id']) || `wv_doc_${slugify(context.sourceUnitId, 'doc')}_${context.batchId.slice(-8)}`;

  return {
    id: docId,
    canonical_input:
      readOptionalString(row?.['canonical_input']) || `wv_document:${context.sourceUnitId}:study-note:${context.batchId.slice(-8)}`,
    workspace_id: context.workspaceId,
    group_id: context.groupId,
    user_id: context.userId,
    doc_type: 'study_note',
    title,
    summary,
    cover_image_url: null,
    status: 'active',
    related_node_id: relatedNodeId,
    document_json: {
      ...(parseJsonObject(row?.['document_json']) ?? {}),
      source_id: context.sourceId,
      source_unit_id: context.sourceUnitId,
    },
    meta_json: {
      ...(parseJsonObject(row?.['meta_json']) ?? {}),
      batch_id: context.batchId,
    },
  };
}

function normalizeBlock(
  value: unknown,
  index: number,
  context: { batchId: string; workspaceId: string; groupId: string | null; userId: number },
  documentId: string,
): DistillDocumentBlockDraft | null {
  const row = asRecord(value);
  const blockType = normalizeBlockType(row?.['block_type']) ?? (index === 0 ? 'heading' : 'paragraph');
  const textPlain = sanitizeSentence(row?.['text_plain'], 1_500) || sanitizeSentence(asRecord(row?.['content_json'])?.['text'], 1_500);
  if (!textPlain && blockType !== 'divider') {
    return null;
  }

  const id = readOptionalString(row?.['id']) || `wv_block_${context.batchId.slice(-8)}_${String(index + 1).padStart(3, '0')}`;
  return {
    id,
    canonical_input:
      readOptionalString(row?.['canonical_input']) || `wv_document_block:${context.batchId}:${String(index + 1).padStart(3, '0')}`,
    workspace_id: context.workspaceId,
    group_id: context.groupId,
    user_id: context.userId,
    document_id: documentId,
    parent_block_id: readOptionalString(row?.['parent_block_id']),
    order_index: index + 1,
    block_type: blockType,
    block_level: clampLevel(row?.['block_level']),
    text_plain: textPlain,
    content_json: parseJsonObject(row?.['content_json']) ?? (textPlain ? { text: textPlain } : null),
    attrs_json: parseJsonObject(row?.['attrs_json']) ?? {},
    meta_json: {
      ...(parseJsonObject(row?.['meta_json']) ?? {}),
      batch_id: context.batchId,
      order_index: index + 1,
    },
  };
}

function normalizeBlockNodeLink(
  value: unknown,
  index: number,
  context: { batchId: string; workspaceId: string; groupId: string | null; userId: number },
  blockIds: Set<string>,
  nodeIds: Set<string>,
  nodeIdMap: Map<string, string>,
): DistillBlockNodeLinkDraft | null {
  const row = asRecord(value);
  const blockId = readOptionalString(row?.['block_id']);
  const nodeId = resolveMappedId(readOptionalString(row?.['node_id']), nodeIdMap);
  if (!blockId || !nodeId || !blockIds.has(blockId) || !nodeIds.has(nodeId)) {
    return null;
  }

  const relation = normalizeBlockRelation(row?.['relation']) ?? 'mentions';
  const id = readOptionalString(row?.['id']) || `wv_bnl_${context.batchId.slice(-8)}_${index + 1}`;
  return {
    id,
    canonical_input:
      readOptionalString(row?.['canonical_input']) || `wv_block_node_link:${context.batchId}:${blockId}:${relation}:${nodeId}`,
    workspace_id: context.workspaceId,
    group_id: context.groupId,
    user_id: context.userId,
    block_id: blockId,
    node_id: nodeId,
    relation,
  };
}

function normalizePodcastEpisode(
  value: unknown,
  context: {
    batchId: string;
    sourceUnitId: string;
    sourceTitle: string;
    unitTitle: string;
  },
): DistillPodcastEpisodeDraft {
  const row = asRecord(value);
  return {
    id: readOptionalString(row?.['id']) || `wv_podcast_${context.batchId.slice(-8)}`,
    source_unit_id: context.sourceUnitId,
    title:
      sanitizeSentence(row?.['title'], 160) || `${context.sourceTitle} ${context.unitTitle} Episode`,
    hook: sanitizeSentence(row?.['hook'], 500) || '',
    intro: sanitizeSentence(row?.['intro'], 1_200) || '',
    main_points: readArray(row?.['main_points'])
      .map((entry) => sanitizeSentence(entry, 500))
      .filter((entry): entry is string => Boolean(entry)),
    closing: sanitizeSentence(row?.['closing'], 1_200) || '',
  };
}

function normalizeNodeType(value: unknown): DistillNodeType | null {
  const normalized = readOptionalString(value)?.toLowerCase() as DistillNodeType | undefined;
  return normalized && NODE_TYPES.has(normalized) ? normalized : null;
}

function normalizeEdgeType(value: unknown): DistillEdgeType | null {
  const normalized = readOptionalString(value)?.toLowerCase() as DistillEdgeType | undefined;
  return normalized && EDGE_TYPES.has(normalized) ? normalized : null;
}

function normalizeBlockType(value: unknown): DistillBlockType | null {
  const normalized = readOptionalString(value)?.toLowerCase() as DistillBlockType | undefined;
  return normalized && BLOCK_TYPES.has(normalized) ? normalized : null;
}

function normalizeBlockRelation(value: unknown): DistillBlockRelation | null {
  const normalized = readOptionalString(value)?.toLowerCase() as DistillBlockRelation | undefined;
  return normalized && BLOCK_RELATIONS.has(normalized) ? normalized : null;
}

function buildWorldviewNodeIdPrefix(
  row: Record<string, unknown> | null,
  context: {
    sourceUnitId: string;
    locatorLabel: string | null;
  },
): string {
  const dataJson = parseJsonObject(row?.['data_json']);
  const metaJson = parseJsonObject(row?.['meta_json']);
  const candidates = [
    readOptionalString(row?.['passage_ref']),
    readOptionalString(dataJson?.['passage_ref']),
    readOptionalString(metaJson?.['passage_ref']),
    context.locatorLabel,
    extractPassageRefFromSourceUnitId(context.sourceUnitId),
  ];

  for (const candidate of candidates) {
    const prefix = normalizeWorldviewScopePrefix(candidate);
    if (prefix) {
      return prefix;
    }
  }

  return `su_${slugify(context.sourceUnitId, 'source-unit')}`;
}

function buildWorldviewNodeLocalKey(
  rawId: string | null,
  idPrefix: string,
  nodeType: DistillNodeType,
  slug: string,
  index: number,
): string {
  if (!rawId) {
    return `${nodeType}-${slug}`;
  }

  const expectedPrefix = `wv_node_${idPrefix}_`;
  if (rawId.startsWith(expectedPrefix)) {
    return rawId.slice(expectedPrefix.length) || `${nodeType}-${slug}`;
  }

  return slugify(rawId, `${nodeType}-${index + 1}`);
}

function extractPassageRefFromSourceUnitId(sourceUnitId: string): string | null {
  const match = sourceUnitId
    .trim()
    .toLowerCase()
    .match(/(?:^|[_-])q(\d+)[_-](\d+)(?:[_-](\d+))?(?:$|[_-])/);
  if (!match) {
    return null;
  }

  const [, surah, ayahFrom, ayahTo] = match;
  return ayahTo ? `${surah}:${ayahFrom}-${ayahTo}` : `${surah}:${ayahFrom}`;
}

function normalizeWorldviewScopePrefix(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/\s+/g, '');
  const refMatch = compact.match(/^(\d+):(\d+)(?:[-–](\d+))?$/);
  if (refMatch) {
    const [, surah, ayahFrom, ayahTo] = refMatch;
    return ayahTo ? `qs${surah}_${ayahFrom}_${ayahTo}` : `qs${surah}_${ayahFrom}`;
  }

  const slug = slugify(compact, '');
  return slug ? `ref_${slug}` : null;
}

function resolveMappedId(value: string | null, idMap: Map<string, string>): string | null {
  if (!value) {
    return null;
  }

  return idMap.get(value) ?? value;
}

function parseDistillOutput(value: unknown): DistillOutputDraft | null {
  const row = parseJsonObject(value);
  if (!row) {
    return null;
  }

  const nodes = readArray(row['wv_nodes']).map((entry) => entry).filter(Boolean) as DistillNodeDraft[];
  const edges = readArray(row['wv_node_edges']).map((entry) => entry).filter(Boolean) as DistillEdgeDraft[];
  const documents = readArray(row['wv_documents']).map((entry) => entry).filter(Boolean) as DistillDocumentDraft[];
  const blocks = readArray(row['wv_document_blocks']).map((entry) => entry).filter(Boolean) as DistillDocumentBlockDraft[];
  const links = readArray(row['wv_block_node_links']).map((entry) => entry).filter(Boolean) as DistillBlockNodeLinkDraft[];
  const podcast = asRecord(row['podcast_episode']) as DistillPodcastEpisodeDraft | null;
  if (!podcast) {
    return null;
  }

  return {
    wv_nodes: nodes,
    wv_node_edges: edges,
    wv_documents: documents,
    wv_document_blocks: blocks,
    wv_block_node_links: links,
    podcast_episode: podcast,
  };
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sanitizeSentence(value: unknown, maxLength: number): string | null {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text) {
    return null;
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function clampStrength(value: unknown): number | null {
  const numeric = readNumber(value);
  if (numeric == null) {
    return null;
  }
  return Math.max(0, Math.min(1, numeric));
}

function clampLevel(value: unknown): number | null {
  const numeric = readNumber(value);
  if (numeric == null) {
    return null;
  }
  return Math.max(1, Math.min(6, Math.trunc(numeric)));
}

function joinLocator(startRef: string | null, endRef: string | null): string | null {
  if (startRef && endRef && startRef !== endRef) {
    return `${startRef} - ${endRef}`;
  }

  return startRef || endRef || null;
}

export function slugify(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

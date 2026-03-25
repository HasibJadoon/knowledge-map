#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const TABLE_CONFIGS = [
  {
    key: 'wv_sources',
    table: 'wv_sources',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'source_type',
      'title',
      'subtitle',
      'description',
      'creator',
      'publisher',
      'publication_year',
      'language',
      'source_url',
      'source_ref',
      'status',
      'source_json',
      'meta_json',
    ],
  },
  {
    key: 'wv_source_units',
    table: 'wv_source_units',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'source_id',
      'parent_unit_id',
      'unit_type',
      'title',
      'order_index',
      'start_ref',
      'end_ref',
      'anchor_text',
      'summary',
      'unit_json',
      'meta_json',
    ],
  },
  {
    key: 'wv_people',
    table: 'wv_people',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'display_name',
      'sort_name',
      'person_type',
      'bio_short',
      'website_url',
      'meta_json',
    ],
  },
  {
    key: 'wv_source_people',
    table: 'wv_source_people',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'source_id',
      'person_id',
      'role',
      'order_index',
      'is_primary',
      'note',
      'meta_json',
    ],
  },
  {
    key: 'wv_source_details',
    table: 'wv_source_details',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'source_id',
      'detail_key',
      'detail_value',
      'order_index',
      'meta_json',
    ],
  },
  {
    key: 'wv_reading_sessions',
    table: 'wv_reading_sessions',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'source_id',
      'source_unit_id',
      'session_type',
      'started_at',
      'ended_at',
      'focus_mode',
      'last_position',
      'status',
      'session_json',
      'meta_json',
    ],
  },
  {
    key: 'wv_highlights',
    table: 'wv_highlights',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'source_id',
      'source_unit_id',
      'session_id',
      'locator',
      'anchor_text',
      'selected_text',
      'start_offset',
      'end_offset',
      'color',
      'meta_json',
    ],
  },
  {
    key: 'wv_notes',
    table: 'wv_notes',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'source_id',
      'source_unit_id',
      'session_id',
      'highlight_id',
      'note_kind',
      'title',
      'body_md',
      'excerpt_text',
      'locator',
      'status',
      'note_json',
      'meta_json',
    ],
  },
  {
    key: 'wv_note_relations',
    table: 'wv_note_relations',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'note_id',
      'target_type',
      'target_id',
      'relation',
      'note',
      'meta_json',
    ],
  },
  {
    key: 'wv_distill_batches',
    table: 'wv_distill_batches',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'batch_type',
      'title',
      'instructions_md',
      'status',
      'batch_json',
      'meta_json',
    ],
  },
  {
    key: 'wv_distill_batch_items',
    table: 'wv_distill_batch_items',
    columns: ['workspace_id', 'batch_id', 'item_type', 'item_id', 'order_index', 'role'],
    conflictColumns: ['batch_id', 'item_type', 'item_id'],
    hasUpdatedAt: false,
  },
  {
    key: 'wv_insight_suggestions',
    table: 'wv_insight_suggestions',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'batch_id',
      'user_id',
      'suggestion_type',
      'payload_json',
      'confidence',
      'rationale',
      'status',
      'meta_json',
    ],
  },
  {
    key: 'wv_nodes',
    table: 'wv_nodes',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'node_type',
      'title',
      'text_plain',
      'summary',
      'slug',
      'status',
      'data_json',
      'meta_json',
    ],
  },
  {
    key: 'wv_node_edges',
    table: 'wv_node_edges',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'from_node_id',
      'to_node_id',
      'relation_type',
      'strength',
      'order_index',
      'note',
      'meta_json',
    ],
  },
  {
    key: 'wv_evidence_links',
    table: 'wv_evidence_links',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'source_type',
      'source_id',
      'target_node_id',
      'relation',
      'evidence_text',
      'locator',
      'note',
      'meta_json',
    ],
  },
  {
    key: 'wv_node_quran_links',
    table: 'wv_node_quran_links',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'node_id',
      'target_type',
      'target_ref',
      'relation',
      'quran_evidence_json',
      'note',
    ],
  },
  {
    key: 'wv_documents',
    table: 'wv_documents',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'doc_type',
      'title',
      'summary',
      'cover_image_url',
      'status',
      'related_node_id',
      'document_json',
      'meta_json',
    ],
  },
  {
    key: 'wv_document_blocks',
    table: 'wv_document_blocks',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'document_id',
      'parent_block_id',
      'order_index',
      'block_type',
      'block_level',
      'text_plain',
      'content_json',
      'attrs_json',
    ],
  },
  {
    key: 'wv_block_node_links',
    table: 'wv_block_node_links',
    columns: [
      'id',
      'canonical_input',
      'workspace_id',
      'group_id',
      'user_id',
      'block_id',
      'node_id',
      'relation',
    ],
  },
];

const args = process.argv.slice(2);
const inputPath = readFlagValue(args, '--input');
const outputPath =
  readFlagValue(args, '--output') ??
  path.join('database', 'migrations', '2026-03-15_seed_wv_full_flow_q12_1_7.sql');

if (!inputPath) {
  printUsage();
  process.exit(1);
}

const absoluteInput = path.resolve(process.cwd(), inputPath);
const absoluteOutput = path.resolve(process.cwd(), outputPath);
const payload = JSON.parse(fs.readFileSync(absoluteInput, 'utf8'));

const sql = buildSeedSql(payload, path.relative(process.cwd(), absoluteInput).replace(/\\/g, '/'));

fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
fs.writeFileSync(absoluteOutput, sql, 'utf8');

console.log(`Wrote worldview seed SQL to ${absoluteOutput}`);

function printUsage() {
  console.error(
    [
      'Usage:',
      '  node scripts/seed-worldview-flow.mjs --input <seed.json> [--output <seed.sql>]',
    ].join('\n'),
  );
}

function readFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1 || index === argv.length - 1) {
    return null;
  }

  return argv[index + 1];
}

function buildSeedSql(payload, sourceLabel) {
  assertRequired(payload, ['seed_type', 'version', 'workspace_id', 'group_id']);

  const lines = [
    `-- Auto-generated worldview flow seed`,
    `-- Seed type: ${payload.seed_type}`,
    `-- Version: ${payload.version}`,
    `-- Source: ${sourceLabel}`,
    '',
    'PRAGMA foreign_keys = ON;',
    '',
  ];

  const workspaceMeta = {
    seed_type: payload.seed_type,
    seed_version: payload.version,
  };
  const workspaceId = String(payload.workspace_id);
  const groupId = String(payload.group_id);
  const userId = payload.user_id ?? null;
  const workspaceSlug = toSlug(workspaceId, 'ws_');
  const groupSlug = toSlug(groupId, 'grp_');

  lines.push(
    buildUpsertStatement(
      'workspaces',
      [
        'id',
        'canonical_input',
        'slug',
        'title',
        'description',
        'workspace_type',
        'owner_user_id',
        'status',
        'settings_json',
        'meta_json',
      ],
      {
        id: workspaceId,
        canonical_input: `workspace:${workspaceId}`,
        slug: workspaceSlug,
        title: payload.workspace_title ?? `${toTitleCase(workspaceSlug)} Workspace`,
        description:
          payload.workspace_description ??
          'Workspace seeded for worldview study and distillation flows.',
        workspace_type: payload.workspace_type ?? 'personal',
        owner_user_id: userId,
        status: 'active',
        settings_json: payload.workspace_settings_json ?? {},
        meta_json: { ...workspaceMeta, origin: 'seed-worldview-flow' },
      },
      { conflictColumns: ['id'] },
    ),
  );

  if (userId != null) {
    lines.push(
      buildUpsertStatement(
        'workspace_members',
        [
          'workspace_id',
          'user_id',
          'membership_role',
          'status',
          'settings_json',
          'meta_json',
        ],
        {
          workspace_id: workspaceId,
          user_id: userId,
          membership_role: 'owner',
          status: 'active',
          settings_json: {},
          meta_json: { ...workspaceMeta, origin: 'seed-worldview-flow' },
        },
        { conflictColumns: ['workspace_id', 'user_id'] },
      ),
    );
  }

  lines.push(
    buildUpsertStatement(
      'workspace_groups',
      [
        'id',
        'canonical_input',
        'workspace_id',
        'title',
        'slug',
        'group_type',
        'description',
        'status',
        'order_index',
        'settings_json',
        'meta_json',
      ],
      {
        id: groupId,
        canonical_input: `workspace_group:${workspaceId}:${groupId}`,
        workspace_id: workspaceId,
        title: payload.group_title ?? toTitleCase(groupSlug),
        slug: groupSlug,
        group_type: payload.group_type ?? 'general',
        description:
          payload.group_description ?? 'Group seeded for worldview study flow data.',
        status: 'active',
        order_index: 1,
        settings_json: {},
        meta_json: { ...workspaceMeta, origin: 'seed-worldview-flow' },
      },
      { conflictColumns: ['id'] },
    ),
  );

  if (userId != null) {
    lines.push(
      buildUpsertStatement(
        'workspace_group_members',
        ['workspace_id', 'group_id', 'user_id', 'status'],
        {
          workspace_id: workspaceId,
          group_id: groupId,
          user_id: userId,
          status: 'active',
        },
        { conflictColumns: ['workspace_id', 'group_id', 'user_id'] },
      ),
    );
  }

  lines.push('');

  for (const config of TABLE_CONFIGS) {
    const rows = Array.isArray(payload[config.key]) ? payload[config.key] : [];
    if (!rows.length) {
      continue;
    }

    lines.push(`-- ${config.table}`);
    for (const row of rows) {
      lines.push(
        buildUpsertStatement(config.table, config.columns, row, {
          conflictColumns: config.conflictColumns ?? ['id'],
          hasUpdatedAt: config.hasUpdatedAt ?? true,
        }),
      );
    }
    lines.push('');
  }

  const decisions = Array.isArray(payload.wv_insight_decisions) ? payload.wv_insight_decisions : [];
  if (decisions.length) {
    const suggestionList = decisions
      .map((decision) => sqlQuote(decision.suggestion_id))
      .join(', ');

    lines.push('-- wv_insight_decisions');
    lines.push(
      `DELETE FROM wv_insight_decisions WHERE suggestion_id IN (${suggestionList})${userId == null ? '' : ` AND user_id = ${sqlQuote(userId)}`};`,
    );

    for (const decision of decisions) {
      lines.push(
        buildInsertStatement(
          'wv_insight_decisions',
          [
            'workspace_id',
            'group_id',
            'suggestion_id',
            'user_id',
            'decision',
            'target_type',
            'target_id',
            'edited_payload_json',
            'note',
          ],
          decision,
        ),
      );
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function buildUpsertStatement(table, columns, row, options = {}) {
  const conflictColumns = options.conflictColumns ?? ['id'];
  const hasUpdatedAt = options.hasUpdatedAt ?? true;
  const insertColumns = columns.join(', ');
  const insertValues = columns.map((column) => sqlQuote(row[column])).join(', ');
  const updateAssignments = columns
    .filter((column) => !conflictColumns.includes(column))
    .map((column) => `${column} = excluded.${column}`);

  if (hasUpdatedAt) {
    updateAssignments.push(`updated_at = datetime('now')`);
  }

  return `INSERT INTO ${table} (${insertColumns}) VALUES (${insertValues}) ON CONFLICT(${conflictColumns.join(', ')}) DO UPDATE SET ${updateAssignments.join(', ')};`;
}

function buildInsertStatement(table, columns, row) {
  const insertColumns = columns.join(', ');
  const insertValues = columns.map((column) => sqlQuote(row[column])).join(', ');
  return `INSERT INTO ${table} (${insertColumns}) VALUES (${insertValues});`;
}

function sqlQuote(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  if (typeof value === 'object') {
    const text = JSON.stringify(value);
    return `'${text.replace(/'/g, "''")}'`;
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function toSlug(value, prefix) {
  const normalized = String(value).startsWith(prefix) ? String(value).slice(prefix.length) : String(value);
  return normalized.replace(/_/g, '-').toLowerCase();
}

function toTitleCase(value) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function assertRequired(payload, keys) {
  for (const key of keys) {
    if (!(key in payload)) {
      throw new Error(`Missing required seed key: ${key}`);
    }
  }
}

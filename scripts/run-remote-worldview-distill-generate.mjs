#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputDir = resolve(repoRoot, 'tmp');

const DEFAULT_BASE_URL = 'https://api.k-maps.com';
const DEFAULT_SOURCE_BATCH_ID = 'wv_distill_q12_1_7';
const DEFAULT_MODEL = 'gpt-5-mini';
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_OUTPUT_TOKENS = 4000;

const args = parseArgs(process.argv.slice(2));
const baseUrl = args.baseUrl ?? DEFAULT_BASE_URL;
const sourceBatchId = args.sourceBatchId ?? DEFAULT_SOURCE_BATCH_ID;
const approveAfterGenerate = args.approve !== false;

const fixture = {
  suffix: buildSuffix(),
  userId: null,
  userEmail: '',
  userPassword: 'CodexDistillPass!2026',
  sourceId: '',
  chapterUnitId: '',
  passageUnitId: '',
  batchId: '',
  highlightIds: new Map(),
  noteIds: new Map(),
};

let latestReportPath = null;

try {
  const sourceScope = getSingleRow(
    d1Json(
      `SELECT
         s.id AS source_id,
         s.workspace_id,
         s.group_id,
         u.id AS source_unit_id,
         u.parent_unit_id AS parent_unit_id
       FROM wv_distill_batches b
       INNER JOIN wv_sources s ON s.id = json_extract(b.batch_json, '$.source_id')
       INNER JOIN wv_source_units u ON u.id = json_extract(b.batch_json, '$.source_unit_id')
       WHERE b.id = ${sqlLiteral(sourceBatchId)}
       LIMIT 1`
    )
  );
  if (!sourceScope?.source_id || !sourceScope?.source_unit_id || !sourceScope?.parent_unit_id) {
    throw new Error(`Source scope for batch ${sourceBatchId} could not be resolved.`);
  }

  const sourceItems = getRows(
    d1Json(
      `SELECT item_type, item_id, role, order_index
       FROM wv_distill_batch_items
       WHERE batch_id = ${sqlLiteral(sourceBatchId)}
       ORDER BY order_index ASC`
    )
  );
  if (!sourceItems.length) {
    throw new Error(`No distill items were found for source batch ${sourceBatchId}.`);
  }

  fixture.userEmail = `codex.distill.persist.${fixture.suffix}@example.com`;
  fixture.sourceId = `wv_src_q12_codex_${fixture.suffix}`;
  fixture.chapterUnitId = `wv_unit_q12_codex_${fixture.suffix}`;
  fixture.passageUnitId = `wv_unit_q12_1_7_codex_${fixture.suffix}`;
  fixture.batchId = `wv_distill_q12_1_7_codex_${fixture.suffix}`;

  const passwordHash = await hashPassword(fixture.userPassword);
  const insertedUser = getSingleRow(
    d1Json(
      `INSERT INTO users (email, password_hash, role, created_at, updated_at)
       VALUES (
         ${sqlLiteral(fixture.userEmail)},
         ${sqlLiteral(passwordHash)},
         'admin',
         CURRENT_TIMESTAMP,
         CURRENT_TIMESTAMP
       )
       RETURNING id, email`
    )
  );
  if (typeof insertedUser?.id !== 'number') {
    throw new Error('Failed to create the temporary remote user.');
  }
  fixture.userId = insertedUser.id;

  duplicateSource(sourceScope.source_id);
  duplicateUnit(sourceScope.parent_unit_id, fixture.chapterUnitId, fixture.sourceId, null);
  duplicateUnit(sourceScope.source_unit_id, fixture.passageUnitId, fixture.sourceId, fixture.chapterUnitId);

  for (const item of sourceItems) {
    if (item.item_type !== 'highlight') {
      continue;
    }
    const newId = `${item.item_id}_codex_${fixture.suffix}`;
    fixture.highlightIds.set(item.item_id, newId);
    duplicateHighlight(item.item_id, newId);
  }

  for (const item of sourceItems) {
    if (item.item_type !== 'note') {
      continue;
    }
    const newId = `${item.item_id}_codex_${fixture.suffix}`;
    fixture.noteIds.set(item.item_id, newId);
    duplicateNote(item.item_id, newId);
  }

  const loginPayload = await postJson(`${baseUrl}/login`, {
    email: fixture.userEmail,
    password: fixture.userPassword,
  });
  const token = typeof loginPayload?.token === 'string' ? loginPayload.token : null;
  if (!token) {
    throw new Error(`Remote login failed: ${JSON.stringify(loginPayload)}`);
  }

  const generatePayload = await postJson(
    `${baseUrl}/worldview/distill/generate`,
    {
      batchId: fixture.batchId,
      sourceId: fixture.sourceId,
      sourceUnitId: fixture.passageUnitId,
      items: sourceItems.map((item) => ({
        itemId:
          item.item_type === 'highlight'
            ? fixture.highlightIds.get(item.item_id)
            : fixture.noteIds.get(item.item_id),
        role: item.role ?? null,
      })),
      model: args.model ?? DEFAULT_MODEL,
      temperature: args.temperature ?? DEFAULT_TEMPERATURE,
      maxOutputTokens: args.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    },
    token
  );

  let approvePayload = null;
  if (approveAfterGenerate) {
    approvePayload = await postJson(
      `${baseUrl}/worldview/distill/approve`,
      {
        batchId: fixture.batchId,
      },
      token
    );
  }

  const batchRow = getSingleRow(
    d1Json(
      `SELECT
         id,
         status,
         json_extract(meta_json, '$.prompt_version') AS prompt_version,
         json_extract(meta_json, '$.model') AS model,
         json_extract(meta_json, '$.generated_at') AS generated_at
       FROM wv_distill_batches
       WHERE id = ${sqlLiteral(fixture.batchId)}
       LIMIT 1`
    )
  );

  const podcastRows = getRows(
    d1Json(
      `SELECT
         id,
         title,
         content_type,
         status,
         related_type,
         related_id,
         json_extract(content_json, '$.batch_id') AS batch_id,
         json_extract(content_json, '$.topic') AS topic
       FROM wv_content_items
       WHERE related_id = ${sqlLiteral(fixture.passageUnitId)}
          OR json_extract(content_json, '$.batch_id') = ${sqlLiteral(fixture.batchId)}
       ORDER BY created_at DESC`
    )
  );

  const committedCounts = {
    nodes: countSingle(
      `SELECT COUNT(*) AS count
       FROM wv_nodes
       WHERE json_extract(meta_json, '$.batch_id') = ${sqlLiteral(fixture.batchId)}`
    ),
    edges: countSingle(
      `SELECT COUNT(*) AS count
       FROM wv_node_edges
       WHERE json_extract(meta_json, '$.batch_id') = ${sqlLiteral(fixture.batchId)}`
    ),
    documents: countSingle(
      `SELECT COUNT(*) AS count
       FROM wv_documents
       WHERE json_extract(meta_json, '$.batch_id') = ${sqlLiteral(fixture.batchId)}`
    ),
    blocks: countSingle(
      `SELECT COUNT(*) AS count
       FROM wv_document_blocks
       WHERE document_id IN (
         SELECT id
         FROM wv_documents
         WHERE json_extract(meta_json, '$.batch_id') = ${sqlLiteral(fixture.batchId)}
       )`
    ),
    links: countSingle(
      `SELECT COUNT(*) AS count
       FROM wv_block_node_links
       WHERE block_id IN (
         SELECT b.id
         FROM wv_document_blocks b
         INNER JOIN wv_documents d ON d.id = b.document_id
         WHERE json_extract(d.meta_json, '$.batch_id') = ${sqlLiteral(fixture.batchId)}
       )`
    ),
  };

  const report = {
    ok: true,
    base_url: baseUrl,
    source_batch_id: sourceBatchId,
    generated_batch_id: fixture.batchId,
    temp_user: {
      id: fixture.userId,
      email: fixture.userEmail,
      password: fixture.userPassword,
    },
    remote_fixture: {
      source_id: fixture.sourceId,
      chapter_unit_id: fixture.chapterUnitId,
      passage_unit_id: fixture.passageUnitId,
      highlight_ids: Object.fromEntries(fixture.highlightIds.entries()),
      note_ids: Object.fromEntries(fixture.noteIds.entries()),
    },
    requested_generation: {
      model: args.model ?? DEFAULT_MODEL,
      temperature: args.temperature ?? DEFAULT_TEMPERATURE,
      max_output_tokens: args.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    },
    generate_result: {
      model: generatePayload?.model ?? null,
      prompt_version: generatePayload?.prompt_version ?? null,
      usage: generatePayload?.usage ?? null,
      suggestion_count: Array.isArray(generatePayload?.suggestions) ? generatePayload.suggestions.length : 0,
      item_count: Array.isArray(generatePayload?.items) ? generatePayload.items.length : 0,
    },
    approve_result: approvePayload
      ? {
          committed_counts: approvePayload?.committed_counts ?? null,
          batch_status: approvePayload?.batch?.status ?? null,
        }
      : null,
    remote_db_state: {
      batch: batchRow,
      podcast_rows: podcastRows,
      committed_counts: committedCounts,
    },
    draft_output: generatePayload?.draft_output ?? null,
  };

  mkdirSync(outputDir, { recursive: true });
  latestReportPath = resolve(outputDir, `remote-worldview-distill-generate-${fixture.suffix}.json`);
  writeFileSync(latestReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const failure = {
    ok: false,
    error: message,
    base_url: baseUrl,
    source_batch_id: sourceBatchId,
    generated_batch_id: fixture.batchId || null,
    temp_user: {
      id: fixture.userId,
      email: fixture.userEmail || null,
      password: fixture.userPassword,
    },
    remote_fixture: {
      source_id: fixture.sourceId || null,
      chapter_unit_id: fixture.chapterUnitId || null,
      passage_unit_id: fixture.passageUnitId || null,
    },
    report_path: latestReportPath,
  };
  process.stdout.write(`${JSON.stringify(failure, null, 2)}\n`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    baseUrl: null,
    sourceBatchId: null,
    model: null,
    temperature: null,
    maxOutputTokens: null,
    approve: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--base-url') {
      parsed.baseUrl = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (value === '--source-batch') {
      parsed.sourceBatchId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (value === '--model') {
      parsed.model = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (value === '--temperature') {
      parsed.temperature = readCliNumber(argv[index + 1]);
      index += 1;
      continue;
    }
    if (value === '--max-output-tokens') {
      parsed.maxOutputTokens = readCliNumber(argv[index + 1]);
      index += 1;
      continue;
    }
    if (value === '--no-approve') {
      parsed.approve = false;
    }
  }

  return parsed;
}

function duplicateSource(oldSourceId) {
  d1Json(`
    INSERT INTO wv_sources (
      id,
      canonical_input,
      workspace_id,
      group_id,
      user_id,
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
      meta_json
    )
    SELECT
      ${sqlLiteral(fixture.sourceId)},
      ${sqlLiteral(`wv_source:q12:codex:${fixture.suffix}`)},
      workspace_id,
      group_id,
      ${sqlLiteral(fixture.userId)},
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
      meta_json
    FROM wv_sources
    WHERE id = ${sqlLiteral(oldSourceId)}
  `);
}

function duplicateUnit(oldUnitId, newUnitId, newSourceId, parentUnitId) {
  d1Json(`
    INSERT INTO wv_source_units (
      id,
      canonical_input,
      workspace_id,
      group_id,
      user_id,
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
      meta_json
    )
    SELECT
      ${sqlLiteral(newUnitId)},
      ${sqlLiteral(`wv_source_unit:codex:${fixture.suffix}:${newUnitId}`)},
      workspace_id,
      group_id,
      ${sqlLiteral(fixture.userId)},
      ${sqlLiteral(newSourceId)},
      ${parentUnitId ? sqlLiteral(parentUnitId) : 'NULL'},
      unit_type,
      title,
      order_index,
      start_ref,
      end_ref,
      anchor_text,
      summary,
      unit_json,
      meta_json
    FROM wv_source_units
    WHERE id = ${sqlLiteral(oldUnitId)}
  `);
}

function duplicateHighlight(oldHighlightId, newHighlightId) {
  d1Json(`
    INSERT INTO wv_highlights (
      id,
      canonical_input,
      workspace_id,
      group_id,
      user_id,
      source_id,
      source_unit_id,
      session_id,
      locator,
      anchor_text,
      selected_text,
      start_offset,
      end_offset,
      color,
      meta_json
    )
    SELECT
      ${sqlLiteral(newHighlightId)},
      ${sqlLiteral(`wv_highlight:codex:${fixture.suffix}:${newHighlightId}`)},
      workspace_id,
      group_id,
      ${sqlLiteral(fixture.userId)},
      ${sqlLiteral(fixture.sourceId)},
      ${sqlLiteral(fixture.passageUnitId)},
      NULL,
      locator,
      anchor_text,
      selected_text,
      start_offset,
      end_offset,
      color,
      meta_json
    FROM wv_highlights
    WHERE id = ${sqlLiteral(oldHighlightId)}
  `);
}

function duplicateNote(oldNoteId, newNoteId) {
  const noteRow = getSingleRow(
    d1Json(
      `SELECT highlight_id
       FROM wv_notes
       WHERE id = ${sqlLiteral(oldNoteId)}
       LIMIT 1`
    )
  );
  const mappedHighlightId =
    typeof noteRow?.highlight_id === 'string'
      ? fixture.highlightIds.get(noteRow.highlight_id) ?? null
      : null;

  d1Json(`
    INSERT INTO wv_notes (
      id,
      canonical_input,
      workspace_id,
      group_id,
      user_id,
      source_id,
      source_unit_id,
      session_id,
      highlight_id,
      note_kind,
      title,
      body_md,
      excerpt_text,
      locator,
      status,
      note_json,
      meta_json
    )
    SELECT
      ${sqlLiteral(newNoteId)},
      ${sqlLiteral(`wv_note:codex:${fixture.suffix}:${newNoteId}`)},
      workspace_id,
      group_id,
      ${sqlLiteral(fixture.userId)},
      ${sqlLiteral(fixture.sourceId)},
      ${sqlLiteral(fixture.passageUnitId)},
      NULL,
      ${mappedHighlightId ? sqlLiteral(mappedHighlightId) : 'NULL'},
      note_kind,
      title,
      body_md,
      excerpt_text,
      locator,
      status,
      note_json,
      meta_json
    FROM wv_notes
    WHERE id = ${sqlLiteral(oldNoteId)}
  `);
}

function countSingle(sql) {
  const row = getSingleRow(d1Json(sql));
  return typeof row?.count === 'number' ? row.count : Number(row?.count ?? 0);
}

function readCliNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function postJson(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function wranglerJson(args) {
  try {
    const stdout = execFileSync('npx', ['wrangler', ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(stdout);
  } catch (error) {
    const stdout = error?.stdout ? String(error.stdout) : '';
    const stderr = error?.stderr ? String(error.stderr) : '';
    throw new Error(`Wrangler command failed.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }
}

function d1Json(sql) {
  return wranglerJson(['d1', 'execute', 'DB', '--remote', '--json', '--command', sql]);
}

function getRows(result) {
  return Array.isArray(result?.[0]?.results) ? result[0].results : [];
}

function getSingleRow(result) {
  const rows = getRows(result);
  return rows[0] ?? null;
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await webcrypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    key,
    256
  );
  return `PBKDF2$100000$${Buffer.from(salt).toString('base64')}$${Buffer.from(new Uint8Array(bits)).toString('base64')}`;
}

function sqlLiteral(value) {
  if (value == null) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSuffix() {
  const iso = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${iso}${rand}`;
}

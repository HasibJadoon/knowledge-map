#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputDir = resolve(repoRoot, 'tmp');

const DEFAULT_SOURCE_BATCH_ID = 'wv_distill_q12_1_7';
const DEFAULT_BASE_URL = 'https://api.k-maps.com';

const args = parseArgs(process.argv.slice(2));
const sourceBatchId = args.sourceBatchId ?? DEFAULT_SOURCE_BATCH_ID;
const baseUrl = args.baseUrl ?? DEFAULT_BASE_URL;
const keepUser = args.keepUser;
const requestedMaxOutputTokens = args.maxOutputTokens ?? 4000;
const requestedTemperature = args.temperature ?? 0.2;

const worldviewAnchors = [
  {
    key: 'clear_revelation',
    label: 'Clear revelation and intelligibility',
    test: (text) =>
      hasOne(text, ['quran', "qur'an", 'book', 'revelation']) &&
      hasOne(text, ['clear', 'clarity', 'intelligible', 'understand', 'reason', 'arabic']),
  },
  {
    key: 'best_story',
    label: 'Best of stories framing',
    test: (text) => hasOne(text, ['best']) && hasOne(text, ['story', 'stories', 'narrative']),
  },
  {
    key: 'discretion',
    label: 'Protective discretion',
    test: (text) => hasOne(text, ['discretion', 'protective', 'withhold', 'envy', 'audience', 'timing']),
  },
  {
    key: 'election_tawil',
    label: "Divine election and ta'wil",
    test: (text) => hasOne(text, ['chosen', 'election', "ta'wil", 'tawil', 'interpretation', 'favor']),
  },
  {
    key: 'signs_for_seekers',
    label: 'Signs for seekers',
    test: (text) =>
      hasOne(text, ['signs', 'sign']) &&
      hasOne(text, ['seekers', 'seeking', 'question', 'questions', 'ask', 'search']),
  },
];

const fixture = {
  suffix: buildSuffix(),
  userEmail: '',
  userPassword: 'CodexDistillPass!2026',
  userId: null,
};

let latestReportPath = null;
let latestRawOutput = null;

try {
  const passageContext = loadPassageContext(sourceBatchId);
  const canonicalNodes = loadCanonicalNodes();
  const promptContext = {
    batchId: sourceBatchId,
    workspaceId: passageContext.workspace_id,
    groupId: passageContext.group_id,
    userId: passageContext.user_id,
    sourceId: passageContext.source_id,
    sourceUnitId: passageContext.source_unit_id,
    sourceTitle: passageContext.source_title,
    unitTitle: passageContext.source_unit_title,
    locatorLabel: passageContext.locator_label,
    readingBody: passageContext.reading_body,
    highlights: passageContext.highlights,
    notes: passageContext.notes,
    compactPassageJson: true,
  };
  const prompt = buildDistillPrompt(promptContext);
  const testMessages = buildDistillTestMessages(promptContext);

  fixture.userEmail = `codex.distill.${fixture.suffix}@example.com`;
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
    throw new Error('Failed to create the temporary remote user for OpenAI testing.');
  }
  fixture.userId = insertedUser.id;

  const loginPayload = await postJson(`${baseUrl}/login`, {
    email: fixture.userEmail,
    password: fixture.userPassword,
  });
  const token = typeof loginPayload?.token === 'string' ? loginPayload.token : null;
  if (!token) {
    throw new Error(`Remote login failed: ${JSON.stringify(loginPayload)}`);
  }

  const openAiPayload = await postJson(
      `${baseUrl}/openai/test`,
      {
      prompt: testMessages.prompt,
      system: testMessages.system,
      maxOutputTokens: requestedMaxOutputTokens,
      temperature: requestedTemperature,
      model: args.model ?? null,
      },
    token
  );

  const rawOutput = readRequiredString(openAiPayload?.output_text, 'OpenAI test route did not return output_text.');
  latestRawOutput = rawOutput;
  const parsedDraft = parseGeneratedDraft(rawOutput);
  const evaluation = evaluateDraft(parsedDraft);

  const report = {
    ok: true,
    source_batch_id: sourceBatchId,
    base_url: baseUrl,
    temp_user: {
      email: fixture.userEmail,
      id: fixture.userId,
    },
    api_result: {
      response_id: openAiPayload?.response_id ?? null,
      model: openAiPayload?.model ?? null,
      usage: openAiPayload?.usage ?? null,
    },
    requested_generation: {
      model: args.model ?? null,
      temperature: requestedTemperature,
      max_output_tokens: requestedMaxOutputTokens,
    },
    prompt_length: prompt.length,
    test_prompt_length: testMessages.prompt.length,
    test_system_length: testMessages.system.length,
    compact_prompt_for_test: true,
    canonical_worldview_nodes: canonicalNodes,
    worldview_evaluation: evaluation,
    prompt_preview: prompt.slice(0, 1200),
    draft_output: parsedDraft,
  };

  mkdirSync(outputDir, { recursive: true });
  latestReportPath = resolve(outputDir, `worldview-distill-remote-${fixture.suffix}.json`);
  writeFileSync(latestReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const failure = {
    ok: false,
    error: message,
    source_batch_id: sourceBatchId,
    base_url: baseUrl,
    temp_user: {
      email: fixture.userEmail || null,
      id: fixture.userId,
    },
    raw_output_preview: latestRawOutput ? latestRawOutput.slice(0, 4000) : null,
    report_path: latestReportPath,
  };
  process.stdout.write(`${JSON.stringify(failure, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  if (!keepUser) {
    cleanupUser();
  }
}

function parseArgs(argv) {
  const parsed = {
    baseUrl: null,
    sourceBatchId: null,
    model: null,
    temperature: null,
    maxOutputTokens: null,
    keepUser: false,
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
    if (value === '--keep-user') {
      parsed.keepUser = true;
    }
  }

  return parsed;
}

function readCliNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function loadPassageContext(batchId) {
  const scope = getSingleRow(
    d1Json(
      `SELECT
         b.user_id,
         s.workspace_id,
         s.group_id,
         s.id AS source_id,
         s.title AS source_title,
         u.id AS source_unit_id,
         u.title AS source_unit_title,
         COALESCE(
           json_extract(u.unit_json, '$.locatorLabel'),
           json_extract(u.unit_json, '$.locator_label'),
           CASE
             WHEN u.start_ref IS NOT NULL AND u.end_ref IS NOT NULL AND u.start_ref <> u.end_ref THEN u.start_ref || '-' || u.end_ref
             ELSE COALESCE(u.start_ref, u.end_ref)
           END
         ) AS locator_label,
         json_extract(u.unit_json, '$.readingBody') AS reading_body
       FROM wv_distill_batches b
       INNER JOIN wv_sources s ON s.id = json_extract(b.batch_json, '$.source_id')
       INNER JOIN wv_source_units u ON u.id = json_extract(b.batch_json, '$.source_unit_id')
       WHERE b.id = ${sqlLiteral(batchId)}
       LIMIT 1`
    )
  );
  if (!scope) {
    throw new Error(`Batch ${batchId} was not found in remote D1.`);
  }

  const items = getRows(
    d1Json(
      `SELECT item_type, item_id, order_index, role
       FROM wv_distill_batch_items
       WHERE batch_id = ${sqlLiteral(batchId)}
       ORDER BY order_index ASC`
    )
  );
  if (!items.length) {
    throw new Error(`Batch ${batchId} does not have selected distill items.`);
  }

  const highlightIds = items.filter((item) => item.item_type === 'highlight').map((item) => item.item_id);
  const noteIds = items.filter((item) => item.item_type === 'note').map((item) => item.item_id);

  const highlightRows = highlightIds.length
    ? getRows(
        d1Json(
          `SELECT id, locator, anchor_text, selected_text, start_offset, end_offset, color, meta_json, created_at, updated_at
           FROM wv_highlights
           WHERE id IN (${sqlInList(highlightIds)})`
        )
      )
    : [];
  const noteRows = noteIds.length
    ? getRows(
        d1Json(
          `SELECT id, note_kind, title, body_md, excerpt_text, locator, note_json, meta_json, created_at, updated_at
           FROM wv_notes
           WHERE id IN (${sqlInList(noteIds)})`
        )
      )
    : [];

  const highlightById = new Map(highlightRows.map((row) => [row.id, row]));
  const noteById = new Map(noteRows.map((row) => [row.id, row]));

  const highlights = [];
  const notes = [];

  for (const item of items) {
    if (item.item_type === 'highlight') {
      const row = highlightById.get(item.item_id);
      if (!row) {
        continue;
      }
      highlights.push({
        id: row.id,
        role: item.role ?? null,
        order_index: item.order_index,
        locator: row.locator ?? null,
        anchor_text: row.anchor_text ?? null,
        selected_text: row.selected_text ?? '',
        start_offset: row.start_offset ?? null,
        end_offset: row.end_offset ?? null,
        color: row.color ?? null,
        meta_json: parseJsonObject(row.meta_json) ?? {},
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
      });
      continue;
    }

    const row = noteById.get(item.item_id);
    if (!row) {
      continue;
    }
    notes.push({
      id: row.id,
      role: item.role ?? null,
      order_index: item.order_index,
      note_kind: row.note_kind ?? null,
      title: row.title ?? null,
      body_md: row.body_md ?? '',
      excerpt_text: row.excerpt_text ?? null,
      locator: row.locator ?? null,
      note_json: parseJsonObject(row.note_json) ?? {},
      meta_json: parseJsonObject(row.meta_json) ?? {},
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    });
  }

  return {
    user_id: Number.isFinite(scope.user_id) ? scope.user_id : 1,
    workspace_id: readRequiredString(scope.workspace_id, 'workspace_id is missing for the source batch.'),
    group_id: scope.group_id ?? null,
    source_id: readRequiredString(scope.source_id, 'source_id is missing for the source batch.'),
    source_title: readRequiredString(scope.source_title, 'source_title is missing for the source batch.'),
    source_unit_id: readRequiredString(scope.source_unit_id, 'source_unit_id is missing for the source batch.'),
    source_unit_title: readRequiredString(scope.source_unit_title, 'source_unit_title is missing for the source batch.'),
    locator_label: scope.locator_label ?? null,
    reading_body: parseJsonArrayOfStrings(scope.reading_body),
    highlights,
    notes,
  };
}

function loadCanonicalNodes() {
  return getRows(
    d1Json(
      `SELECT id, title, node_type, summary
       FROM wv_nodes
       WHERE id IN (
         'wv_node_q12_1_7_revelation',
         'wv_node_q12_3_best_story',
         'wv_node_q12_5_discretion',
         'wv_node_q12_6_election',
         'wv_node_q12_7_signs_seekers'
       )
       ORDER BY id ASC`
    )
  );
}

function buildDistillPrompt(context) {
  const passageJsonText = buildPassageJsonText(context);
  return [...buildInstructionLines(), '', 'PASSAGE DATA', passageJsonText].join('\n');
}

function buildDistillTestMessages(context) {
  const passageJsonText = buildPassageJsonText(context);
  return {
    system: buildInstructionLines().join('\n'),
    prompt: ['PASSAGE DATA', passageJsonText].join('\n'),
  };
}

function buildPassageJsonText(context) {
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

  return context.compactPassageJson
    ? JSON.stringify(passageJson)
    : JSON.stringify(passageJson, null, 2);
}

function buildInstructionLines() {
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
    '- Node types allowed: concept, claim, theme, lesson.',
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
    '- Use deterministic-looking ids based on the passage/source unit where possible.',
    '- Keep all ids internally consistent within the returned JSON.',
    '',
    'RETURN JSON WITH EXACTLY THIS TOP-LEVEL SHAPE',
    '{',
    '  "wv_nodes": [',
    '    {',
    '      "id": "string",',
    '      "canonical_input": "string",',
    '      "node_type": "concept | claim | theme | lesson",',
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
  ];
}

function evaluateDraft(draft) {
  const nodes = Array.isArray(draft?.wv_nodes) ? draft.wv_nodes : [];
  const documents = Array.isArray(draft?.wv_documents) ? draft.wv_documents : [];
  const blocks = Array.isArray(draft?.wv_document_blocks) ? draft.wv_document_blocks : [];
  const links = Array.isArray(draft?.wv_block_node_links) ? draft.wv_block_node_links : [];
  const edges = Array.isArray(draft?.wv_node_edges) ? draft.wv_node_edges : [];
  const podcast = draft?.podcast_episode ?? null;

  const matchedAnchors = [];
  const missingAnchors = [];
  const offAnchorNodes = [];

  for (const anchor of worldviewAnchors) {
    const match = nodes.find((node) => anchor.test(nodeText(node)));
    if (match) {
      matchedAnchors.push({
        key: anchor.key,
        label: anchor.label,
        node_id: match.id ?? null,
        title: match.title ?? null,
      });
    } else {
      missingAnchors.push({
        key: anchor.key,
        label: anchor.label,
      });
    }
  }

  for (const node of nodes) {
    if (!worldviewAnchors.some((anchor) => anchor.test(nodeText(node)))) {
      offAnchorNodes.push({
        id: node?.id ?? null,
        title: node?.title ?? null,
        summary: node?.summary ?? null,
      });
    }
  }

  const structureWarnings = [];
  if (documents.length !== 1) {
    structureWarnings.push(`Expected exactly 1 study note document, found ${documents.length}.`);
  }
  if (!blocks.length) {
    structureWarnings.push('No document blocks were generated.');
  }
  if (!links.length) {
    structureWarnings.push('No block-node links were generated.');
  }
  if (!podcast || !Array.isArray(podcast.main_points) || !podcast.main_points.length) {
    structureWarnings.push('Podcast outline is missing or empty.');
  }

  let verdict = 'pass';
  if (structureWarnings.length || missingAnchors.length >= 2) {
    verdict = 'warn';
  }
  if (documents.length !== 1 || matchedAnchors.length < 4) {
    verdict = 'fail';
  }

  return {
    verdict,
    structure: {
      node_count: nodes.length,
      edge_count: edges.length,
      document_count: documents.length,
      block_count: blocks.length,
      block_link_count: links.length,
      podcast_main_point_count: Array.isArray(podcast?.main_points) ? podcast.main_points.length : 0,
      warnings: structureWarnings,
    },
    matched_anchors: matchedAnchors,
    missing_anchors: missingAnchors,
    off_anchor_nodes: offAnchorNodes,
    podcast_anchor_coverage: worldviewAnchors
      .filter((anchor) => anchor.test(podcastText(podcast)))
      .map((anchor) => anchor.key),
    node_titles: nodes.map((node) => node?.title ?? null),
  };
}

function parseGeneratedDraft(rawOutput) {
  const direct = parseJsonObject(rawOutput);
  if (direct) {
    return direct;
  }

  const firstBrace = rawOutput.indexOf('{');
  const lastBrace = rawOutput.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const extracted = rawOutput.slice(firstBrace, lastBrace + 1);
    const parsed = parseJsonObject(extracted);
    if (parsed) {
      return parsed;
    }
  }

  throw new Error('OpenAI output was not valid JSON.');
}

function cleanupUser() {
  if (fixture.userId == null) {
    return;
  }

  try {
    d1Json(`DELETE FROM users WHERE id = ${sqlLiteral(fixture.userId)}`);
  } catch {
    // Best-effort cleanup.
  }
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

async function postJson(url, body, token = null) {
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

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseJsonArrayOfStrings(value) {
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean);
  }
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry) => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function readRequiredString(value, message) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  throw new Error(message);
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

function sqlInList(values) {
  return values.map((value) => sqlLiteral(value)).join(', ');
}

function buildSuffix() {
  const iso = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${iso}${rand}`;
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasOne(text, terms) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function nodeText(node) {
  return normalizeText(
    [node?.title, node?.summary, node?.text_plain, JSON.stringify(node?.data_json ?? {})]
      .filter(Boolean)
      .join(' ')
  );
}

function podcastText(podcast) {
  return normalizeText(
    [
      podcast?.title,
      podcast?.hook,
      podcast?.intro,
      ...(Array.isArray(podcast?.main_points) ? podcast.main_points : []),
      podcast?.closing,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

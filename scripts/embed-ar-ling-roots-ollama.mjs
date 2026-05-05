#!/usr/bin/env node

import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith('--')) {
    args.set(key, true);
  } else {
    args.set(key, next);
    i += 1;
  }
}

const APPLY = args.has('apply');
const RESET = args.has('reset');
const MODEL = String(args.get('model') ?? 'bge-m3:latest');
const OLLAMA_URL = String(args.get('ollama-url') ?? 'http://localhost:11434');
const QDRANT_URL = String(args.get('qdrant-url') ?? 'http://localhost:6333');
const COLLECTION = String(args.get('collection') ?? 'km_ar_ling_roots_bge_m3_v1');
const VECTOR_SIZE = Number(args.get('vector-size') ?? 1024);
const BATCH = Number(args.get('batch') ?? 16);
const LIMIT = args.has('limit') ? Number(args.get('limit')) : null;

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function d1(command) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', command],
    { cwd: WRANGLER_CWD, encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 },
  );
  const parsed = JSON.parse(out);
  for (const result of parsed) {
    if (!result.success) throw new Error(`D1 command failed: ${command}`);
  }
  return parsed.at(-1)?.results ?? [];
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function uuidFromString(value) {
  const hex = hash(value).slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
}

async function qdrant(method, path, body) {
  const res = await fetch(`${QDRANT_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok && !(method === 'DELETE' && res.status === 404)) {
    throw new Error(`Qdrant ${method} ${path} failed ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

async function ensureCollection() {
  if (RESET) {
    await qdrant('DELETE', `/collections/${encodeURIComponent(COLLECTION)}`);
  }
  await qdrant('PUT', `/collections/${encodeURIComponent(COLLECTION)}`, {
    vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
  });
}

async function embed(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: text, truncate: true }),
  });
  if (!res.ok) throw new Error(`Ollama embed failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const vector = data.embeddings?.[0] ?? data.embedding;
  if (!Array.isArray(vector)) throw new Error('Ollama response did not contain a vector');
  return vector;
}

function targetQuery(limit) {
  return `
    WITH root_targets AS (
      SELECT
        COALESCE(NULLIF(le.root_id, ''), 'HEADING:' || le.heading_norm) AS target_id,
        CASE WHEN le.root_id IS NULL OR trim(le.root_id) = '' THEN 'heading' ELSE 'root' END AS target_kind,
        MIN(le.root_id) AS root_id,
        MIN(le.root_text) AS root_text,
        MIN(le.heading_norm) AS heading_norm,
        COUNT(*) AS entry_count,
        COUNT(DISTINCT le.source_slug) AS source_count,
        GROUP_CONCAT(DISTINCT le.source_slug) AS source_slugs,
        GROUP_CONCAT(
          substr(
            COALESCE(le.display_heading_ar, le.heading_norm, le.entry_text, '') || char(10) ||
            COALESCE(le.gloss_ar, '') || char(10) ||
            COALESCE(le.gloss_en, '') || char(10) ||
            COALESCE(le.summary_ar, '') || char(10) ||
            COALESCE(le.summary_en, '') || char(10) ||
            substr(COALESCE(le.definition_ar, ''), 1, 1200) || char(10) ||
            substr(COALESCE(le.definition_en, ''), 1, 400),
            1,
            1800
          ),
          char(10) || '---SOURCE ENTRY---' || char(10)
        ) AS text_bundle
      FROM ar_ling_lexicon_entries le
      WHERE le.heading_norm IS NOT NULL
        AND trim(le.heading_norm) != ''
        AND NOT EXISTS (
          SELECT 1
          FROM ar_ling_vector_records vr
          WHERE vr.target_table = 'ar_ling_lexicon_roots'
            AND vr.target_id = COALESCE(NULLIF(le.root_id, ''), 'HEADING:' || le.heading_norm)
            AND vr.qdrant_collection = ${sql(COLLECTION)}
            AND vr.model_name = ${sql(MODEL)}
        )
      GROUP BY COALESCE(NULLIF(le.root_id, ''), 'HEADING:' || le.heading_norm)
    )
    SELECT *
    FROM root_targets
    ORDER BY target_kind, heading_norm
    LIMIT ${limit}
  `;
}

function textFor(row) {
  return [
    `Root target: ${row.root_text || row.heading_norm || row.target_id}`,
    `Kind: ${row.target_kind}`,
    `Heading: ${row.heading_norm || ''}`,
    `Entries: ${row.entry_count}`,
    `Sources: ${row.source_slugs || ''}`,
    row.text_bundle || '',
  ].join('\n').slice(0, 12000);
}

async function main() {
  const pending = d1(`
    SELECT COUNT(*) AS pending
    FROM (
      SELECT COALESCE(NULLIF(root_id, ''), 'HEADING:' || heading_norm) AS target_id
      FROM ar_ling_lexicon_entries le
      WHERE heading_norm IS NOT NULL
        AND trim(heading_norm) != ''
        AND NOT EXISTS (
          SELECT 1
          FROM ar_ling_vector_records vr
          WHERE vr.target_table = 'ar_ling_lexicon_roots'
            AND vr.target_id = COALESCE(NULLIF(le.root_id, ''), 'HEADING:' || le.heading_norm)
            AND vr.qdrant_collection = ${sql(COLLECTION)}
            AND vr.model_name = ${sql(MODEL)}
        )
      GROUP BY COALESCE(NULLIF(root_id, ''), 'HEADING:' || heading_norm)
    )
  `)[0]?.pending ?? 0;

  console.log(JSON.stringify({
    apply: APPLY,
    reset: RESET,
    model: MODEL,
    collection: COLLECTION,
    vector_size: VECTOR_SIZE,
    pending,
    limit: LIMIT,
    batch: BATCH,
  }, null, 2));

  if (!APPLY) return;
  await ensureCollection();

  let embedded = 0;
  while (LIMIT === null || embedded < LIMIT) {
    const take = LIMIT === null ? BATCH : Math.min(BATCH, LIMIT - embedded);
    if (take <= 0) break;
    const rows = d1(targetQuery(take));
    if (rows.length === 0) break;

    const points = [];
    const records = [];
    for (const row of rows) {
      const input = textFor(row);
      const vector = await embed(input);
      const qdrantId = uuidFromString(`${COLLECTION}:${MODEL}:${row.target_id}`);
      points.push({
        id: qdrantId,
        vector,
        payload: {
          table: 'ar_ling_lexicon_roots',
          target_id: row.target_id,
          target_kind: row.target_kind,
          root_id: row.root_id,
          root_text: row.root_text,
          heading_norm: row.heading_norm,
          entry_count: row.entry_count,
          source_count: row.source_count,
          source_slugs: row.source_slugs,
          embed_model: MODEL,
        },
      });
      records.push({
        id: `VEC:ar_ling_lexicon_roots:${hash(`${COLLECTION}:${MODEL}:${row.target_id}`).slice(0, 24)}`,
        target_id: row.target_id,
        qdrant_id: qdrantId,
        source_slug: row.source_slugs,
        text_hash: hash(input),
      });
    }

    await qdrant('PUT', `/collections/${encodeURIComponent(COLLECTION)}/points?wait=true`, { points });

    const statements = records.map((record) => `
      INSERT INTO ar_ling_vector_records (
        id, target_db, target_table, target_id, qdrant_id, qdrant_collection,
        model_name, embedding_profile, chunk_kind, source_slug, text_hash
      )
      VALUES (
        ${sql(record.id)}, 'km_arabic_linguistic', 'ar_ling_lexicon_roots',
        ${sql(record.target_id)}, ${sql(record.qdrant_id)}, ${sql(COLLECTION)},
        ${sql(MODEL)}, 'root_aggregate_from_ar_ling_lexicon_entries',
        'lexicon_root', ${sql(record.source_slug)}, ${sql(record.text_hash)}
      )
      ON CONFLICT(id) DO UPDATE SET
        qdrant_id = excluded.qdrant_id,
        qdrant_collection = excluded.qdrant_collection,
        model_name = excluded.model_name,
        embedding_profile = excluded.embedding_profile,
        source_slug = excluded.source_slug,
        text_hash = excluded.text_hash,
        embedded_at = datetime('now');
    `);
    d1(statements.join('\n'));

    embedded += rows.length;
    console.log(`[roots] embedded ${embedded}${LIMIT === null ? '' : `/${LIMIT}`}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

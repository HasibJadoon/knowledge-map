#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DB = 'km_arabic_linguistic';
const WRANGLER_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const OUT_DIR = new URL('../temp/ar-ling-lexicon-ollama-embeddings/', import.meta.url);

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

const MODEL = String(args.get('model') ?? 'bge-m3:latest');
const SOURCE = args.get('source') ? String(args.get('source')) : null;
const LIMIT_PER_SOURCE = Number(args.get('limit-per-source') ?? 25);
const LIMIT_TOTAL = args.has('limit') ? Number(args.get('limit')) : null;
const BATCH = Number(args.get('batch') ?? 8);
const APPLY = args.has('apply');
const RESET = args.has('reset');
const OLLAMA_URL = String(args.get('ollama-url') ?? 'http://localhost:11434');
const QDRANT = args.has('qdrant');
const QDRANT_URL = String(args.get('qdrant-url') ?? 'http://localhost:6333');
const COLLECTION = String(args.get('collection') ?? 'km_ar_ling_lexicon_bge_m3_v1');
const VECTOR_SIZE = Number(args.get('vector-size') ?? 1024);

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

function d1Batch(statements) {
  if (statements.length === 0) return;
  d1(`${statements.join(';\n')};`);
}

async function embedMany(texts) {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
      truncate: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama embed failed ${res.status}: ${body}`);
  }
  const data = await res.json();
  const vectors = data.embeddings ?? (data.embedding ? [data.embedding] : null);
  if (!Array.isArray(vectors) || !vectors.every(Array.isArray)) {
    throw new Error('Ollama response did not contain embedding vectors');
  }
  return vectors;
}

function uuidFromString(value) {
  const hex = crypto.createHash('sha256').update(value).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
}

async function ensureCollection() {
  if (!QDRANT) return;
  if (RESET) {
    await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}`, { method: 'DELETE' });
  }
  const res = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine',
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Qdrant collection create failed ${res.status}: ${body}`);
  }
}

async function upsertPoint(point) {
  if (!QDRANT) return;
  return upsertPoints([point]);
}

async function upsertPoints(points) {
  if (!QDRANT || points.length === 0) return;
  const res = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(COLLECTION)}/points?wait=true`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ points }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Qdrant upsert failed ${res.status}: ${body}`);
  }
}

function entryText(row) {
  return [
    row.display_heading_ar || row.heading_norm || row.entry_text,
    row.display_heading_en,
    row.gloss_ar,
    row.gloss_en,
    row.summary_ar,
    row.summary_en,
    row.definition_ar,
    row.definition_en,
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 8000);
}

function qdrantId(row) {
  return uuidFromString(`ollama:${MODEL}:${row.id}`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const sourceFilter = SOURCE ? `AND source_slug = ${sql(SOURCE)}` : '';
  const sources = d1(`
    SELECT source_slug, COUNT(*) AS pending
    FROM ar_ling_lexicon_entries
    WHERE ai_fill_state = 'pending'
      AND (is_embedded = 0 OR qdrant_id IS NULL OR embed_model IS NULL OR embed_model != ${sql(MODEL)})
      ${sourceFilter}
    GROUP BY source_slug
    ORDER BY pending DESC, source_slug
  `);

  const summary = {
    apply: APPLY,
    reset: RESET,
    model: MODEL,
    qdrant: QDRANT,
    qdrant_url: QDRANT_URL,
    collection: QDRANT ? COLLECTION : null,
    limit_per_source: LIMIT_PER_SOURCE,
    limit_total: LIMIT_TOTAL,
    batch: BATCH,
    sources: sources.map((s) => ({ source_slug: s.source_slug, pending: s.pending })),
    embedded: 0,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!APPLY) return;
  await ensureCollection();
  if (RESET) {
    d1(`
      UPDATE ar_ling_lexicon_entries
      SET is_embedded = 0,
          qdrant_id = NULL,
          embed_model = NULL,
          updated_at = datetime('now')
    `);
  }

  for (const source of sources) {
    if (LIMIT_TOTAL !== null && summary.embedded >= LIMIT_TOTAL) break;
    const sourceSlug = source.source_slug ?? 'unknown_source';
    const outPath = join(OUT_DIR.pathname, `${sourceSlug}.jsonl`);
    const stream = createWriteStream(outPath, { flags: 'a' });
    let sourceDone = 0;
    const sourceWhere = source.source_slug === null
      ? 'source_slug IS NULL'
      : `source_slug = ${sql(source.source_slug)}`;

    const sourceLimit = LIMIT_TOTAL === null
      ? LIMIT_PER_SOURCE
      : Math.min(LIMIT_PER_SOURCE, LIMIT_TOTAL - summary.embedded);

    while (sourceDone < sourceLimit) {
      const take = Math.min(BATCH, sourceLimit - sourceDone);
      const rows = d1(`
        SELECT id, entry_text, heading_norm, display_heading_ar, display_heading_en,
               gloss_ar, gloss_en, summary_ar, summary_en, definition_ar, definition_en,
               source_slug, source_id, source_chunk_id, entry_kind, root_id, page_no, volume_no
        FROM ar_ling_lexicon_entries
        WHERE ${sourceWhere}
          AND ai_fill_state = 'pending'
          AND (is_embedded = 0 OR qdrant_id IS NULL OR embed_model IS NULL OR embed_model != ${sql(MODEL)})
        ORDER BY sort_key, id
        LIMIT ${take}
      `);
      if (rows.length === 0) break;

      const vectors = await embedMany(rows.map(entryText));
      const points = rows.map((row, index) => {
        const pointId = qdrantId(row);
        return {
          id: pointId,
          vector: vectors[index],
          payload: {
            table: 'ar_ling_lexicon_entries',
            id: row.id,
            source_slug: row.source_slug,
            source_id: row.source_id,
            source_chunk_id: row.source_chunk_id,
            entry_kind: row.entry_kind,
            heading_norm: row.heading_norm,
            root_id: row.root_id,
            page_no: row.page_no,
            volume_no: row.volume_no,
            embed_model: MODEL,
            collection: QDRANT ? COLLECTION : null,
          },
        };
      });
      await upsertPoints(points);

      const updates = [];
      for (const [index, row] of rows.entries()) {
        const point = points[index];
        stream.write(`${JSON.stringify(point)}\n`);

        updates.push(`
          UPDATE ar_ling_lexicon_entries
          SET is_embedded = 1,
              qdrant_id = ${sql(point.id)},
              embed_model = ${sql(MODEL)},
              cleaner_json = json_set(
                COALESCE(cleaner_json, json_object()),
                '$.embedding_local_jsonl',
                ${sql(outPath)},
                '$.embedding_model',
                ${sql(MODEL)}
              ),
              updated_at = datetime('now')
          WHERE id = ${sql(row.id)}
        `);
      }
      d1Batch(updates);

      summary.embedded += rows.length;
      sourceDone += rows.length;

      console.log(`[${sourceSlug}] embedded ${sourceDone}/${Math.min(Number(source.pending), sourceLimit)} total=${summary.embedded}`);
    }

    stream.end();
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

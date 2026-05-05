#!/usr/bin/env node

import crypto from 'node:crypto';
import { loadConfig } from './config.mjs';
import { D1Client, sql, upsertTrackingSql } from './db.mjs';
import { OllamaEmbedder } from './embedder.mjs';
import { buildEmbeddingText, buildPayload, sha256, stablePointId } from './format.mjs';
import { QdrantClient } from './qdrant.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, config, fn) {
  let last;
  for (let attempt = 1; attempt <= config.maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      console.error(`[retry] ${label} failed attempt ${attempt}/${config.maxRetries}: ${error.message}`);
      if (attempt < config.maxRetries) await sleep(config.retryBaseMs * attempt);
    }
  }
  throw last;
}

function jobId() {
  return `LEXEMB:${new Date().toISOString()}:${crypto.randomUUID()}`;
}

function entrySelectWhere(config) {
  if (config.mode === 'reset') return '1 = 1';
  return `
    NOT EXISTS (
      SELECT 1
      FROM ar_ling_lexicon_entry_embeddings existing
      WHERE existing.entry_id = le.id
        AND existing.collection_name = ${sql(config.collection)}
        AND existing.embedding_model = ${sql(config.embeddingModel)}
        AND existing.status = 'embedded'
    )
  `;
}

function fetchBatch(db, config, offset = 0) {
  const offsetClause = config.mode === 'reset' ? `OFFSET ${offset}` : '';
  return db.query(`
    SELECT
      le.id,
      le.source_id,
      le.source_slug,
      COALESCE(s.title_en, le.definition_source, le.source_slug, le.source_id) AS source_title,
      s.title_ar AS source_title_ar,
      s.author_name,
      le.root_text,
      le.entry_text,
      le.heading_norm,
      le.heading_key,
      le.display_heading_ar,
      le.volume_no,
      le.page_no,
      le.source_entry_seq,
      le.source_url,
      le.definition_ar,
      tr.embedding_text_hash AS previous_hash,
      tr.status AS previous_status
    FROM ar_ling_lexicon_entries le
    LEFT JOIN ar_ling_sources s ON s.id = le.source_id
    LEFT JOIN ar_ling_lexicon_entry_embeddings tr
      ON tr.entry_id = le.id
     AND tr.collection_name = ${sql(config.collection)}
     AND tr.embedding_model = ${sql(config.embeddingModel)}
     AND tr.status = 'embedded'
    WHERE ${entrySelectWhere(config)}
    ORDER BY le.id
    LIMIT ${config.batchSize}
    ${offsetClause}
  `);
}

function markFailedSql(config, row, textHash, error) {
  return upsertTrackingSql({
    entry_id: row.id,
    collection_name: config.collection,
    qdrant_point_id: stablePointId(row.id),
    embedding_model: config.embeddingModel,
    embedding_text_hash: textHash,
    status: 'failed',
    error_message: String(error.message || error).slice(0, 1000),
  });
}

async function processBatch(db, qdrant, embedder, config, rows) {
  const prepared = rows.map((row) => {
    const embeddingText = buildEmbeddingText(row, config.textMaxChars);
    return {
      row,
      embeddingText,
      textHash: sha256(embeddingText),
      pointId: stablePointId(row.id),
    };
  });

  const todo = config.mode === 'reset'
    ? prepared
    : prepared.filter((item) => item.row.previous_hash !== item.textHash || item.row.previous_status !== 'embedded');

  if (todo.length === 0) return { embedded: 0, skipped: rows.length, failed: 0 };

  try {
    const vectors = await withRetry('embed batch', config, () => embedder.embed(todo.map((item) => item.embeddingText)));
    const points = todo.map((item, index) => ({
      id: item.pointId,
      vector: vectors[index],
      payload: buildPayload(item.row),
    }));
    await withRetry('qdrant upsert batch', config, () => qdrant.upsert(points));

    const statements = todo.map((item) => upsertTrackingSql({
      entry_id: item.row.id,
      collection_name: config.collection,
      qdrant_point_id: item.pointId,
      embedding_model: config.embeddingModel,
      embedding_text_hash: item.textHash,
      status: 'embedded',
      error_message: null,
    }));

    db.exec(`${statements.join(';\n')};`);
    return { embedded: todo.length, skipped: rows.length - todo.length, failed: 0 };
  } catch (error) {
    console.error(`[batch] failed; marking ${todo.length} rows failed: ${error.message}`);
    const statements = todo.map((item) => markFailedSql(config, item.row, item.textHash, error));
    db.exec(`${statements.join(';\n')};`);
    return { embedded: 0, skipped: rows.length - todo.length, failed: todo.length };
  }
}

async function validate(db, qdrant, config) {
  const sqlStats = db.query(`
    SELECT
      COUNT(*) AS sql_entries,
      SUM(CASE WHEN definition_ar IS NOT NULL AND trim(definition_ar) != '' THEN 1 ELSE 0 END) AS sql_non_empty_entry_text
    FROM ar_ling_lexicon_entries
  `)[0];
  const tracking = db.query(`
    SELECT
      SUM(CASE WHEN status = 'embedded' THEN 1 ELSE 0 END) AS tracking_rows,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
    FROM ar_ling_lexicon_entry_embeddings
    WHERE collection_name = ${sql(config.collection)}
      AND embedding_model = ${sql(config.embeddingModel)}
  `)[0];
  const qdrantPoints = await qdrant.collectionCount();
  const missing = db.query(`
    SELECT le.id AS entry_id
    FROM ar_ling_lexicon_entries le
    LEFT JOIN ar_ling_lexicon_entry_embeddings tr
      ON tr.entry_id = le.id
     AND tr.collection_name = ${sql(config.collection)}
     AND tr.embedding_model = ${sql(config.embeddingModel)}
     AND tr.status = 'embedded'
    WHERE tr.entry_id IS NULL
    LIMIT 25
  `);

  return {
    sqlEntries: Number(sqlStats?.sql_entries ?? 0),
    sqlNonEmptyEntryText: Number(sqlStats?.sql_non_empty_entry_text ?? 0),
    qdrantPoints: Number(qdrantPoints ?? 0),
    trackingRows: Number(tracking?.tracking_rows ?? 0),
    failed: Number(tracking?.failed ?? 0),
    missingEntryIds: missing.map((row) => row.entry_id),
  };
}

async function main() {
  const config = loadConfig();
  const db = new D1Client(config);
  const qdrant = new QdrantClient(config);
  const embedder = new OllamaEmbedder(config);

  console.log(JSON.stringify({
    mode: config.mode,
    collection: config.collection,
    model: config.embeddingModel,
    dimension: config.embeddingDimension,
    batchSize: config.batchSize,
    limit: config.limit,
  }, null, 2));

  if (config.mode === 'validate') {
    console.log(JSON.stringify(await validate(db, qdrant, config), null, 2));
    return;
  }

  const id = jobId();
  const totalExpected = db.query('SELECT COUNT(*) AS count FROM ar_ling_lexicon_entries')[0]?.count ?? 0;
  db.exec(`
    INSERT INTO ar_ling_embedding_jobs (
      job_id, collection_name, embedding_model, started_at, total_expected,
      total_embedded, status, error_message
    )
    VALUES (
      ${sql(id)}, ${sql(config.collection)}, ${sql(config.embeddingModel)},
      datetime('now'), ${Number(totalExpected)}, 0, 'running', NULL
    )
  `);

  if (config.mode === 'reset') {
    console.log('[reset] recreating Qdrant collection and clearing tracking rows');
    await qdrant.recreateCollection();
    db.exec(`
      DELETE FROM ar_ling_lexicon_entry_embeddings
      WHERE collection_name = ${sql(config.collection)}
        AND embedding_model = ${sql(config.embeddingModel)}
    `);
  } else {
    await qdrant.createCollection();
  }

  let offset = 0;
  let embedded = 0;
  let skipped = 0;
  let failed = 0;
  const maxRows = config.limit ?? Number(totalExpected);

  while (offset < maxRows) {
    const rows = fetchBatch(db, config, offset);
    if (rows.length === 0) break;
    const limitedRows = rows.slice(0, Math.min(rows.length, maxRows - offset));
    const result = await processBatch(db, qdrant, embedder, config, limitedRows);
    embedded += result.embedded;
    skipped += result.skipped;
    failed += result.failed;
    offset += config.mode === 'reset' ? rows.length : 0;
    console.log(`[batch] offset=${offset} embedded=${embedded} skipped=${skipped} failed=${failed}`);
  }

  db.exec(`
    UPDATE ar_ling_embedding_jobs
    SET completed_at = datetime('now'),
        total_embedded = ${embedded},
        status = ${sql(failed === 0 ? 'completed' : 'completed_with_failures')},
        error_message = ${failed === 0 ? 'NULL' : sql(`${failed} rows failed`)}
    WHERE job_id = ${sql(id)}
  `);

  const summary = await validate(db, qdrant, config);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

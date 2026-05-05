#!/usr/bin/env node
// Stores ayah dependency graph SVGs intact for treebank / QAC-style tree building.
// No entry extraction — the SVG is the data.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeId, makeRunId, normalizeWhitespace, PARSER_VERSION_DEP_GRAPHS } from './parser.mjs';

const QR_DB = 'km_quran';
const QR_CWD = new URL('../../workers/quran/', import.meta.url);
const DEFAULT_INPUT = resolve('km_arabic_linguistic/ingestion/Irrab/ayah-dependency-graphs.db');
const DEFAULT_SOURCE = 'qul_dep_graphs';
const DEFAULT_SOURCE_ID = 'QR:WORK:QUL:DEP_GRAPHS';
const SOURCE_TITLE_AR = 'رسوم الإعراب الشجري للقرآن الكريم';
const SOURCE_TITLE_EN = 'Ayah Dependency Graphs (QUL treebank)';

function args() {
  const parsed = {
    input: DEFAULT_INPUT, source: DEFAULT_SOURCE, surah: null,
    dryRun: !process.argv.includes('--apply'),
    apply: process.argv.includes('--apply'),
    forceReparse: process.argv.includes('--force-reparse'),
  };
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--input') parsed.input = resolve(process.argv[++i]);
    else if (arg === '--surah') parsed.surah = Number(process.argv[++i]);
    else if (arg === '--dry-run') parsed.dryRun = true;
  }
  return parsed;
}

function sql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replaceAll("'", "''")}'`;
}

function d1(db, cwd, command) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', db, '--remote', '--json', '--command', command], {
    cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 256,
  });
  const parsed = JSON.parse(out);
  for (const r of parsed) if (!r.success) throw new Error(`D1 failed: ${r.error ?? command.slice(0, 500)}`);
  return parsed.at(-1)?.results ?? [];
}

function sqlite(dbPath, command) {
  const out = execFileSync('sqlite3', ['-json', dbPath, command], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 });
  return JSON.parse(out || '[]');
}

function fileSha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function parseAyah(row) {
  const [surahStr, ayahFromStr] = String(row.ayah_key ?? '').split(':');
  const surah = Number(surahStr);
  const fromAyah = row.from_ayah ? Number(String(row.from_ayah).split(':')[1]) : Number(ayahFromStr);
  const toAyah = row.to_ayah ? Number(String(row.to_ayah).split(':')[1]) : fromAyah;
  return {
    surah: Number.isFinite(surah) ? surah : null,
    ayah_from: Number.isFinite(fromAyah) ? fromAyah : null,
    ayah_to: Number.isFinite(toAyah) ? toAyah : (Number.isFinite(fromAyah) ? fromAyah : null),
  };
}

function loadRows(config) {
  // Load all rows including secondary refs — each ayah has its own SVG
  const where = config.surah ? `WHERE ayah_key LIKE ${sql(`${config.surah}:%`)}` : '';
  return sqlite(config.input, `SELECT ayah_key, group_ayah_key, from_ayah, to_ayah, ayah_keys, text FROM tafsir ${where} ORDER BY ayah_key`);
}

function buildModel(config, rows) {
  const chunks = [], errors = [];
  const sourceSlug = config.source;

  for (const row of rows) {
    try {
      const ayah = parseAyah(row);
      const recordId = row.ayah_key;
      const svgText = String(row.text ?? '').trim();
      if (!svgText) continue;

      const chunkId = makeId('chunk', sourceSlug, recordId, 'dep_graph', 0);
      // SVGs average 43KB — SQLITE_TOOBIG prevents storing in D1 SQL statements.
      // Store metadata only; canonical SVG stays in the source SQLite DB.
      const meta = JSON.stringify({ svg_bytes: svgText.length, source_db: 'ayah-dependency-graphs.db' });
      chunks.push({
        id: chunkId,
        source_id: DEFAULT_SOURCE_ID,
        source_slug: sourceSlug,
        source_record_id: recordId,
        ayah_key: row.ayah_key ?? null,
        group_ayah_key: row.group_ayah_key ?? null,
        from_ayah: row.from_ayah ?? null,
        to_ayah: row.to_ayah ?? null,
        ayah_keys: row.ayah_keys ?? null,
        ...ayah,
        section_kind: 'dep_graph',
        section_order: 0,
        content_format: 'svg_ref',
        raw_html: null,
        raw_text: null,
        clean_text: meta,
      });
    } catch (error) {
      const ayah = parseAyah(row);
      errors.push({
        id: makeId('error', sourceSlug, row.ayah_key ?? '', error.message),
        source_slug: sourceSlug,
        ...ayah,
        error_type: 'parse_error',
        error_message: error.message,
        raw_fragment: JSON.stringify(row).slice(0, 1000),
      });
    }
  }
  return { chunks, errors };
}

function upsertSource(config, hash, size) {
  return `INSERT INTO qr_irab_sources (id,source_slug,source_title_ar,source_title_en,source_kind,source_version,source_downloaded_at,source_file_hash,source_file_size,note_md,updated_at)
    VALUES (${sql(DEFAULT_SOURCE_ID)},${sql(config.source)},${sql(SOURCE_TITLE_AR)},${sql(SOURCE_TITLE_EN)},'dep_graph',${sql(`QUL local sqlite, parser ${PARSER_VERSION_DEP_GRAPHS}`)},datetime('now'),${sql(hash)},${sql(size)},${sql('SVG dependency trees stored intact for QAC-style treebank parsing. No irab entry extraction — SVG is the canonical data.')},datetime('now'))
    ON CONFLICT(source_slug) DO UPDATE SET source_file_hash=excluded.source_file_hash,source_file_size=excluded.source_file_size,source_downloaded_at=excluded.source_downloaded_at,source_version=excluded.source_version,updated_at=datetime('now')`;
}

function insertChunk(chunk, runId) {
  // SVGs can be large — insert one at a time
  return `INSERT INTO qr_irab_source_chunks (id,extraction_run_id,source_id,source_slug,source_record_id,ayah_key,group_ayah_key,from_ayah,to_ayah,ayah_keys,surah,ayah_from,ayah_to,section_kind,section_order,content_format,raw_html,raw_text,clean_text,source_record_json,updated_at)
  VALUES (${sql(chunk.id)},${sql(runId)},${sql(chunk.source_id)},${sql(chunk.source_slug)},${sql(chunk.source_record_id)},${sql(chunk.ayah_key)},${sql(chunk.group_ayah_key)},${sql(chunk.from_ayah)},${sql(chunk.to_ayah)},${sql(chunk.ayah_keys)},${sql(chunk.surah)},${sql(chunk.ayah_from)},${sql(chunk.ayah_to)},'dep_graph',0,'svg_ref',NULL,NULL,${sql(chunk.clean_text)},NULL,datetime('now'))
  ON CONFLICT(source_slug,source_record_id,section_kind,section_order) DO UPDATE SET extraction_run_id=excluded.extraction_run_id,clean_text=excluded.clean_text,updated_at=datetime('now')`;
}

function insertError(err, runId) {
  return `INSERT INTO qr_irab_import_errors (id,extraction_run_id,source_slug,surah,ayah_from,ayah_to,source_chunk_id,error_type,error_message,raw_fragment)
  VALUES (${sql(err.id)},${sql(runId)},${sql(err.source_slug)},${sql(err.surah)},${sql(err.ayah_from)},${sql(err.ayah_to)},NULL,${sql(err.error_type)},${sql(err.error_message)},${sql(err.raw_fragment)})
  ON CONFLICT(id) DO NOTHING`;
}

function batched(stmts, size) {
  const out = [];
  for (let i = 0; i < stmts.length; i += size) out.push(stmts.slice(i, i + size).join(';\n') + ';');
  return out;
}

function main() {
  const config = args();
  const stats = statSync(config.input);
  const hash = fileSha256(config.input);
  const rows = loadRows(config);
  const model = buildModel(config, rows);
  const runId = makeRunId(config.source);

  const avgSvgBytes = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.text?.length ?? 0), 0) / rows.length)
    : 0;
  console.log(JSON.stringify({
    source_rows: rows.length, chunks: model.chunks.length,
    avg_svg_bytes: avgSvgBytes, errors: model.errors.length,
    sample_ayah_keys: rows.slice(0, 5).map((r) => r.ayah_key),
  }, null, 2));

  if (!config.apply) return;

  d1(QR_DB, QR_CWD, `INSERT INTO qr_irab_extraction_runs (id,source_slug,resource_id,input_path,parser_version,started_at,status,records_read)
    VALUES (${sql(runId)},${sql(config.source)},NULL,${sql(config.input)},${sql(PARSER_VERSION_DEP_GRAPHS)},datetime('now'),'running',${sql(rows.length)})`);

  try {
    if (config.forceReparse) {
      d1(QR_DB, QR_CWD, `DELETE FROM qr_irab_source_chunks WHERE source_slug=${sql(config.source)};
        DELETE FROM qr_irab_import_errors WHERE source_slug=${sql(config.source)};`);
    }
    d1(QR_DB, QR_CWD, upsertSource(config, hash, stats.size));
    // Metadata-only rows now — small, safe to batch
    for (const b of batched(model.chunks.map((c) => insertChunk(c, runId)), 20)) d1(QR_DB, QR_CWD, b);
    for (const b of batched(model.errors.map((e) => insertError(e, runId)), 40)) d1(QR_DB, QR_CWD, b);

    const check = d1(QR_DB, QR_CWD, `SELECT
      (SELECT COUNT(*) FROM qr_irab_source_chunks WHERE source_slug=${sql(config.source)}) AS chunks,
      (SELECT COUNT(*) FROM qr_irab_import_errors WHERE source_slug=${sql(config.source)}) AS errors`)[0];

    d1(QR_DB, QR_CWD, `UPDATE qr_irab_extraction_runs SET finished_at=datetime('now'),status='completed',chunks_created=${sql(check.chunks)},entries_created=0,error_message=NULL WHERE id=${sql(runId)}`);
    console.log(JSON.stringify({ run_id: runId, imported: check }, null, 2));
  } catch (error) {
    d1(QR_DB, QR_CWD, `UPDATE qr_irab_extraction_runs SET finished_at=datetime('now'),status='failed',error_message=${sql(error.message)} WHERE id=${sql(runId)}`);
    throw error;
  }
}

main();

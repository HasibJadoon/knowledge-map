#!/usr/bin/env node
// Uploads ayah dependency-graph SVGs from local SQLite to R2 bucket km-quran-dep-graphs.
// Key format: dep-graphs/{surah}/{surah}:{ayah}.svg
// After upload, patches clean_text in qr_irab_source_chunks with the r2_key.
//
// Uploads target the *remote* (production) bucket — `wrangler r2 object put`
// defaults to the local simulated store, which the deployed worker never reads.

import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BUCKET      = 'km-quran-dep-graphs';
const QR_DB       = 'km_quran';
const QR_CWD      = new URL('../../workers/quran/', import.meta.url);
const QR_CWD_PATH = new URL('../../workers/quran/', import.meta.url).pathname;
const SOURCE_SLUG  = 'qul_dep_graphs';
const DEFAULT_INPUT = resolve('km_arabic_linguistic/ingestion/Irrab/ayah-dependency-graphs.db');
const CONCURRENCY  = 5;

function args() {
  const a = {
    input: DEFAULT_INPUT,
    surah: null,
    dryRun: !process.argv.includes('--apply'),
    apply: process.argv.includes('--apply'),
    resume: process.argv.includes('--resume'),
  };
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--input') a.input = resolve(process.argv[++i]);
    else if (process.argv[i] === '--surah') a.surah = Number(process.argv[++i]);
  }
  return a;
}

function sql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replaceAll("'", "''")}'`;
}

function sqlite(dbPath, command) {
  const out = execFileSync('sqlite3', ['-json', dbPath, command], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 });
  return JSON.parse(out || '[]');
}

function d1(command) {
  const out = execFileSync(
    'npx', ['wrangler', 'd1', 'execute', QR_DB, '--remote', '--json', '--command', command],
    { cwd: QR_CWD_PATH, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 },
  );
  const parsed = JSON.parse(out);
  for (const r of parsed) if (!r.success) throw new Error(`D1 failed: ${r.error ?? command.slice(0, 200)}`);
  return parsed.at(-1)?.results ?? [];
}

function r2Key(ayahKey) {
  const [surah] = String(ayahKey).split(':');
  return `dep-graphs/${surah}/${ayahKey}.svg`;
}

function uploadToR2Once(key, svgContent) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--remote', '--pipe', '--content-type', 'image/svg+xml'],
      { cwd: QR_CWD_PATH },
    );
    proc.stdin.end(Buffer.from(svgContent, 'utf8'));
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(key);
      else reject(new Error(`R2 upload failed for ${key}: ${stderr.slice(0, 300)}`));
    });
  });
}

async function uploadToR2(key, svgContent, retries = 4) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await uploadToR2Once(key, svgContent);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = 1000 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

async function pool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let i = 0;
  let failed = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      try {
        results[idx] = await tasks[idx]();
      } catch (err) {
        failed++;
        console.error(`[error] ${err.message}`);
        results[idx] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { results, failed };
}

function batched(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main() {
  const config = args();

  const where = config.surah ? `WHERE ayah_key LIKE '${config.surah}:%'` : '';
  const rows = sqlite(config.input, `SELECT ayah_key, text FROM tafsir ${where} WHERE text != '' ORDER BY ayah_key`);
  console.log(`[source] ${rows.length} rows with SVG content`);

  let toUpload = rows;
  if (config.resume) {
    // Find chunks that already have an r2_key in clean_text
    const done = d1(`SELECT source_record_id FROM qr_irab_source_chunks WHERE source_slug=${sql(SOURCE_SLUG)} AND clean_text LIKE '%r2_key%'`);
    const doneKeys = new Set(done.map((r) => r.source_record_id));
    const before = toUpload.length;
    toUpload = toUpload.filter((r) => !doneKeys.has(r.ayah_key));
    console.log(`[resume] skipping ${before - toUpload.length} already-uploaded, uploading ${toUpload.length} remaining`);
  }

  if (!config.apply) {
    const sample = toUpload.slice(0, 5).map((r) => ({ ayah_key: r.ayah_key, svg_bytes: r.text?.length ?? 0, r2_key: r2Key(r.ayah_key) }));
    console.log(JSON.stringify({ dry_run: true, total: toUpload.length, sample }, null, 2));
    return;
  }

  console.log(`[upload] uploading ${toUpload.length} SVGs to R2 with concurrency=${CONCURRENCY} …`);
  const tasks = toUpload.map((row) => () => uploadToR2(r2Key(row.ayah_key), row.text));
  const { results, failed } = await pool(tasks, CONCURRENCY);
  const uploaded = results.filter(Boolean).length;
  console.log(`[upload] done: ${uploaded} uploaded, ${failed} failed`);

  // Patch D1 clean_text to include r2_key for successfully uploaded chunks
  const successful = toUpload.filter((_, idx) => results[idx] !== null);
  console.log(`[d1] patching ${successful.length} chunk clean_text records …`);

  for (const batch of batched(successful, 20)) {
    const stmts = batch.map((row) => {
      const key = r2Key(row.ayah_key);
      const meta = JSON.stringify({ r2_key: key, svg_bytes: row.text?.length ?? 0, source_db: 'ayah-dependency-graphs.db' });
      return `UPDATE qr_irab_source_chunks SET clean_text=${sql(meta)}, updated_at=datetime('now') WHERE source_slug=${sql(SOURCE_SLUG)} AND source_record_id=${sql(row.ayah_key)}`;
    });
    d1(stmts.join(';\n') + ';');
  }

  const check = d1(`SELECT COUNT(*) as patched FROM qr_irab_source_chunks WHERE source_slug=${sql(SOURCE_SLUG)} AND clean_text LIKE '%r2_key%'`)[0];
  console.log(JSON.stringify({ uploaded, failed, d1_patched: check.patched }, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });

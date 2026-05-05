#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './config.mjs';
import { D1Client, sql } from './db.mjs';
import { QdrantClient } from './qdrant.mjs';

const WORK_DIR = new URL('../../', import.meta.url).pathname;
const STATE_DIR = join(WORK_DIR, 'temp/lexicon-entry-embeddings');
const RESUME_PID = join(STATE_DIR, 'resume.pid');
const RESUME_LOG = join(STATE_DIR, 'resume.log');
const MONITOR_LOG = join(STATE_DIR, 'monitor.log');
const INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS ?? 30 * 60 * 1000);

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  process.stdout.write(line);
  writeFileSync(MONITOR_LOG, line, { flag: 'a' });
}

function pidRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8').trim();
  return raw ? Number(raw) : null;
}

function startResume() {
  const env = {
    ...process.env,
    MODE: 'resume',
    QDRANT_COLLECTION: process.env.QDRANT_COLLECTION ?? 'km_ar_lexicon_entries_v1',
    BATCH_SIZE: process.env.BATCH_SIZE ?? '100',
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? 'bge-m3:latest',
    EMBEDDING_DIMENSION: process.env.EMBEDDING_DIMENSION ?? '1024',
    D1_MAX_RETRIES: process.env.D1_MAX_RETRIES ?? '5',
    MAX_RETRIES: process.env.MAX_RETRIES ?? '3',
  };
  const logFd = openSync(RESUME_LOG, 'a');
  const child = spawn('node', ['scripts/lexicon-entry-embeddings/run.mjs'], {
    cwd: WORK_DIR,
    env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  writeFileSync(RESUME_PID, String(child.pid));
  log(`started resume pid=${child.pid}`);
}

async function checkOnce() {
  mkdirSync(STATE_DIR, { recursive: true });
  const config = loadConfig({
    ...process.env,
    MODE: 'validate',
    QDRANT_COLLECTION: process.env.QDRANT_COLLECTION ?? 'km_ar_lexicon_entries_v1',
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? 'bge-m3:latest',
    EMBEDDING_DIMENSION: process.env.EMBEDDING_DIMENSION ?? '1024',
  });
  const db = new D1Client(config);
  const qdrant = new QdrantClient(config);
  const sqlEntries = Number(db.query('SELECT COUNT(*) AS n FROM ar_ling_lexicon_entries')[0]?.n ?? 0);
  const tracking = db.query(`
    SELECT
      COUNT(*) AS tracking_rows,
      SUM(CASE WHEN status = 'embedded' THEN 1 ELSE 0 END) AS embedded,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
    FROM ar_ling_lexicon_entry_embeddings
    WHERE collection_name = ${sql(config.collection)}
      AND embedding_model = ${sql(config.embeddingModel)}
  `)[0];
  const qdrantPoints = await qdrant.collectionCount();
  const pid = readPid(RESUME_PID);
  const running = pidRunning(pid);
  const embedded = Number(tracking?.embedded ?? 0);
  const failed = Number(tracking?.failed ?? 0);

  log(`sql=${sqlEntries} qdrant=${qdrantPoints} embedded=${embedded} failed=${failed} resume_pid=${pid ?? 'none'} running=${running}`);

  if (embedded < sqlEntries && !running) {
    startResume();
  }
}

async function main() {
  await checkOnce();
  setInterval(() => {
    checkOnce().catch((error) => log(`monitor error: ${error.message}`));
  }, INTERVAL_MS);
}

main().catch((error) => {
  log(`fatal monitor error: ${error.message}`);
  process.exit(1);
});

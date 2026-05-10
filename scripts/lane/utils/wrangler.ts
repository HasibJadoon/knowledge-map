/**
 * Wrangler D1 command helpers for Lane import scripts.
 */

import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const DB_NAME = 'km_arabic_linguistic';
export const WRANGLER_CONFIG = 'workers/ar-linguistics/wrangler.toml';

export type D1Target = 'local' | 'remote';

/** Run a wrangler d1 execute command with --command and return JSON rows. */
export function d1Query(
  sql: string,
  target: D1Target = 'local',
): Record<string, unknown>[] {
  const flag = target === 'remote' ? '--remote' : '--local';
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB_NAME, flag,
      '--config', WRANGLER_CONFIG,
      '--command', sql, '--json'],
    { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`wrangler d1 execute failed:\n${result.stderr}`);
  }
  try {
    const parsed = JSON.parse(result.stdout) as Array<{ results?: Record<string, unknown>[] }>;
    return parsed[0]?.results ?? [];
  } catch {
    return [];
  }
}

/** Execute a SQL file against D1. */
export function d1ExecuteFile(
  filePath: string,
  target: D1Target = 'local',
): void {
  const flag = target === 'remote' ? '--remote' : '--local';
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB_NAME, flag,
      '--config', WRANGLER_CONFIG,
      '--file', filePath],
    { encoding: 'utf8', stdio: 'inherit', cwd: process.cwd() },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`wrangler d1 execute file failed: ${filePath}`);
  }
}

/** Execute a SQL string by writing it to a temp file first (avoids shell escaping). */
export function d1ExecuteSql(sql: string, target: D1Target = 'local'): void {
  const tmp = join(tmpdir(), `km-lane-${Date.now()}.sql`);
  writeFileSync(tmp, sql, 'utf8');
  try {
    d1ExecuteFile(tmp, target);
  } finally {
    try { execSync(`rm -f ${tmp}`); } catch { /* ignore */ }
  }
}

/** Run a quick count query and return the number. */
export function d1Count(
  table: string,
  where: string,
  target: D1Target = 'local',
): number {
  const rows = d1Query(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`, target);
  return (rows[0]?.n as number) ?? 0;
}

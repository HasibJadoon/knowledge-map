import { execFileSync } from 'node:child_process';

export function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

export class D1Client {
  constructor(config) {
    this.config = config;
  }

  query(command) {
    let lastError;
    for (let attempt = 1; attempt <= this.config.d1MaxRetries; attempt += 1) {
      try {
        const out = execFileSync(
          'npx',
          ['wrangler', 'd1', 'execute', this.config.dbName, '--remote', '--json', '--command', command],
          {
            cwd: this.config.wranglerCwd,
            encoding: 'utf8',
            maxBuffer: 1024 * 1024 * 256,
          },
        );
        const parsed = JSON.parse(out);
        for (const result of parsed) {
          if (!result.success) throw new Error(`D1 command failed: ${command}`);
        }
        return parsed.at(-1)?.results ?? [];
      } catch (error) {
        lastError = error;
        const message = error?.stdout || error?.message || String(error);
        console.error(`[d1] attempt ${attempt}/${this.config.d1MaxRetries} failed: ${String(message).slice(0, 500)}`);
        if (attempt < this.config.d1MaxRetries) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, this.config.retryBaseMs * attempt);
        }
      }
    }
    throw lastError;
  }

  exec(command) {
    return this.query(command);
  }
}

export function upsertTrackingSql(row) {
  return `
    INSERT INTO ar_ling_lexicon_entry_embeddings (
      entry_id,
      collection_name,
      qdrant_point_id,
      embedding_model,
      embedding_text_hash,
      embedded_at,
      status,
      error_message
    )
    VALUES (
      ${sql(row.entry_id)},
      ${sql(row.collection_name)},
      ${sql(row.qdrant_point_id)},
      ${sql(row.embedding_model)},
      ${sql(row.embedding_text_hash)},
      datetime('now'),
      ${sql(row.status)},
      ${sql(row.error_message)}
    )
    ON CONFLICT(entry_id) DO UPDATE SET
      collection_name = excluded.collection_name,
      qdrant_point_id = excluded.qdrant_point_id,
      embedding_model = excluded.embedding_model,
      embedding_text_hash = excluded.embedding_text_hash,
      embedded_at = excluded.embedded_at,
      status = excluded.status,
      error_message = excluded.error_message
  `;
}

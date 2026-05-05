export function loadConfig(env = process.env) {
  const mode = env.MODE ?? 'validate';
  if (!['reset', 'resume', 'validate'].includes(mode)) {
    throw new Error(`MODE must be reset, resume, or validate. Received: ${mode}`);
  }

  return {
    mode,
    dbName: env.D1_DATABASE_NAME ?? 'km_arabic_linguistic',
    wranglerCwd: env.WRANGLER_CWD ?? new URL('../../workers/ar-linguistics/', import.meta.url).pathname,
    qdrantUrl: env.QDRANT_URL ?? 'http://localhost:6333',
    qdrantApiKey: env.QDRANT_API_KEY ?? '',
    collection: env.QDRANT_COLLECTION ?? 'km_ar_lexicon_entries_v1',
    embeddingProvider: env.EMBEDDING_PROVIDER ?? 'ollama',
    embeddingModel: env.EMBEDDING_MODEL ?? 'bge-m3:latest',
    embeddingDimension: Number(env.EMBEDDING_DIMENSION ?? 1024),
    embeddingUrl: env.EMBEDDING_URL ?? 'http://localhost:11434',
    batchSize: Number(env.BATCH_SIZE ?? 100),
    maxRetries: Number(env.MAX_RETRIES ?? 3),
    d1MaxRetries: Number(env.D1_MAX_RETRIES ?? env.MAX_RETRIES ?? 3),
    retryBaseMs: Number(env.RETRY_BASE_MS ?? 750),
    textMaxChars: Number(env.EMBEDDING_TEXT_MAX_CHARS ?? 12000),
    limit: env.LIMIT ? Number(env.LIMIT) : null,
  };
}

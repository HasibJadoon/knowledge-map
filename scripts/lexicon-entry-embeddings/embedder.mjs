export class OllamaEmbedder {
  constructor(config) {
    this.config = config;
  }

  async embed(texts) {
    const res = await fetch(`${this.config.embeddingUrl}/api/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        input: texts,
        truncate: true,
      }),
    });
    if (!res.ok) throw new Error(`Ollama embed failed ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const vectors = data.embeddings ?? (data.embedding ? [data.embedding] : null);
    if (!Array.isArray(vectors) || !vectors.every(Array.isArray)) {
      throw new Error('Ollama response did not contain embedding vectors');
    }
    return vectors;
  }
}

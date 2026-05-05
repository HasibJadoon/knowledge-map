export class QdrantClient {
  constructor(config) {
    this.config = config;
  }

  headers() {
    const headers = { 'content-type': 'application/json' };
    if (this.config.qdrantApiKey) headers['api-key'] = this.config.qdrantApiKey;
    return headers;
  }

  async request(method, path, body, ok404 = false) {
    const res = await fetch(`${this.config.qdrantUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (ok404 && res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Qdrant ${method} ${path} failed ${res.status}: ${await res.text()}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async recreateCollection() {
    await this.request('DELETE', `/collections/${encodeURIComponent(this.config.collection)}`, undefined, true);
    await this.createCollection();
  }

  async createCollection() {
    const existing = await this.request('GET', `/collections/${encodeURIComponent(this.config.collection)}`, undefined, true);
    if (existing) return;
    await this.request('PUT', `/collections/${encodeURIComponent(this.config.collection)}`, {
      vectors: {
        size: this.config.embeddingDimension,
        distance: 'Cosine',
      },
    });
  }

  async collectionCount() {
    const data = await this.request('GET', `/collections/${encodeURIComponent(this.config.collection)}`, undefined, true);
    return data?.result?.points_count ?? 0;
  }

  async upsert(points) {
    if (points.length === 0) return;
    await this.request('PUT', `/collections/${encodeURIComponent(this.config.collection)}/points?wait=true`, {
      points,
    });
  }
}

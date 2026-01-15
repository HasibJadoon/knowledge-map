import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../services/AuthService';

@Injectable({ providedIn: 'root' })
export class PodcastService {
  private auth = inject(AuthService);
  private readonly baseUrl = '/podcast_episodes';

  async list(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/podcast_episodes?${query}` : this.baseUrl;
    return this.request(url);
  }

  async get(id: number | string) {
    return this.request(`/podcast_episodes/${id}`);
  }

  async create(payload: unknown) {
    return this.request(this.baseUrl, { method: 'POST', body: JSON.stringify(payload) });
  }

  async update(id: number | string, payload: unknown) {
    return this.request(`/podcast_episodes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async remove(id: number | string) {
    return this.request(`/podcast_episodes/${id}`, { method: 'DELETE' });
  }

  private async request(url: string, init: RequestInit = {}) {
    const headers: HeadersInit = {
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
      ...(init.headers ?? {})
    };

    const res = await fetch(url, { ...init, headers });
    const raw = await res.text();
    const data = raw ? this.safeJsonParse(raw) : null;

    if (!res.ok) {
      const message = data?.error || data?.message || raw || `HTTP ${res.status}`;
      throw new Error(message);
    }

    return data ?? raw;
  }

  private safeJsonParse(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

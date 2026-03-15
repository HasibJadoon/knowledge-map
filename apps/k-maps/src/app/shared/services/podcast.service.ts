import { Injectable, inject } from '@angular/core';
import { AuthService } from './AuthService';
import { API_BASE } from '../api-base';

export interface PodcastContentItem {
  id: string;
  canonical_input: string;
  user_id: number;
  title: string;
  content_type: string;
  status: string;
  related_type: string | null;
  related_id: string | null;
  refs_json: Record<string, unknown>;
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface PodcastListResponse {
  ok: boolean;
  items: PodcastContentItem[];
}

export interface PodcastItemResponse {
  ok: boolean;
  item: PodcastContentItem;
}

@Injectable({ providedIn: 'root' })
export class PodcastService {
  private auth = inject(AuthService);
  private readonly baseUrl = `${API_BASE}/podcast`;

  async list(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${this.baseUrl}/list?${query}` : `${this.baseUrl}/list`;
    return this.request<PodcastListResponse>(url);
  }

  async get(id: number | string) {
    return this.request<PodcastItemResponse>(`${this.baseUrl}/${id}`);
  }

  async create(payload: unknown) {
    return this.request<PodcastItemResponse>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async update(id: number | string, payload: unknown) {
    return this.request<PodcastItemResponse>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async remove(id: number | string) {
    return this.request(`${this.baseUrl}/${id}`, { method: 'DELETE' });
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
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

    return (data ?? raw) as T;
  }

  private safeJsonParse(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

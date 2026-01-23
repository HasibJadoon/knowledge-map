import { Injectable, inject } from '@angular/core';
import { AuthService } from './AuthService';
import { API_BASE } from '../api-base';

export interface DocSummary {
  slug: string;
  title: string;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string | null;
}

export interface DocDetail extends DocSummary {
  body_md: string;
  body_json: unknown;
}

export interface DocListResponse {
  ok: boolean;
  total: number;
  limit: number;
  offset: number;
  results: DocSummary[];
}

export interface DocResponse {
  ok: boolean;
  doc: DocDetail;
}

@Injectable({ providedIn: 'root' })
export class DocsService {
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${API_BASE}/docs`;

  async list(params: Record<string, string> = {}): Promise<DocListResponse> {
    const queryParams = new URLSearchParams({ status: 'published', ...params }).toString();
    const url = queryParams ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    return this.request(url);
  }

  async get(slug: string): Promise<DocResponse> {
    return this.request(`${this.baseUrl}/${encodeURIComponent(slug)}`);
  }

  private async request(url: string, init: RequestInit = {}): Promise<any> {
    const headers: HeadersInit = {
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
      ...(init.headers ?? {}),
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

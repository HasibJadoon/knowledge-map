import { Injectable, inject } from '@angular/core';

import { API_BASE } from '../api-base';
import { AuthService } from './AuthService';

export interface WorldviewSourceRecord {
  id: string;
  canonical_input: string;
  source_type: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  creator: string | null;
  publisher: string | null;
  publication_year: number | null;
  language: string | null;
  source_url: string | null;
  source_ref: string | null;
  status: string;
  source_json: Record<string, unknown>;
  meta_json: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface WorldviewSourceUnitRecord {
  id: string;
  parent_unit_id: string | null;
  unit_type: string;
  title: string;
  order_index: number;
  summary: string | null;
  locator_label: string | null;
  unit_json: Record<string, unknown>;
}

export interface WorldviewSourceContentDocument {
  id: string;
  title: string;
  summary: string | null;
  doc_type: string;
  related_node_id: string | null;
  document_json: Record<string, unknown>;
  meta_json: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface WorldviewSourceContentPodcast {
  id: string;
  title: string;
  status: string;
  related_id: string | null;
  refs_json: Record<string, unknown>;
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface WorldviewSourceContentNode {
  id: string;
  node_type: string;
  title: string;
  text_plain: string;
  summary: string;
  slug: string;
  meta_json: Record<string, unknown>;
}

export interface WorldviewWorkflowResponse {
  ok: boolean;
  sources: WorldviewSourceRecord[];
  units: WorldviewSourceUnitRecord[];
}

export interface WorldviewSourceContentResponse {
  ok: boolean;
  source: WorldviewSourceRecord;
  units: WorldviewSourceUnitRecord[];
  documents: WorldviewSourceContentDocument[];
  podcasts: WorldviewSourceContentPodcast[];
  nodes: WorldviewSourceContentNode[];
}

@Injectable({ providedIn: 'root' })
export class WorldviewSourcesService {
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${API_BASE}/worldview`;

  workflow() {
    return this.request<WorldviewWorkflowResponse>(`${this.baseUrl}/workflow`);
  }

  sourceContent(sourceId: string, sourceUnitId?: string) {
    const query = new URLSearchParams({
      source_id: sourceId,
      ...(sourceUnitId ? { source_unit_id: sourceUnitId } : {}),
    }).toString();

    return this.request<WorldviewSourceContentResponse>(`${this.baseUrl}/source-content?${query}`);
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
      ...(init.headers ?? {}),
    };

    const response = await fetch(url, {
      ...init,
      headers,
    });

    const raw = await response.text();
    const data = raw ? this.safeJsonParse(raw) : null;

    if (!response.ok) {
      const message = data?.error || data?.message || raw || `HTTP ${response.status}`;
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

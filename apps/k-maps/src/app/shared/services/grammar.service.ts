import { Injectable } from '@angular/core';
import { AuthService } from './AuthService';
import { API_BASE } from '../api-base';

@Injectable({ providedIn: 'root' })
export class GrammarService {
  private readonly baseUrl = `${API_BASE}/ar/grammar`;

  constructor(private auth: AuthService) {}

  async listSources() {
    return this.request(`${this.baseUrl}/sources`);
  }

  async listUnits(params: {
    source?: string;
    unit_type?: string;
    parent_id?: string;
    q?: string;
    include_items?: boolean;
  }) {
    const qs = new URLSearchParams();
    if (params.source) qs.set('source', params.source);
    if (params.unit_type) qs.set('unit_type', params.unit_type);
    if (params.parent_id) qs.set('parent_id', params.parent_id);
    if (params.q) qs.set('q', params.q);
    if (params.include_items) qs.set('include_items', '1');
    return this.request(`${this.baseUrl}/units?${qs.toString()}`);
  }

  async createUnit(payload: Record<string, unknown>) {
    return this.request(`${this.baseUrl}/units`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateUnit(id: string, payload: Record<string, unknown>) {
    return this.request(`${this.baseUrl}/units`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...payload }),
    });
  }

  async deleteUnit(id: string) {
    return this.request(`${this.baseUrl}/units?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async listUnitItems(unitId: string) {
    const qs = new URLSearchParams({ unit_id: unitId });
    return this.request(`${this.baseUrl}/unit-items?${qs.toString()}`);
  }

  async createUnitItem(payload: Record<string, unknown>) {
    return this.request(`${this.baseUrl}/unit-items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateUnitItem(id: string, payload: Record<string, unknown>) {
    return this.request(`${this.baseUrl}/unit-items`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...payload }),
    });
  }

  async deleteUnitItem(id: string) {
    return this.request(`${this.baseUrl}/unit-items?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async listConcepts() {
    return this.request(`${this.baseUrl}/concepts`);
  }

  async createConcept(payload: Record<string, unknown>) {
    return this.request(`${this.baseUrl}/concepts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateConcept(id: string, payload: Record<string, unknown>) {
    return this.request(`${this.baseUrl}/concepts`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...payload }),
    });
  }

  async listExamples(params: { grammar_id?: string; q?: string; type?: string }) {
    const qs = new URLSearchParams();
    if (params.grammar_id) qs.set('grammar_id', params.grammar_id);
    if (params.q) qs.set('q', params.q);
    if (params.type) qs.set('type', params.type);
    return this.request(`${this.baseUrl}/examples?${qs.toString()}`);
  }

  async createExample(payload: Record<string, unknown>) {
    return this.request(`${this.baseUrl}/examples`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateExample(id: number, payload: Record<string, unknown>) {
    return this.request(`${this.baseUrl}/examples`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...payload }),
    });
  }

  async deleteExample(id: number) {
    return this.request(`${this.baseUrl}/examples?id=${id}`, {
      method: 'DELETE',
    });
  }

  private async request(url: string, init: RequestInit = {}) {
    const headers: HeadersInit = {
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
      ...(init.headers ?? {}),
    };

    const res = await fetch(url, { ...init, headers });
    const raw = await res.text();
    const data = raw ? this.safeJsonParse(raw) : null;

    if (!res.ok) {
      const message = (data as any)?.error || (data as any)?.message || raw || `HTTP ${res.status}`;
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

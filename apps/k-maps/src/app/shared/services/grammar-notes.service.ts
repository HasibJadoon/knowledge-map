import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../services/AuthService';
import { API_BASE } from '../api-base';

@Injectable({ providedIn: 'root' })
export class GrammarNotesService {
  private auth = inject(AuthService);
  private readonly baseUrl = `${API_BASE}/grammar_notes`;

  async list(lessonId: number | string) {
    return this.request(`${this.baseUrl}?lesson_id=${lessonId}`);
  }

  async replaceForLesson(lessonId: number | string, notes: unknown[]) {
    return this.request(`${this.baseUrl}?lesson_id=${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify({ notes })
    });
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

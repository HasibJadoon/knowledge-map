import { inject, Injectable } from '@angular/core';
import { API_BASE } from '../api-base';
import { AuthService } from '../../../services/AuthService';

export interface LessonGeneratorServiceResult {
  raw: string;
  data: unknown;
}

@Injectable({ providedIn: 'root' })
export class LessonGeneratorService {
  private auth = inject(AuthService);
  private readonly endpoint = `${API_BASE}/lesson-generate`;

  async generate(lesson: unknown, options?: { model?: string; max_tokens?: number }) {
    const headers: HeadersInit = {
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    };

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ lesson, options }),
    });

    const raw = await res.text();
    const data = raw ? this.safeJsonParse(raw) : null;

    if (!res.ok) {
      const message = data?.error ?? data?.message ?? raw ?? `HTTP ${res.status}`;
      throw new Error(message);
    }

    return {
      raw,
      data: data ?? raw,
    } satisfies LessonGeneratorServiceResult;
  }

  private safeJsonParse(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

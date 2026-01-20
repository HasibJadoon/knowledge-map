import { inject, Injectable } from '@angular/core';
import { API_BASE } from '../api-base';
import { AuthService } from '../../../services/AuthService';

export interface LessonGeneratorServiceResult {
  raw: string;
  data: unknown;
}

export interface ClaudeRawGenerationSuccess {
  ok: true;
  lesson: any;
  raw_output: string;
  attempts: number;
  warnings?: string[];
  note?: string;
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

  async generateFromText(params: {
    text: string;
    surah?: number;
    mode?: 'ayah' | 'sentence';
    options?: { max_tokens?: number; model?: string };
  }) {
    const headers: HeadersInit = {
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    };

    const res = await fetch(`${this.endpoint}-raw`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: params.text,
        surah: params.surah,
        mode: params.mode,
        options: params.options,
      }),
    });

    const raw = await res.text();
    const data = raw ? this.safeJsonParse(raw) : null;

    if (!res.ok) {
      const message = data?.error ?? data?.message ?? raw ?? `HTTP ${res.status}`;
      throw new Error(message);
    }

    if (!data) {
      throw new Error('Unexpected Claude response');
    }

    if (data?.ok === false) {
      throw new Error(data.error ?? 'Failed to parse Claude response');
    }

    return data as ClaudeRawGenerationSuccess;
  }

  private safeJsonParse(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

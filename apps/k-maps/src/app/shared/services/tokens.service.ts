import { Injectable } from '@angular/core';
import { AuthService } from './AuthService';
import { API_BASE } from '../api-base';
import { TokenListResponse, TokenRow } from '../models/arabic/token.model';

@Injectable({ providedIn: 'root' })
export class TokensService {
  constructor(private auth: AuthService) {}

  async list(filters: {
    q?: string;
    pos?: string;
    page?: number;
    pageSize?: number;
  }): Promise<TokenListResponse> {
    const params = new URLSearchParams();
    if (filters.q) {
      params.set('q', filters.q);
    }
    if (filters.pos) {
      params.set('pos', filters.pos);
    }
    if (filters.page) {
      params.set('page', String(filters.page));
    }
    if (filters.pageSize) {
      params.set('pageSize', String(filters.pageSize));
    }

    const res = await fetch(`${API_BASE}/ar/tokens?${params.toString()}`, {
      headers: {
        ...this.auth.authHeaders(),
        'content-type': 'application/json',
      },
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? `Failed to load tokens (${res.status})`);
    }

    return (await res.json()) as TokenListResponse;
  }

  async update(
    id: string,
    payload: {
      lemma_ar: string;
      lemma_norm: string;
      pos: string;
      root_norm?: string | null;
      ar_u_root?: string | null;
      meta?: Record<string, unknown> | null;
    }
  ): Promise<TokenRow> {
    const res = await fetch(`${API_BASE}/ar/tokens`, {
      method: 'PUT',
      headers: {
        ...this.auth.authHeaders(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id, ...payload }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? `Failed to update token (${res.status})`);
    }

    const data = (await res.json()) as { ok: boolean; result: TokenRow };
    return data.result;
  }
}

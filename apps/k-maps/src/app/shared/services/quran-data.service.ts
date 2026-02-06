import { Injectable } from '@angular/core';

import { AuthService } from './AuthService';
import { API_BASE } from '../api-base';
import {
  QuranSurahListResponse,
  QuranAyahListResponse,
  QuranLemmaListResponse,
  QuranLemmaLocationListResponse,
} from '../models/arabic/quran-data.model';

@Injectable({ providedIn: 'root' })
export class QuranDataService {
  constructor(private auth: AuthService) {}

  async listSurahs(params: {
    q?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<QuranSurahListResponse> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));

    const res = await fetch(`${API_BASE}/ar/quran/surahs?${search.toString()}`, {
      headers: {
        ...this.auth.authHeaders(),
        'content-type': 'application/json',
      },
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? `Failed to load surahs (${res.status})`);
    }

    return (await res.json()) as QuranSurahListResponse;
  }

  async listAyahs(params: {
    surah: number;
    page?: number;
    pageSize?: number;
  }): Promise<QuranAyahListResponse> {
    const search = new URLSearchParams();
    search.set('surah', String(params.surah));
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));

    const res = await fetch(`${API_BASE}/ar/quran/ayahs?${search.toString()}`, {
      headers: {
        ...this.auth.authHeaders(),
        'content-type': 'application/json',
      },
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? `Failed to load ayahs (${res.status})`);
    }

    return (await res.json()) as QuranAyahListResponse;
  }

  async listLemmas(params: {
    q?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<QuranLemmaListResponse> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));

    const res = await fetch(`${API_BASE}/ar/quran/lemmas?${search.toString()}`, {
      headers: {
        ...this.auth.authHeaders(),
        'content-type': 'application/json',
      },
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? `Failed to load lemmas (${res.status})`);
    }

    return (await res.json()) as QuranLemmaListResponse;
  }

  async listLemmaLocations(params: {
    q?: string;
    lemmaId?: number;
    surah?: number;
    ayah?: number;
    page?: number;
    pageSize?: number;
  } = {}): Promise<QuranLemmaLocationListResponse> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.lemmaId) search.set('lemma_id', String(params.lemmaId));
    if (params.surah) search.set('surah', String(params.surah));
    if (params.ayah) search.set('ayah', String(params.ayah));
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));

    const res = await fetch(`${API_BASE}/ar/quran/lemma-locations?${search.toString()}`, {
      headers: {
        ...this.auth.authHeaders(),
        'content-type': 'application/json',
      },
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? `Failed to load lemma locations (${res.status})`);
    }

    return (await res.json()) as QuranLemmaLocationListResponse;
  }
}

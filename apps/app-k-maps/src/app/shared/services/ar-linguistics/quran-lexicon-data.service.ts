import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';

type PagedResponse<T> = {
  ok?: boolean;
  error?: string;
  total?: number;
  limit?: number;
  offset?: number;
  results?: T[];
};

type ItemResponse<T> = {
  ok?: boolean;
  error?: string;
  result?: T | null;
};

type QuranLexiconSynonymsResponse = {
  ok?: boolean;
  error?: string;
  topic_ids?: unknown;
  topics?: unknown;
  entries?: unknown;
  synonyms_json?: unknown;
  lexicon?: unknown;
};

export interface QuranLexiconMorphologyLink {
  ar_u_lexicon: string;
  ar_u_morphology: string;
  link_role: string;
  created_at: string | null;
  surface_ar: string | null;
  surface_norm: string | null;
  pos2: string | null;
  derived_pattern: string | null;
  verb_form: string | null;
}

export interface QuranLexiconEvidenceRow {
  source_code: string;
  title: string;
  chunk_id: string | null;
  page_no: number | null;
  extract_text: string | null;
  notes: string | null;
}

export interface QuranMorphologyDetail {
  ar_u_morphology: string;
  canonical_input: string;
  surface_ar: string;
  surface_norm: string;
  pos2: string;
  derivation_type: string | null;
  noun_number: string | null;
  verb_form: string | null;
  derived_from_verb_form: string | null;
  derived_pattern: string | null;
  transitivity: string | null;
  obj_count: number | null;
  tags_ar: unknown;
  tags_en: unknown;
  notes: string | null;
  meta: unknown;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuranLexiconMorphologyPayload {
  ar_u_lexicon: string;
  lemma_ar: string | null;
  lemma_norm: string | null;
  root_norm: string | null;
  pos: string | null;
  morph_pattern: string | null;
  morph_features: unknown;
  morph_derivations: unknown;
}

export interface QuranLexiconSynonymTopic {
  topic_id: string;
  topic_en: string;
  topic_ur: string | null;
  meta: unknown;
}

export interface QuranLexiconSynonymWord {
  topic_id: string | null;
  word_norm: string | null;
  word_ar: string | null;
  word_en: string | null;
  root_norm: string | null;
  root_ar: string | null;
  order_index: number | null;
}

export interface QuranLexiconBundle {
  lexiconId: string;
  morphologyLinks: QuranLexiconMorphologyLink[];
  evidenceRows: QuranLexiconEvidenceRow[];
  morphologyById: Record<string, QuranMorphologyDetail>;
  synonymTopicIds: string[];
  synonymTopics: QuranLexiconSynonymTopic[];
  synonymWords: QuranLexiconSynonymWord[];
  lexiconMorphology: QuranLexiconMorphologyPayload | null;
}

@Injectable({ providedIn: 'root' })
export class QuranLexiconDataService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Promise<QuranLexiconBundle>>();

  getLexiconBundle(lexiconId: string, options: { refresh?: boolean } = {}): Promise<QuranLexiconBundle> {
    const normalized = String(lexiconId ?? '').trim();
    if (!normalized) {
      return Promise.resolve({
        lexiconId: '',
        morphologyLinks: [],
        evidenceRows: [],
        morphologyById: {},
        synonymTopicIds: [],
        synonymTopics: [],
        synonymWords: [],
        lexiconMorphology: null,
      });
    }

    if (options.refresh) {
      this.cache.delete(normalized);
    }

    const cached = this.cache.get(normalized);
    if (cached) return cached;

    const pending = this.loadBundle(normalized).catch((error: unknown) => {
      this.cache.delete(normalized);
      throw error;
    });
    this.cache.set(normalized, pending);
    return pending;
  }

  private async loadBundle(lexiconId: string): Promise<QuranLexiconBundle> {
    const [morphologyLinks, evidenceRows, synonyms] = await Promise.all([
      this.fetchAllMorphologyLinks(lexiconId),
      this.fetchAllEvidenceRows(lexiconId),
      this.fetchSynonymsByLexicon(lexiconId),
    ]);

    const morphologyIds = Array.from(
      new Set(
        morphologyLinks
          .map((row) => String(row.ar_u_morphology ?? '').trim())
          .filter((id) => id.length > 0)
      )
    );
    const morphologyById = await this.fetchMorphologyByIds(morphologyIds);

    return {
      lexiconId,
      morphologyLinks,
      evidenceRows,
      morphologyById,
      synonymTopicIds: synonyms.topicIds,
      synonymTopics: synonyms.topics,
      synonymWords: synonyms.words,
      lexiconMorphology: synonyms.lexiconMorphology,
    };
  }

  private async fetchAllMorphologyLinks(lexiconId: string): Promise<QuranLexiconMorphologyLink[]> {
    return this.fetchAllPages<QuranLexiconMorphologyLink>(
      (limit, offset) =>
        this.fetchJson<PagedResponse<QuranLexiconMorphologyLink>>(
          `${environment.apiBase}/ar/lexicon-morphology?ar_u_lexicon=${encodeURIComponent(lexiconId)}&limit=${limit}&offset=${offset}`
        ),
      200,
      2500
    );
  }

  private async fetchAllEvidenceRows(lexiconId: string): Promise<QuranLexiconEvidenceRow[]> {
    return this.fetchAllPages<QuranLexiconEvidenceRow>(
      (limit, offset) =>
        this.fetchJson<PagedResponse<QuranLexiconEvidenceRow>>(
          `${environment.apiBase}/ar/book-search?mode=lexicon&ar_u_lexicon=${encodeURIComponent(lexiconId)}&limit=${limit}&offset=${offset}`
        ),
      200,
      2500
    );
  }

  private async fetchSynonymsByLexicon(lexiconId: string): Promise<{
    topicIds: string[];
    topics: QuranLexiconSynonymTopic[];
    words: QuranLexiconSynonymWord[];
    lexiconMorphology: QuranLexiconMorphologyPayload | null;
  }> {
    try {
      const payload = await this.fetchJson<QuranLexiconSynonymsResponse>(
        `${environment.apiBase}/ar/lexicon-synonyms?ar_u_lexicon=${encodeURIComponent(lexiconId)}`
      );
      if (payload.ok === false) {
        return { topicIds: [], topics: [], words: [], lexiconMorphology: null };
      }

      const topicIds = Array.isArray(payload.topic_ids)
        ? payload.topic_ids.map((entry) => String(entry ?? '').trim()).filter(Boolean)
        : [];

      const topics = this.parseSynonymTopics(payload.topics);
      const entryRows = this.parseSynonymWords(payload.entries);
      const synonymJsonRows = this.parseSynonymWords(payload.synonyms_json);
      const words = this.mergeSynonymWords(entryRows, synonymJsonRows);
      const lexiconMorphology = this.parseLexiconMorphologyPayload(payload.lexicon);
      return { topicIds, topics, words, lexiconMorphology };
    } catch {
      return { topicIds: [], topics: [], words: [], lexiconMorphology: null };
    }
  }

  private async fetchAllPages<T>(
    fetchPage: (limit: number, offset: number) => Promise<PagedResponse<T>>,
    pageSize: number,
    maxRows: number
  ): Promise<T[]> {
    const rows: T[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total && rows.length < maxRows) {
      const page = await fetchPage(pageSize, offset);
      if (page.ok === false) {
        throw new Error(page.error ?? 'Request failed.');
      }

      const resultRows = Array.isArray(page.results) ? page.results : [];
      rows.push(...resultRows);

      const reportedTotal = Number(page.total);
      total = Number.isFinite(reportedTotal) ? reportedTotal : offset + resultRows.length;
      if (!resultRows.length) break;
      offset += resultRows.length;
      if (resultRows.length < pageSize) break;
    }

    if (rows.length > maxRows) {
      return rows.slice(0, maxRows);
    }
    return rows;
  }

  private async fetchMorphologyByIds(ids: string[]): Promise<Record<string, QuranMorphologyDetail>> {
    const byId: Record<string, QuranMorphologyDetail> = {};
    if (!ids.length) return byId;

    const settled = await Promise.all(
      ids.map(async (id) => {
        try {
          const payload = await this.fetchJson<ItemResponse<QuranMorphologyDetail>>(
            `${environment.apiBase}/ar/morphology?id=${encodeURIComponent(id)}`
          );
          if (payload.ok === false) return null;
          const record = payload.result;
          if (!record || typeof record !== 'object') return null;
          return { id, record };
        } catch {
          return null;
        }
      })
    );

    for (const entry of settled) {
      if (!entry) continue;
      byId[entry.id] = entry.record;
    }
    return byId;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    try {
      return await firstValueFrom(this.http.get<T>(url));
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const body = error.error;
        const bodyMessage =
          typeof body === 'string'
            ? body
            : (typeof body?.error === 'string' ? body.error : (typeof body?.message === 'string' ? body.message : ''));
        throw new Error(bodyMessage || `Request failed (${error.status})`);
      }

      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  private parseSynonymTopics(value: unknown): QuranLexiconSynonymTopic[] {
    if (!Array.isArray(value)) return [];
    const topics: QuranLexiconSynonymTopic[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const topicId = String(row['topic_id'] ?? '').trim();
      const topicEn = String(row['topic_en'] ?? '').trim();
      if (!topicId || !topicEn) continue;
      const topicUrRaw = String(row['topic_ur'] ?? '').trim();
      topics.push({
        topic_id: topicId,
        topic_en: topicEn,
        topic_ur: topicUrRaw || null,
        meta: row['meta'],
      });
    }
    return topics;
  }

  private parseSynonymWords(value: unknown): QuranLexiconSynonymWord[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item, index) => {
        if (typeof item === 'string') {
          const text = item.trim();
          if (!text) return null;
          return {
            topic_id: null,
            word_norm: text,
            word_ar: null,
            word_en: text,
            root_norm: null,
            root_ar: null,
            order_index: index,
          } satisfies QuranLexiconSynonymWord;
        }

        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const row = item as Record<string, unknown>;
        const topicId = String(row['topic_id'] ?? '').trim() || null;
        const wordNorm = String(row['word_norm'] ?? '').trim() || null;
        const wordAr = String(row['word_ar'] ?? '').trim() || null;
        const wordEn = String(row['word_en'] ?? '').trim() || null;
        const rootNorm = String(row['root_norm'] ?? '').trim() || null;
        const rootAr = String(row['root_ar'] ?? '').trim() || null;
        const orderRaw = Number(row['order_index']);

        if (!wordNorm && !wordAr && !wordEn) return null;
        return {
          topic_id: topicId,
          word_norm: wordNorm,
          word_ar: wordAr,
          word_en: wordEn,
          root_norm: rootNorm,
          root_ar: rootAr,
          order_index: Number.isFinite(orderRaw) ? Math.trunc(orderRaw) : null,
        } satisfies QuranLexiconSynonymWord;
      })
      .filter((row): row is QuranLexiconSynonymWord => row != null);
  }

  private mergeSynonymWords(
    first: QuranLexiconSynonymWord[],
    second: QuranLexiconSynonymWord[]
  ): QuranLexiconSynonymWord[] {
    const seen = new Set<string>();
    const merged: QuranLexiconSynonymWord[] = [];

    for (const item of [...first, ...second]) {
      const key = `${item.topic_id || ''}|${item.word_norm || ''}|${item.word_ar || ''}|${item.word_en || ''}`;
      if (!key.trim() || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }

    return merged;
  }

  private parseLexiconMorphologyPayload(value: unknown): QuranLexiconMorphologyPayload | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const row = value as Record<string, unknown>;
    const lexiconId = String(row['ar_u_lexicon'] ?? '').trim();
    if (!lexiconId) return null;

    const textOrNull = (entry: unknown): string | null => {
      const valueText = String(entry ?? '').trim();
      return valueText || null;
    };

    return {
      ar_u_lexicon: lexiconId,
      lemma_ar: textOrNull(row['lemma_ar']),
      lemma_norm: textOrNull(row['lemma_norm']),
      root_norm: textOrNull(row['root_norm']),
      pos: textOrNull(row['pos']),
      morph_pattern: textOrNull(row['morph_pattern']),
      morph_features: row['morph_features'],
      morph_derivations: row['morph_derivations'],
    };
  }
}

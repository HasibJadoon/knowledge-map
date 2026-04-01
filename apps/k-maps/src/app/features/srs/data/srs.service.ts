import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SrsCardVm } from '../../../shared/services/surah-modules.service';

export type SrsQueueFilter = 'due' | 'upcoming' | 'all' | 'suspended';
export type SrsRating = 'again' | 'hard' | 'good' | 'easy';
export type SrsSourceMode = 'api';
export type SrsDeckId =
  | 'arabic-linguistics'
  | 'arabic-literature'
  | 'quran-idioms'
  | 'quran-concepts'
  | 'worldview-history'
  | 'english-language';

export interface SrsDeckMeta {
  id: SrsDeckId;
  index: number;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  monogram: string;
  footer: string;
}

export const SRS_DECKS: readonly SrsDeckMeta[] = [
  {
    id: 'arabic-linguistics',
    index: 1,
    label: 'Arabic Linguistics',
    shortLabel: 'Linguistics',
    description: 'Balagha, sarf, nahw, and structural Arabic analysis.',
    accent: '#d0ad56',
    monogram: 'ع',
    footer: 'Balagha • Sarf • Nahw',
  },
  {
    id: 'arabic-literature',
    index: 2,
    label: 'Arabic Literature',
    shortLabel: 'Literature',
    description: 'Idioms, adab, poetry, and literary expression.',
    accent: '#b985ff',
    monogram: '✒',
    footer: 'Idioms • Adab • Poetry',
  },
  {
    id: 'quran-idioms',
    index: 3,
    label: 'Quran Expressions',
    shortLabel: 'Quran Idioms',
    description: 'Quranic expressions, verbal idioms, and phrase patterns.',
    accent: '#57c7a8',
    monogram: '۝',
    footer: 'Verbs • Phrases • Usage',
  },
  {
    id: 'quran-concepts',
    index: 4,
    label: 'Quranic Concepts',
    shortLabel: 'Concepts',
    description: 'Quranic concepts, worldview nodes, and thematic topics.',
    accent: '#6aa8ff',
    monogram: '◎',
    footer: 'Themes • Topics • Nodes',
  },
  {
    id: 'worldview-history',
    index: 5,
    label: 'Worldviews',
    shortLabel: 'Worldviews',
    description: 'Modernity, biblical material, civilizational memory, and worldview history.',
    accent: '#ff9f63',
    monogram: '✦',
    footer: 'Worldviews • Modernity • Biblical',
  },
  {
    id: 'english-language',
    index: 6,
    label: 'English Language',
    shortLabel: 'English',
    description: 'Expression, writing clarity, vocabulary, and style control.',
    accent: '#7fdc8f',
    monogram: '✎',
    footer: 'Writing • Expression • Style',
  },
] as const;

const SRS_DECK_MAP = new Map<SrsDeckId, SrsDeckMeta>(
  SRS_DECKS.map((deck) => [deck.id, deck]),
);

export interface SrsSummary {
  due: number;
  upcoming: number;
  suspended: number;
  total: number;
}

export interface SrsQueueItem extends SrsCardVm {
  id: string;
  surah_id: number | null;
  deck_id: SrsDeckId;
  deck_label: string;
  due_state: Exclude<SrsQueueFilter, 'all'>;
  prompt: string;
  answer: string;
  title: string;
  reference: string;
}

export interface SrsQueueResponse {
  ok: boolean;
  filter: SrsQueueFilter;
  total: number;
  items: SrsQueueItem[];
  summary: SrsSummary;
  source: SrsSourceMode;
}

interface ApiSrsCardVm extends SrsCardVm {
  deck_id?: SrsDeckId | null;
  surah_id?: number | null;
}

interface ApiQueueResponse {
  ok: boolean;
  filter: SrsQueueFilter;
  total: number;
  items: ApiSrsCardVm[];
  summary?: Partial<SrsSummary>;
}

interface ApiReviewResponse {
  ok: boolean;
  item: ApiSrsCardVm;
}

interface CardPayload {
  front?: string;
  back?: string;
  prompt?: string;
  answer?: string;
  question?: string;
  meaning?: string;
  title?: string;
  reference?: string;
  ref?: string;
  english?: string;
  translation?: string;
  arabic?: string;
  text?: string;
  deck_id?: SrsDeckId;
}

@Injectable({ providedIn: 'root' })
export class SrsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  listQueue(filter: SrsQueueFilter, surahId: number | null): Observable<SrsQueueResponse> {
    const params = new HttpParams()
      .set('filter', filter)
      .set('limit', '80')
      .set('surah_id', surahId ? String(surahId) : '');

    return this.http.get<ApiQueueResponse>(`${this.base}/quran/srs`, { params }).pipe(
      map((response) => this.normalizeApiResponse(response, filter)),
    );
  }

  reviewCard(item: SrsQueueItem, rating: SrsRating): Observable<SrsQueueItem> {
    return this.http.post<ApiReviewResponse>(`${this.base}/quran/srs/${encodeURIComponent(item.id)}`, { rating }).pipe(
      map((response) => this.decorateItem(response.item)),
    );
  }

  private normalizeApiResponse(response: ApiQueueResponse, filter: SrsQueueFilter): SrsQueueResponse {
    const items = (response.items ?? []).map((item) => this.decorateItem(item));
    const summary = response.summary?.total !== undefined
      ? {
          due: Number(response.summary.due ?? 0),
          upcoming: Number(response.summary.upcoming ?? 0),
          suspended: Number(response.summary.suspended ?? 0),
          total: Number(response.summary.total ?? 0),
        }
      : this.summarize(items);

    return {
      ok: response.ok,
      filter,
      total: Number(response.total ?? items.length),
      items,
      summary,
      source: 'api',
    };
  }

  private summarize(items: SrsQueueItem[]): SrsSummary {
    const summary: SrsSummary = { due: 0, upcoming: 0, suspended: 0, total: items.length };
    for (const item of items) {
      if (item.due_state === 'due') {
        summary.due += 1;
      } else if (item.due_state === 'upcoming') {
        summary.upcoming += 1;
      } else {
        summary.suspended += 1;
      }
    }
    return summary;
  }

  private decorateItem(item: ApiSrsCardVm): SrsQueueItem {
    const payload = this.parseCardPayload(item.card_json);
    const surahId = item.surah_id ?? this.parseSurahId(item.item_key);
    const deck = this.resolveDeck(item, payload, surahId);
    const dueState = this.resolveDueState(item.status, item.due_at);
    const prompt = this.pickText(
      payload.front,
      payload.prompt,
      payload.question,
      payload.arabic,
      payload.text,
      item.item_key,
    );
    const answer = this.pickText(
      payload.back,
      payload.answer,
      payload.meaning,
      payload.english,
      payload.translation,
      'Review this card in context.',
    );
    const reference = this.pickText(
      payload.reference,
      payload.ref,
      surahId ? `Surah ${surahId}` : '',
      item.item_key,
    );
    const title = this.pickText(payload.title, this.humanizeType(item.item_type), `Card ${item.id}`);

    return {
      ...item,
      id: String(item.id),
      surah_id: surahId,
      deck_id: deck.id,
      deck_label: deck.label,
      due_state: dueState,
      prompt,
      answer,
      title,
      reference,
    };
  }

  private parseCardPayload(raw?: string): CardPayload {
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as CardPayload;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private pickText(...values: Array<string | undefined | null>): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  private parseSurahId(itemKey?: string): number | null {
    if (!itemKey) {
      return null;
    }
    const raw = itemKey.split(':')[0];
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private resolveDueState(status?: string, dueAt?: string): Exclude<SrsQueueFilter, 'all'> {
    if ((status ?? '').toLowerCase() === 'suspended') {
      return 'suspended';
    }
    if (!dueAt) {
      return 'upcoming';
    }
    return new Date(dueAt).getTime() <= Date.now() ? 'due' : 'upcoming';
  }

  private humanizeType(itemType: string): string {
    return itemType
      .split(/[_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private resolveDeck(item: ApiSrsCardVm, payload: CardPayload, surahId: number | null): SrsDeckMeta {
    if (item.deck_id && SRS_DECK_MAP.has(item.deck_id)) {
      return SRS_DECK_MAP.get(item.deck_id)!;
    }

    if (payload.deck_id && SRS_DECK_MAP.has(payload.deck_id)) {
      return SRS_DECK_MAP.get(payload.deck_id)!;
    }

    const haystack = [
      item.item_type,
      item.item_key,
      payload.title,
      payload.reference,
      payload.front,
      payload.prompt,
      payload.question,
      payload.answer,
      payload.meaning,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (this.includesAny(haystack, ['english', 'writing', 'essay', 'clarity', 'collocation', 'expression'])) {
      return SRS_DECK_MAP.get('english-language')!;
    }
    if (this.includesAny(haystack, ['modernity', 'biblical', 'history', 'civilization', 'worldview', 'secular'])) {
      return SRS_DECK_MAP.get('worldview-history')!;
    }
    if (this.includesAny(haystack, ['idiom', 'verbal idiom', 'expression', 'phrase']) && surahId) {
      return SRS_DECK_MAP.get('quran-idioms')!;
    }
    if (this.includesAny(haystack, ['balagha', 'nahw', 'sarf', 'syntax', 'morphology', 'linguistics'])) {
      return SRS_DECK_MAP.get('arabic-linguistics')!;
    }
    if (this.includesAny(haystack, ['adab', 'poetry', 'literature', 'idiom', 'rhetoric'])) {
      return SRS_DECK_MAP.get('arabic-literature')!;
    }
    if (surahId) {
      return SRS_DECK_MAP.get('quran-concepts')!;
    }
    return SRS_DECK_MAP.get('worldview-history')!;
  }

  private includesAny(text: string, values: string[]): boolean {
    return values.some((value) => text.includes(value));
  }
}

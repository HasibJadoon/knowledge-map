import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SrsCardVm, SrsResponse } from '../../../shared/services/surah-modules.service';

export type SrsQueueFilter = 'due' | 'upcoming' | 'all' | 'suspended';
export type SrsRating = 'again' | 'hard' | 'good' | 'easy';
export type SrsSourceMode = 'api' | 'demo';
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

interface ApiQueueResponse {
  ok: boolean;
  filter: SrsQueueFilter;
  total: number;
  items: SrsCardVm[];
  summary?: Partial<SrsSummary>;
}

interface ApiReviewResponse {
  ok: boolean;
  item: SrsCardVm;
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

const FEATURED_SURAHS = [1, 2, 18, 36, 55, 67, 112];

const DEMO_ITEMS: SrsQueueItem[] = [
  createDemoItem({
    id: 'demo-1',
    deckId: 'arabic-linguistics',
    itemType: 'balagha',
    itemKey: 'balagha:istiara',
    prompt: 'Define isti‘ara in one clean sentence.',
    answer: 'Isti‘ara is metaphorical transfer where a word is borrowed from its original meaning into a related rhetorical context.',
    title: 'Balagha · Isti‘ara',
    reference: 'Arabic Linguistics',
    dueInDays: -0.2,
    reps: 2,
    ease: 2.5,
    intervalDays: 3,
    lastRating: 'good',
  }),
  createDemoItem({
    id: 'demo-2',
    deckId: 'arabic-linguistics',
    itemType: 'nahw',
    itemKey: 'nahw:hal',
    prompt: 'What marks the grammatical state of hal?',
    answer: 'Hal is usually accusative, often indefinite, and describes the state accompanying the action.',
    title: 'Nahw · Hal',
    reference: 'Arabic Linguistics',
    dueInDays: 2,
    reps: 4,
    ease: 2.7,
    intervalDays: 6,
    lastRating: 'easy',
  }),
  createDemoItem({
    id: 'demo-3',
    deckId: 'arabic-literature',
    itemType: 'idiom',
    itemKey: 'lit:idiom:aynuhu-harrat',
    prompt: 'Explain the idiom “qarrat ‘aynuhu”.',
    answer: 'It means deep joy or comfort of the eye, used for relief, delight, and settled happiness.',
    title: 'Idiom · Qarrat ‘Aynuhu',
    reference: 'Arabic Literature',
    dueInDays: -1,
    reps: 1,
    ease: 2.3,
    intervalDays: 1,
    lastRating: 'hard',
  }),
  createDemoItem({
    id: 'demo-4',
    deckId: 'arabic-literature',
    itemType: 'expression',
    itemKey: 'lit:adab:tafriq',
    prompt: 'What does tafriq do in elevated Arabic prose?',
    answer: 'It separates near meanings to heighten nuance, rhythm, and emphasis across parallel phrases.',
    title: 'Adab · Tafriq',
    reference: 'Arabic Literature',
    dueInDays: 4,
    reps: 5,
    ease: 2.8,
    intervalDays: 9,
    lastRating: 'good',
  }),
  createDemoItem({
    id: 'demo-5',
    deckId: 'quran-idioms',
    itemType: 'verbal_idiom',
    itemKey: '12:5',
    surahId: 12,
    prompt: 'What does “fayakeedoo laka kayda” express in Surah Yusuf?',
    answer: 'It intensifies deliberate plotting against Yusuf, not just casual opposition.',
    title: 'Verbal Idiom · Kayd',
    reference: 'Surah 12 • Ayah 5',
    dueInDays: -0.4,
    reps: 2,
    ease: 2.4,
    intervalDays: 2,
    lastRating: 'again',
  }),
  createDemoItem({
    id: 'demo-6',
    deckId: 'quran-idioms',
    itemType: 'expression',
    itemKey: '2:26',
    surahId: 2,
    prompt: 'Why does “yadribu mathalan” matter as a Quranic expression?',
    answer: 'It signals the deliberate setting forth of an example to unlock layered meaning, not merely illustration.',
    title: 'Expression · Yadribu Mathalan',
    reference: 'Surah 2 • Ayah 26',
    dueInDays: 1.5,
    reps: 4,
    ease: 2.65,
    intervalDays: 5,
    lastRating: 'good',
  }),
  createDemoItem({
    id: 'demo-7',
    deckId: 'quran-concepts',
    itemType: 'concept',
    itemKey: '3:159',
    surahId: 3,
    prompt: 'How is tawakkul framed after consultation in 3:159?',
    answer: 'Resolve through shura, then entrust the matter to Allah without surrendering responsible action.',
    title: 'Concept · Tawakkul',
    reference: 'Surah 3 • Ayah 159',
    dueInDays: -0.1,
    reps: 3,
    ease: 2.6,
    intervalDays: 4,
    lastRating: 'good',
  }),
  createDemoItem({
    id: 'demo-8',
    deckId: 'quran-concepts',
    itemType: 'topic',
    itemKey: '4:135',
    surahId: 4,
    prompt: 'What is the Quranic demand of justice in 4:135?',
    answer: 'Justice must stand even against self-interest, kinship, or class advantage because Allah knows the inner pull of bias.',
    title: 'Topic · Justice',
    reference: 'Surah 4 • Ayah 135',
    dueInDays: 3,
    reps: 5,
    ease: 2.9,
    intervalDays: 8,
    lastRating: 'easy',
  }),
  createDemoItem({
    id: 'demo-9',
    deckId: 'worldview-history',
    itemType: 'worldview',
    itemKey: 'wv:modernity:law',
    prompt: 'What is the central worldview claim about modernity and law?',
    answer: 'Modernity recasts law as neutral procedure while relocating moral sovereignty into institutions of the modern state.',
    title: 'Modernity · Law',
    reference: 'Worldviews',
    dueInDays: -0.8,
    reps: 2,
    ease: 2.35,
    intervalDays: 2,
    lastRating: 'hard',
  }),
  createDemoItem({
    id: 'demo-10',
    deckId: 'worldview-history',
    itemType: 'history',
    itemKey: 'wv:biblical:covenant',
    prompt: 'Why does covenant matter in biblical civilizational memory?',
    answer: 'It organizes law, peoplehood, land, and historical obligation into one sacred narrative structure.',
    title: 'Biblical History · Covenant',
    reference: 'Worldviews',
    dueInDays: 6,
    reps: 4,
    ease: 2.55,
    intervalDays: 10,
    lastRating: 'good',
    status: 'suspended',
  }),
  createDemoItem({
    id: 'demo-11',
    deckId: 'english-language',
    itemType: 'writing',
    itemKey: 'eng:clarity:sentence-1',
    prompt: 'Rewrite this more clearly: “The argument basically sort of demonstrates maybe a tension.”',
    answer: 'The argument demonstrates a clear tension.',
    title: 'Writing · Clarity',
    reference: 'English Language',
    dueInDays: -0.15,
    reps: 1,
    ease: 2.25,
    intervalDays: 1,
    lastRating: 'again',
  }),
  createDemoItem({
    id: 'demo-12',
    deckId: 'english-language',
    itemType: 'expression',
    itemKey: 'eng:expression:carry-weight',
    prompt: 'Use “carry weight” in a precise sentence.',
    answer: 'His evidence carries weight because it connects the claim to verifiable institutional facts.',
    title: 'Expression · Carry Weight',
    reference: 'English Language',
    dueInDays: 2.5,
    reps: 6,
    ease: 2.95,
    intervalDays: 12,
    lastRating: 'easy',
  }),
];

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
      catchError(() => this.loadFallbackQueue(filter, surahId)),
      map((response) => (response.summary.total > 0 ? response : this.buildDemoResponse(filter, surahId))),
    );
  }

  reviewCard(item: SrsQueueItem, rating: SrsRating): Observable<SrsQueueItem> {
    return this.http.post<ApiReviewResponse>(`${this.base}/quran/srs/${encodeURIComponent(item.id)}`, { rating }).pipe(
      map((response) => this.decorateItem(response.item)),
      catchError(() => of(this.simulateReview(item, rating))),
    );
  }

  private loadFallbackQueue(filter: SrsQueueFilter, surahId: number | null): Observable<SrsQueueResponse> {
    if (surahId) {
      return this.getSurahAllCards(surahId).pipe(map((items) => this.buildResponseFromItems(items, filter, 'api')));
    }

    return forkJoin(FEATURED_SURAHS.map((id) => this.getSurahAllCards(id))).pipe(
      map((groups) => groups.flat()),
      map((items) => this.buildResponseFromItems(items, filter, 'api')),
      catchError(() => of(this.buildDemoResponse(filter, surahId))),
    );
  }

  private getSurahAllCards(surahId: number): Observable<SrsQueueItem[]> {
    const params = new HttpParams().set('filter', 'all');
    return this.http.get<SrsResponse>(`${this.base}/quran/surah/${surahId}/srs`, { params }).pipe(
      map((response) => response.items.map((item) => this.decorateItem(item))),
      catchError(() => of([])),
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
      total: items.length,
      items,
      summary,
      source: 'api',
    };
  }

  private buildResponseFromItems(items: SrsQueueItem[], filter: SrsQueueFilter, source: SrsSourceMode): SrsQueueResponse {
    const filtered = this.filterItems(items, filter);
    return {
      ok: true,
      filter,
      total: filtered.length,
      items: this.sortItems(filtered),
      summary: this.summarize(items),
      source,
    };
  }

  private buildDemoResponse(filter: SrsQueueFilter, surahId: number | null): SrsQueueResponse {
    const scopedItems = DEMO_ITEMS.filter((item) => !surahId || item.surah_id === surahId);
    return this.buildResponseFromItems(scopedItems, filter, 'demo');
  }

  private filterItems(items: SrsQueueItem[], filter: SrsQueueFilter): SrsQueueItem[] {
    if (filter === 'all') {
      return items;
    }
    return items.filter((item) => item.due_state === filter);
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

  private sortItems(items: SrsQueueItem[]): SrsQueueItem[] {
    const stateRank = { due: 0, upcoming: 1, suspended: 2 } as const;
    return [...items].sort((a, b) => {
      const stateDelta = stateRank[a.due_state] - stateRank[b.due_state];
      if (stateDelta !== 0) {
        return stateDelta;
      }
      const timeA = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });
  }

  private decorateItem(item: SrsCardVm): SrsQueueItem {
    const payload = this.parseCardPayload(item.card_json);
    const surahId = this.parseSurahId(item.item_key);
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

  private simulateReview(item: SrsQueueItem, rating: SrsRating): SrsQueueItem {
    const ease = Number(item.ease ?? 2.5);
    const reps = Number(item.reps ?? 0);
    const lapses = Number(item.lapses ?? 0);
    const interval = Math.max(1, Number(item.interval_days ?? 1));

    let nextEase = ease;
    let nextReps = reps + 1;
    let nextLapses = lapses;
    let nextInterval = interval;

    if (rating === 'again') {
      nextEase = Math.max(1.3, ease - 0.2);
      nextReps = 0;
      nextLapses = lapses + 1;
      nextInterval = 1;
    } else if (rating === 'hard') {
      nextEase = Math.max(1.3, ease - 0.15);
      nextInterval = reps <= 1 ? 2 : Math.max(2, Math.round(interval * 1.2));
    } else if (rating === 'good') {
      nextInterval = reps <= 0 ? 1 : reps === 1 ? 3 : Math.max(2, Math.round(interval * ease));
    } else {
      nextEase = ease + 0.15;
      nextInterval = reps <= 0 ? 4 : reps === 1 ? 7 : Math.max(4, Math.round(interval * (ease + 0.15)));
    }

    const dueAt = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString();

    return {
      ...item,
      due_at: dueAt,
      due_state: 'upcoming',
      ease: Number(nextEase.toFixed(2)),
      reps: nextReps,
      lapses: nextLapses,
      interval_days: nextInterval,
      last_review_at: new Date().toISOString(),
      last_rating: rating,
      status: 'active',
    };
  }

  private resolveDeck(item: SrsCardVm, payload: CardPayload, surahId: number | null): SrsDeckMeta {
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

function createDemoItem(config: {
  id: string;
  deckId: SrsDeckId;
  itemType: string;
  itemKey: string;
  prompt: string;
  answer: string;
  title: string;
  reference: string;
  dueInDays: number;
  reps: number;
  ease: number;
  intervalDays: number;
  lastRating: SrsRating;
  surahId?: number | null;
  status?: 'active' | 'suspended';
}): SrsQueueItem {
  const deck = SRS_DECK_MAP.get(config.deckId)!;
  const dueAt = new Date(Date.now() + config.dueInDays * 24 * 60 * 60 * 1000).toISOString();
  const status = config.status ?? 'active';

  return {
    id: config.id,
    item_type: config.itemType,
    item_key: config.itemKey,
    status,
    due_at: dueAt,
    last_review_at: new Date(Date.now() - Math.max(config.intervalDays, 1) * 24 * 60 * 60 * 1000).toISOString(),
    interval_days: config.intervalDays,
    ease: config.ease,
    reps: config.reps,
    lapses: config.lastRating === 'again' ? 1 : 0,
    last_rating: config.lastRating,
    surah_id: config.surahId ?? null,
    deck_id: deck.id,
    deck_label: deck.label,
    due_state: status === 'suspended' ? 'suspended' : config.dueInDays <= 0 ? 'due' : 'upcoming',
    prompt: config.prompt,
    answer: config.answer,
    title: config.title,
    reference: config.reference,
    card_json: JSON.stringify({
      deck_id: deck.id,
      title: config.title,
      front: config.prompt,
      back: config.answer,
      reference: config.reference,
    }),
  };
}

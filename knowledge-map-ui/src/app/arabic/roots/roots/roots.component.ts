import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CardsComponent, Card } from '../root-cards/cards/cards.component';
import { AuthService } from '../../../../services/AuthService';
import { ToastService } from '../../../shared/services/toast.service';


export type RootRow = {
  id?: number;
  root: string;
  family: string;
  cards?: string | Card[];
  status?: string;
  frequency?: string;
  difficulty?: number | null;
  extract_date?: string | null;
};

type RootsApiResponse = {
  ok?: boolean;
  results?: RootRow[];
  error?: string;
};

@Component({
  selector: 'app-roots',
  standalone: true,
  imports: [CommonModule, FormsModule, CardsComponent],
  templateUrl: './roots.component.html',
  styleUrls: ['./roots.component.scss'],
})
export class RootsComponent implements OnInit, OnDestroy {
  q = '';
  limit = 100;

  rows: RootRow[] = [];
  loading = false;
  error = '';

  private debounce: any;
  private abort?: AbortController;

  // ---------------- endpoints ----------------
  private readonly listEndpoint = '/lexicon_roots';
  private readonly updateEndpoint = '/lexicon_roots_update';
  private readonly createEndpoint = '/lexicon_roots';

  // ---------------- cards modal ----------------
  showCards = false;
  selectedRoot: RootRow | null = null;
  selectedCards: Card[] = [];
  selectedCardsJson = '[]';
  cardsError = '';
  savingCards = false;
  cardsTab: 'preview' | 'json' = 'preview';
  cardsJsonMode: 'view' | 'edit' = 'view';
  showCreate = false;

  creating = false;
  newRoot = '';
  newFamily = '';
  newCardSurf = '';
  newCardExample = '';
  newCardMeaning = '';
  newCardTag = '';
  newCards: Card[] = [];

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  // =====================================================
  // lifecycle
  // =====================================================

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') ?? '';
      this.showCreate = params.has('new');
      this.load();
    });
  }

  ngOnDestroy() {
    this.abort?.abort();
    if (this.debounce) clearTimeout(this.debounce);
    // no-op: toast service handles its own timers
  }

  // =====================================================
  // helpers
  // =====================================================

  private authHeaders(): HeadersInit {
    return this.auth.authHeaders();
  }

  private handle401(): never {
    this.auth.logout();
    throw new Error('Session expired. Please log in again.');
  }

  private showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toast.show(msg, type === 'success' ? 'success' : 'error');
  }

  trackByKey = (_: number, r: RootRow) =>
    `${r.id ?? ''}|${r.root}|${r.family}`;

  statusBadgeClass(status?: string) {
    const normalized = (status ?? '').toLowerCase();
    switch (normalized) {
      case 'active':
        return 'bg-success';
      case 'draft':
        return 'bg-secondary';
      case 'reviewed':
        return 'bg-info text-dark';
      case 'archived':
        return 'bg-dark';
      case 'edited':
        return 'badge-edited';
      case 'pending':
        return 'bg-warning text-dark';
      default:
        return 'bg-primary';
    }
  }

  frequencyBadgeClass(freq?: string) {
    const normalized = (freq ?? '').toLowerCase();
    switch (normalized) {
      case 'high':
        return 'badge-freq-high';
      case 'medium':
        return 'badge-freq-medium';
      case 'low':
        return 'badge-freq-low';
      default:
        return 'bg-secondary';
    }
  }

  difficultyLevel(value?: number | null) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    if (num <= 3) return 1;
    if (num <= 7) return 2;
    return 3;
  }

  onSearchInput() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.load(), 250);
  }

  // =====================================================
  // load roots
  // =====================================================

  async load() {
    this.loading = true;
    this.error = '';

    this.abort?.abort();
    this.abort = new AbortController();

    try {
      const params = new URLSearchParams();
      if (this.q.trim()) params.set('q', this.q.trim());
      params.set('limit', String(this.limit));

      const res = await fetch(
        `${this.listEndpoint}?${params.toString()}`,
        {
          signal: this.abort.signal,
          headers: {
            ...this.authHeaders(),
          },
        }
      );

      if (res.status === 401) this.handle401();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as RootsApiResponse;

      if (data?.ok === false) {
        throw new Error(data?.error ?? 'API returned ok=false');
      }

      this.rows = Array.isArray(data?.results) ? data.results : [];
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        this.error = e?.message ?? 'Failed to load roots';
        this.rows = [];
      }
    } finally {
      this.loading = false;
    }
  }

  // =====================================================
  // cards modal
  // =====================================================

  openCards(r: RootRow, mode: 'view' | 'edit' = 'view') {
    this.selectedRoot = r;
    this.cardsError = '';
    this.savingCards = false;
    this.cardsTab = mode === 'edit' ? 'json' : 'preview';
    this.cardsJsonMode = mode;

    this.selectedCardsJson =
      typeof r.cards === 'string'
        ? r.cards
        : JSON.stringify(r.cards ?? [], null, 2);

    try {
      this.selectedCards = this.parseCards(this.selectedCardsJson);
    } catch (e: any) {
      this.selectedCards = [];
      this.cardsError = e?.message ?? 'Invalid cards JSON';
    }

    this.showCards = true;
  }

  refresh() {
    this.load();
  }

  async createNew() {
    const root = this.newRoot.trim();
    const family = this.newFamily.trim();
    if (!root || !family) {
      this.showToast('Root and family are required.', 'error');
      return;
    }

    this.creating = true;
    try {
      const res = await fetch(this.createEndpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.authHeaders(),
        },
        body: JSON.stringify({ root, family, cards: this.newCards }),
      });

      if (res.status === 401) this.handle401();

      const raw = await res.text();
      const data = raw ? this.safeJsonParse(raw) : null;

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? raw ?? `HTTP ${res.status}`);
      }

      this.newRoot = '';
      this.newFamily = '';
      this.resetNewCards();
      this.showToast('Created ✔', 'success');
      this.closeCreate();
      this.load();
    } catch (e: any) {
      this.showToast(e?.message ?? 'Failed to create root', 'error');
    } finally {
      this.creating = false;
    }
  }

  get newCardsJson() {
    return JSON.stringify(this.newCards, null, 2);
  }

  addNewCard() {
    const surf = this.newCardSurf.trim();
    const meaning = this.newCardMeaning.trim();
    if (!surf || !meaning) {
      this.showToast('Surf and meaning are required.', 'error');
      return;
    }

    const example = this.newCardExample.trim();
    const tag = this.newCardTag.trim();
    const front = example ? `${surf}\n${example}` : surf;

    this.newCards = [...this.newCards, { front, back: meaning, tag }];
    this.newCardSurf = '';
    this.newCardExample = '';
    this.newCardMeaning = '';
    this.newCardTag = '';
  }

  removeNewCard(index: number) {
    this.newCards = this.newCards.filter((_, i) => i !== index);
  }

  private resetNewCards() {
    this.newCards = [];
    this.newCardSurf = '';
    this.newCardExample = '';
    this.newCardMeaning = '';
    this.newCardTag = '';
  }

  openCreate() {
    this.showCreate = true;
    this.router.navigate([], {
      queryParams: { new: Date.now() },
      queryParamsHandling: 'merge',
    });
  }

  closeCreate() {
    this.showCreate = false;
    this.router.navigate([], {
      queryParams: { new: null },
      queryParamsHandling: 'merge',
    });
  }

  closeCards() {
    this.showCards = false;
    this.selectedRoot = null;
    this.selectedCards = [];
    this.selectedCardsJson = '[]';
    this.cardsError = '';
  }

  // =====================================================
  // save cards
  // =====================================================

  async saveCardsJson(payload: { id: number; cardsJson: string }) {
    this.savingCards = true;
    this.cardsError = '';

    try {
      const id = Number(payload.id);
      if (!Number.isFinite(id) || id <= 0) {
        throw new Error('Invalid id (missing id in table results?)');
      }

      const parsed = JSON.parse(payload.cardsJson);
      if (!Array.isArray(parsed)) {
        throw new Error('Cards JSON must be an array');
      }

      const pretty = JSON.stringify(parsed, null, 2);

      const res = await fetch(this.updateEndpoint, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          ...this.authHeaders(),
        },
        body: JSON.stringify({ id, cards: pretty }),
      });

      if (res.status === 401) this.handle401();

      const raw = await res.text();
      const data = raw ? this.safeJsonParse(raw) : null;

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? raw ?? `HTTP ${res.status}`);
      }

      if (this.selectedRoot) this.selectedRoot.cards = pretty;

      this.selectedCardsJson = pretty;
      this.selectedCards = this.parseCards(pretty);

      const idx = this.rows.findIndex((x) => x.id === id);
      if (idx >= 0) {
        this.rows[idx] = {
          ...this.rows[idx],
          cards: pretty,
          status: 'Edited',
        };
      }

      this.showToast('Saved ✔', 'success');
    } catch (e: any) {
      this.cardsError = e?.message ?? 'Failed to save cards';
      this.showToast(this.cardsError, 'error');
    } finally {
      this.savingCards = false;
    }
  }

  // =====================================================
  // parsing helpers
  // =====================================================

  private safeJsonParse(txt: string): any | null {
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  }

  private parseCards(cards: string | Card[] | undefined): Card[] {
    if (!cards) return [];
    if (Array.isArray(cards)) return cards;

    const parsed = JSON.parse(cards);

    if (Array.isArray(parsed)) {
      return parsed.map((x: any) => ({
        front: typeof x?.front === 'string' ? x.front : '',
        back: typeof x?.back === 'string' ? x.back : '',
        tag: typeof x?.tag === 'string' ? x.tag : '',
      }));
    }

    if (parsed && Array.isArray((parsed as any).cards)) {
      return (parsed as any).cards.map((x: any) => ({
        front: typeof x?.front === 'string' ? x.front : '',
        back: typeof x?.back === 'string' ? x.back : '',
        tag: typeof x?.tag === 'string' ? x.tag : '',
      }));
    }

    return [];
  }
}

import { Injectable, computed, effect, signal } from '@angular/core';

/**
 * Reading state — per-tab "where the user left off" + an explicit bookmark
 * list. Persists to localStorage so a cold app start can offer
 * "continue reading" cards on each tab's landing screen.
 *
 *   • last position per tab (al-quran / tafseer / uloom / lexicon)
 *   • bookmarks: explicit user pins, each anchored to a specific reading
 *     location with a human-readable label
 *
 * Single source of truth; signals make it reactive without rxjs noise.
 */

export type TabId = 'al-quran' | 'tafseer' | 'uloom' | 'lexicon';

export interface LastReadAlQuran {
  kind: 'al-quran';
  page: number;
  surah: number | null;
  ayah:  number | null;
  updatedAt: number;
}

export interface LastReadTafseer {
  kind: 'tafseer';
  workId: string;
  workTitleAr: string;
  surah: number;
  ayah:  number;
  updatedAt: number;
}

export interface LastReadUloom {
  kind: 'uloom';
  sourceSlug: string;
  sourceTitleAr: string;
  surah: number;
  ayah:  number;
  updatedAt: number;
}

export interface LastReadLexicon {
  kind: 'lexicon';
  slug:  string;
  bookTitleAr: string | null;
  root:  string;
  updatedAt: number;
}

export type LastRead = LastReadAlQuran | LastReadTafseer | LastReadUloom | LastReadLexicon;

export interface Bookmark {
  id: string;
  /** Label for the picker ("سورة البقرة آية 255", "جذر كتب في لسان العرب") */
  label: string;
  target: LastRead;
  createdAt: number;
}

const STORAGE_KEY_LAST = 'kmaps.reading.last.v1';
const STORAGE_KEY_MARKS = 'kmaps.reading.bookmarks.v1';

@Injectable({ providedIn: 'root' })
export class ReadingStateService {
  /** Last position visited on each tab (one slot per tab kind). */
  readonly last = signal<Partial<Record<TabId, LastRead>>>(this.loadLast());
  /** Explicit user-pinned bookmarks (any tab). */
  readonly bookmarks = signal<Bookmark[]>(this.loadBookmarks());

  /** Newest first. */
  readonly bookmarksRecent = computed(() =>
    [...this.bookmarks()].sort((a, b) => b.createdAt - a.createdAt),
  );

  constructor() {
    effect(() => {
      try { localStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(this.last())); } catch { /* */ }
    });
    effect(() => {
      try { localStorage.setItem(STORAGE_KEY_MARKS, JSON.stringify(this.bookmarks())); } catch { /* */ }
    });
  }

  // ── Last-read updaters ──────────────────────────────────────────────
  setLastAlQuran(page: number, surah: number | null, ayah: number | null): void {
    const v: LastReadAlQuran = { kind: 'al-quran', page, surah, ayah, updatedAt: Date.now() };
    this.last.update(s => ({ ...s, 'al-quran': v }));
  }
  setLastTafseer(workId: string, workTitleAr: string, surah: number, ayah: number): void {
    const v: LastReadTafseer = { kind: 'tafseer', workId, workTitleAr, surah, ayah, updatedAt: Date.now() };
    this.last.update(s => ({ ...s, tafseer: v }));
  }
  setLastUloom(sourceSlug: string, sourceTitleAr: string, surah: number, ayah: number): void {
    const v: LastReadUloom = { kind: 'uloom', sourceSlug, sourceTitleAr, surah, ayah, updatedAt: Date.now() };
    this.last.update(s => ({ ...s, uloom: v }));
  }
  setLastLexicon(slug: string, bookTitleAr: string | null, root: string): void {
    const v: LastReadLexicon = { kind: 'lexicon', slug, bookTitleAr, root, updatedAt: Date.now() };
    this.last.update(s => ({ ...s, lexicon: v }));
  }

  clearLast(tab: TabId): void {
    this.last.update(s => {
      const copy = { ...s };
      delete copy[tab];
      return copy;
    });
  }

  // ── Bookmarks ──────────────────────────────────────────────────────
  addBookmark(label: string, target: LastRead): Bookmark {
    const mark: Bookmark = { id: this.newId(), label, target, createdAt: Date.now() };
    // Don't dedupe — explicit user action; allow multiple pins of same target.
    this.bookmarks.update(list => [mark, ...list]);
    return mark;
  }
  removeBookmark(id: string): void {
    this.bookmarks.update(list => list.filter(b => b.id !== id));
  }
  /** Is this exact target currently bookmarked? Useful for the toolbar star. */
  isBookmarked(target: LastRead): boolean {
    return this.bookmarks().some(b => this.sameTarget(b.target, target));
  }
  /** Toggle a bookmark for this target. Returns the new "is-bookmarked" state. */
  toggleBookmark(label: string, target: LastRead): boolean {
    const existing = this.bookmarks().find(b => this.sameTarget(b.target, target));
    if (existing) {
      this.removeBookmark(existing.id);
      return false;
    }
    this.addBookmark(label, target);
    return true;
  }

  private sameTarget(a: LastRead, b: LastRead): boolean {
    if (a.kind !== b.kind) return false;
    switch (a.kind) {
      case 'al-quran':
        return b.kind === 'al-quran' && a.page === b.page && a.surah === b.surah && a.ayah === b.ayah;
      case 'tafseer':
        return b.kind === 'tafseer' && a.workId === b.workId && a.surah === b.surah && a.ayah === b.ayah;
      case 'uloom':
        return b.kind === 'uloom' && a.sourceSlug === b.sourceSlug && a.surah === b.surah && a.ayah === b.ayah;
      case 'lexicon':
        return b.kind === 'lexicon' && a.slug === b.slug && a.root === b.root;
    }
  }

  // ── Persistence helpers ────────────────────────────────────────────
  private loadLast(): Partial<Record<TabId, LastRead>> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LAST);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  }
  private loadBookmarks(): Bookmark[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MARKS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  private newId(): string {
    return 'bm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
}

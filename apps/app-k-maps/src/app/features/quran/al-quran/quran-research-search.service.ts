import { Injectable, computed, signal } from '@angular/core';

/**
 * Cross-tab search broadcast service.
 *
 * Each tab (Tafseer / Uloom / Lexicon catalog) sets its own match count
 * and a small sample of preview items by calling `setMatch(...)` from
 * its filtered-results computed. The shell's search modal reads
 * `summary()` to render a one-tap panel that jumps into the right tab.
 */

export type SearchTab = 'tafseer' | 'uloom' | 'lexicon';

export interface SearchPreview {
  /** Stable id from the source domain — used as a track key in the template */
  id: string;
  /** Headline (Arabic) — work title, source title, root text. */
  title: string;
  /** Optional secondary line. */
  subtitle?: string | null;
  /** What to do when the user taps this preview. Each tab can wire its own. */
  resume: () => void;
}

export interface TabSummary {
  tab:    SearchTab;
  label:  string;        // Arabic tab name shown in the panel header
  count:  number;        // total matches (not just previews)
  hits:   SearchPreview[]; // up to 5 preview items
}

@Injectable()
export class QuranResearchSearchService {
  readonly searchTerm = signal('');

  /** Per-tab match summary. Each tab writes its own slot. */
  private readonly _summary = signal<Record<SearchTab, TabSummary | null>>({
    tafseer: null,
    uloom: null,
    lexicon: null,
  });

  /** Public reactive summary — read by the shell's search modal. */
  readonly summary = computed<TabSummary[]>(() => {
    const term = this.searchTerm().trim();
    if (!term) return [];
    return Object.values(this._summary())
      .filter((x): x is TabSummary => !!x && x.count > 0);
  });

  /** Total matches across all tabs — used in the header pill. */
  readonly totalMatches = computed(() =>
    this.summary().reduce((sum, t) => sum + t.count, 0),
  );

  setSearch(value: string | null | undefined): void {
    this.searchTerm.set((value ?? '').replace(/^\s+/, ''));
  }

  /** Called by a tab to register its filtered match summary. Pass null
   *  or count=0 to clear the slot for that tab. */
  setMatch(tab: SearchTab, summary: TabSummary | null): void {
    this._summary.update(s => ({ ...s, [tab]: summary }));
  }

  /** Clear all match summaries — used when the search term is cleared. */
  clearMatches(): void {
    this._summary.set({ tafseer: null, uloom: null, lexicon: null });
  }
}

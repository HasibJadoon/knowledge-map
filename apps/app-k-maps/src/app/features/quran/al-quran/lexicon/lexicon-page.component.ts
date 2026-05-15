import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild,
  inject, signal, OnInit, computed, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import {
  forkJoin, debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError, map,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AlDictionaryApiService, AlDictSource, ScholarshipNote,
} from '../../../../shared/services/al-dictionary-api.service';
import { QuranResearchSearchService } from '../quran-research-search.service';
import { ReadingStateService } from '../reading-state.service';
import { ContinueReadingCardComponent } from '../components/continue-reading-card/continue-reading-card.component';

interface RootMeta {
  text_ar: string;
  meaning_ar: string | null;
  frequency_quran: number | null;
}

/** Per-source hit summary computed from the search response. Drives the
 *  tafsir.app-style lit-up state and the matched-word chips on each card. */
interface SourceHit {
  count:   number;
  samples: string[];
}

@Component({
  selector: 'app-lexicon-page',
  standalone: true,
  imports: [CommonModule, IonicModule, ContinueReadingCardComponent],
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconPageComponent implements OnInit {
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  private readonly api          = inject(AlDictionaryApiService);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly searchSvc    = inject(QuranResearchSearchService);
  private readonly readingState = inject(ReadingStateService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly lastReadLexicon = computed(() => {
    const last = this.readingState.last()['lexicon'];
    return last && last.kind === 'lexicon' ? last : null;
  });

  resumeLastLexicon(): void {
    const last = this.lastReadLexicon();
    if (!last) return;
    this.router.navigate(['/quran/al-quran/lexicon/read', last.slug], {
      queryParams: { root: last.root },
    });
  }

  readonly sources               = signal<AlDictSource[]>([]);
  readonly scholarshipSourceCount = signal(0);
  readonly sourcesLoading         = signal(true);

  // Books-card label: include scholarship sources in the total so it
  // matches what the books-listing actually shows (10 lexicons + 1
  // academic = 11 today).
  readonly totalSourceCount = computed(
    () => this.sources().length + this.scholarshipSourceCount(),
  );
  readonly searching      = signal(false);
  readonly rootMeta       = signal<RootMeta | null>(null);
  readonly hitsBySlug     = signal<Map<string, SourceHit>>(new Map());
  readonly scholarship    = signal<ScholarshipNote[]>([]);

  // Group scholarship notes by source for card-per-source rendering.
  readonly scholarshipCards = computed(() => {
    const notes = this.scholarship();
    if (!notes.length) return [];
    const bySource = new Map<string, {
      source_slug: string | null;
      source_id:   string;
      title_ar:    string;
      title_en:    string;
      author:      string;
      year:        number | null;
      genre:       string;
      genre_label: { ar: string; en: string };
      url:         string | null;
      notes:       ScholarshipNote[];
      samples:     string[];
    }>();
    for (const n of notes) {
      const key = n.source.id;
      if (!bySource.has(key)) {
        bySource.set(key, {
          source_slug: n.source.slug ?? null,
          source_id:   n.source_id,
          title_ar:    n.source.title_ar,
          title_en:    n.source.title_en,
          author:      n.source.author,
          year:        n.source.year,
          genre:       n.source.genre,
          genre_label: n.source.genre_label,
          url:         n.source.url,
          notes:       [],
          samples:     [],
        });
      }
      const card = bySource.get(key)!;
      card.notes.push(n);
      const sample = (n.root_text ?? n.root_norm ?? '').trim();
      if (sample && !card.samples.includes(sample)) card.samples.push(sample);
    }
    return [...bySource.values()];
  });

  readonly quickRoots = ['كتب', 'علم', 'قرأ', 'رحم', 'حمد', 'أمن', 'نزل', 'خلق'];

  // The shared QuranResearch search term — kept in sync via two-way binding.
  get searchTerm() { return this.searchSvc.searchTerm; }

  // Sources with hits, ordered by hit count desc so the richest dictionaries
  // surface first in the lit-up grid.
  readonly hitSources = computed(() => {
    const hits = this.hitsBySlug();
    if (hits.size === 0) return [];
    return this.sources()
      .filter(s => hits.has(s.slug) && (hits.get(s.slug)?.count ?? 0) > 0)
      .sort((a, b) => (hits.get(b.slug)!.count) - (hits.get(a.slug)!.count));
  });

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(320),
      distinctUntilChanged(),
      switchMap(q => {
        const t = q.trim();
        if (!t) {
          this.rootMeta.set(null);
          this.hitsBySlug.set(new Map());
          this.scholarship.set([]);
          this.searching.set(false);
          return of(null);
        }
        this.searching.set(true);
        return forkJoin({
          // v2 cross-source compare — same endpoint the desktop reader uses.
          // Returns canonical root metadata + per-source row counts so the
          // catalog can light up which lexicons have entries for this root.
          compare:     this.api.getV2RootCompare(t).pipe(catchError(() => of(null))),
          dict:        this.api.getRootEntries(t, 20).pipe(catchError(() => of(null))),
          scholarship: this.api.getRootScholarship(t).pipe(
            catchError(() => of({ root_norm: t, notes: [], total: 0 })),
          ),
        }).pipe(map(res => ({ ...res, q: t })));
      }),
      takeUntilDestroyed(),
    ).subscribe(res => {
      this.searching.set(false);
      if (!res) {
        this.hitsBySlug.set(new Map());
        this.scholarship.set([]);
        return;
      }

      const { compare, dict, scholarship, q } = res;
      this.scholarship.set(scholarship?.notes ?? []);

      if (dict) {
        this.rootMeta.set({
          text_ar: dict.root.text_ar,
          meaning_ar: dict.root.meaning_ar,
          frequency_quran: dict.root.frequency_quran,
        });
      } else if (compare?.canonical) {
        this.rootMeta.set({
          text_ar: compare.canonical.root_text,
          meaning_ar: null,
          frequency_quran: compare.canonical.frequency_quran,
        });
      } else {
        this.rootMeta.set({ text_ar: q, meaning_ar: null, frequency_quran: null });
      }

      // Build per-source hit map for inline card decoration.
      // Prefer v2 compare rows (one per (root, source)); fall back to dict tokens.
      const hits = new Map<string, SourceHit>();
      const CAP = 6;

      for (const src of compare?.sources ?? []) {
        const samples: string[] = [];
        const head = (src.root_text ?? '').trim();
        if (head) samples.push(head);
        // src.sections is the count of distinct sections within this lexicon
        // entry — a richer signal than just "1 entry per source".
        hits.set(src.source_slug, { count: src.sections || 1, samples });
      }
      for (const src of dict?.sources ?? []) {
        if (hits.has(src.slug)) continue;
        const samples: string[] = [];
        for (const e of src.entries) {
          const head = (e.heading_norm ?? '').trim();
          if (head && !samples.includes(head)) {
            samples.push(head);
          } else if (e.text_ar) {
            const tok = e.text_ar.trim().split(/[\s،,;:.]+/)
              .find(w => /[؀-ۿ]/.test(w) && w.length <= 16);
            if (tok && !samples.includes(tok)) samples.push(tok);
          }
          if (samples.length >= CAP) break;
        }
        hits.set(src.slug, { count: src.entry_count, samples });
      }

      this.hitsBySlug.set(hits);
    });

    // Broadcast lexicon match summary to the shell's cross-tab search panel.
    effect(() => {
      const term = this.searchSvc.searchTerm().trim();
      if (!term) { this.searchSvc.setMatch('lexicon', null); return; }
      const hits = this.hitSources();
      this.searchSvc.setMatch('lexicon', {
        tab: 'lexicon',
        label: 'معجم',
        count: hits.length,
        hits: hits.slice(0, 5).map(src => ({
          id: src.slug,
          title: src.title_ar,
          subtitle: src.author ?? null,
          resume: () => this.openSourceAtRoot(src),
        })),
      });
    });
  }

  ngOnInit(): void {
    this.api.getSources().subscribe({
      next: res => { this.sources.set(res.sources); this.sourcesLoading.set(false); },
      error: () => this.sourcesLoading.set(false),
    });
    // Count academic sources separately so the Books card label can
    // surface the total (11 = 10 lexicons + 1 academic today).
    this.api.getScholarshipSources().subscribe({
      next: res => this.scholarshipSourceCount.set(res.sources.length),
      error: () => {},
    });
    // Pick up any pre-existing search term (shared across tabs).
    const initial = this.searchSvc.searchTerm();
    if (initial) this.search$.next(initial);

    // A word-tap in the Quran reader navigates here with ?root=X — pick
    // up that param and pre-fill the search so the user sees relevant
    // matches immediately. Pass DestroyRef explicitly so it can be
    // called outside an injection context (ngOnInit isn't one).
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const root = (params.get('root') ?? '').trim();
        if (root && root !== this.searchSvc.searchTerm()) {
          this.setSearch(root);
          queueMicrotask(() => this.searchInputRef?.nativeElement.focus());
        }
      });
  }


  // ── Search controls ─────────────────────────────────────────────────
  setSearch(value: string): void {
    this.searchSvc.setSearch(value);
    this.search$.next(value);
  }
  tryRoot(root: string): void {
    this.setSearch(root);
    queueMicrotask(() => this.searchInputRef?.nativeElement.focus());
  }
  clearSearch(): void { this.setSearch(''); }

  // ── Navigation ──────────────────────────────────────────────────────
  /** Card 1: open the full library catalog (all 11 sources). */
  openBooks(): void {
    this.blurFocus();
    this.router.navigate(['/quran/al-quran/lexicon/books']);
  }

  /** Blur the currently-focused element BEFORE Ionic adds aria-hidden
   *  to the outgoing page. Without this, Ionic logs an accessibility
   *  warning because the focused button stays inside the now-hidden
   *  page. (See WAI-ARIA aria-hidden rules — focus must not live
   *  inside an aria-hidden subtree.) */
  private blurFocus(): void {
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === 'function') active.blur();
  }
  /** Hit card: open the matching source in the unified reader. The
   *  reader dispatches by source kind, so Lane / Classical / Mufradat /
   *  Scholarship all land in the right view automatically. */
  openSourceAtRoot(src: AlDictSource): void {
    this.blurFocus();
    const root = this.searchTerm().trim();
    this.router.navigate(['/quran/al-quran/lexicon/read', src.slug], {
      queryParams: root ? { root } : undefined,
    });
  }
  /** Academic-source card tapped — same unified reader, scholarship branch. */
  openScholarshipAtRoot(slug: string | null): void {
    if (!slug) return;
    this.blurFocus();
    const root = this.searchTerm().trim();
    this.router.navigate(['/quran/al-quran/lexicon/read', slug], {
      queryParams: root ? { root } : undefined,
    });
  }

  // ── Template helpers ────────────────────────────────────────────────
  hit(slug: string): SourceHit | null {
    return this.hitsBySlug().get(slug) ?? null;
  }
  hasResults(): boolean {
    return this.hitsBySlug().size > 0 && this.hitSources().length > 0;
  }
}

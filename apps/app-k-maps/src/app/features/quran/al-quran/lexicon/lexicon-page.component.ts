import {
  ChangeDetectionStrategy, Component, ElementRef, ViewChild,
  inject, signal, OnInit, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import {
  forkJoin, debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError, map,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AlDictionaryApiService, AlDictSource, ScholarshipNote,
} from '../../../../shared/services/al-dictionary-api.service';
import { QuranResearchSearchService } from '../quran-research-search.service';

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
  imports: [CommonModule, IonicModule],
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconPageComponent implements OnInit {
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  private readonly api          = inject(AlDictionaryApiService);
  private readonly router       = inject(Router);
  private readonly searchSvc    = inject(QuranResearchSearchService);

  readonly sources        = signal<AlDictSource[]>([]);
  readonly sourcesLoading = signal(true);
  readonly searching      = signal(false);
  readonly rootMeta       = signal<RootMeta | null>(null);
  readonly hitsBySlug     = signal<Map<string, SourceHit>>(new Map());
  readonly scholarship    = signal<ScholarshipNote[]>([]);

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
          structured:  this.api.getStructuredRootEntries(t).pipe(catchError(() => of(null))),
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

      const { structured, dict, scholarship, q } = res;
      this.scholarship.set(scholarship?.notes ?? []);

      if (dict) {
        this.rootMeta.set({
          text_ar: dict.root.text_ar,
          meaning_ar: dict.root.meaning_ar,
          frequency_quran: dict.root.frequency_quran,
        });
      } else if (structured) {
        this.rootMeta.set({ text_ar: structured.root, meaning_ar: null, frequency_quran: null });
      } else {
        this.rootMeta.set({ text_ar: q, meaning_ar: null, frequency_quran: null });
      }

      // Build per-source hit map for inline card decoration.
      // Prefer structured headings; fall back to dict text_ar tokens.
      const hits = new Map<string, SourceHit>();
      const CAP = 6;

      for (const lex of structured?.lexicons ?? []) {
        const samples: string[] = [];
        for (const e of lex.entries) {
          const head = (e.heading_ar ?? '').trim();
          if (head && !samples.includes(head)) samples.push(head);
          for (const f of e.arabic_forms ?? []) {
            if (samples.length >= CAP) break;
            const fc = f.trim();
            if (fc && !samples.includes(fc)) samples.push(fc);
          }
          if (samples.length >= CAP) break;
        }
        hits.set(lex.slug, { count: lex.count ?? lex.entries.length, samples });
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
  }

  ngOnInit(): void {
    this.api.getSources().subscribe({
      next: res => { this.sources.set(res.sources); this.sourcesLoading.set(false); },
      error: () => this.sourcesLoading.set(false),
    });
    // Pick up any pre-existing search term (shared across tabs).
    const initial = this.searchSvc.searchTerm();
    if (initial) this.search$.next(initial);
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
  /** Card 1: open the books catalog (mobile mirror of /lexicon/books). */
  openBooks(): void {
    this.router.navigate(['/quran/al-quran/lane-lexicon']);
  }
  /** Hit card: open the matching source for the entered root. Lane has a
   *  rich mobile page; other sources fall through to the same Lane-style
   *  page (TODO: add per-source mobile readers). */
  openSourceAtRoot(src: AlDictSource): void {
    const root = this.searchTerm().trim();
    if (src.slug === 'lane_lexicon' || src.slug === 'lane_quranic_research_perseus') {
      this.router.navigate(['/quran/al-quran/lane-lexicon'], {
        queryParams: root ? { root } : undefined,
      });
      return;
    }
    // For other sources we don't have a dedicated mobile reader yet —
    // route to the Lane page with the same root so the user lands on a
    // working reader. (Future: per-source mobile readers.)
    this.router.navigate(['/quran/al-quran/lane-lexicon'], {
      queryParams: root ? { root, source: src.slug } : { source: src.slug },
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

import {
  ChangeDetectionStrategy, Component, ElementRef, ViewChild,
  inject, signal, OnInit, AfterViewInit, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  forkJoin, debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError, map,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import gsap from 'gsap';
import {
  AlDictionaryApiService,
  AlDictSource, ScholarshipNote,
} from '../../../../../shared/services/al-dictionary-api.service';

interface RootMeta {
  text_ar: string;
  meaning_ar: string | null;
  frequency_quran: number | null;
}

/** Per-source hit summary computed from the search response. Drives the
 *  tafsir.app-style lit-up state and the matched-word chips on each card. */
interface SourceHit {
  count:   number;     // total entry rows for this root in this source
  samples: string[];   // up to ~6 matched headings/forms for chip display
}

@Component({
  selector: 'km-lexicon-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconPageComponent implements OnInit, AfterViewInit {
  @ViewChild('catalog')   catalogRef?:   ElementRef<HTMLElement>;
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  private readonly api    = inject(AlDictionaryApiService);
  private readonly router = inject(Router);

  readonly sources        = signal<AlDictSource[]>([]);
  readonly sourcesLoading = signal(true);
  readonly searchTerm     = signal('');
  readonly searching      = signal(false);
  readonly rootMeta       = signal<RootMeta | null>(null);
  readonly hitsBySlug     = signal<Map<string, SourceHit>>(new Map());
  // Academic-scholarship notes for the current root (Al-Jallad et al.).
  // Separate stream from the classical lexicon hits.
  readonly scholarship    = signal<ScholarshipNote[]>([]);

  // Academic readings rendered as one card per source (mirroring the
  // lit-up lexicon cards). One root may have notes in multiple academic
  // sources; we aggregate them here.
  readonly scholarshipCards = computed(() => {
    const notes = this.scholarship();
    if (!notes.length) return [];
    const bySource = new Map<string, {
      source_slug: string;
      source_id:   string;
      title_ar:    string;
      title_en:    string;
      author:      string;
      year:        number | null;
      genre:       string;
      genre_label: { ar: string; en: string };
      url:         string | null;
      notes:       ScholarshipNote[];
      // Sample chips: lift the first short Arabic forms / root_text from notes.
      samples:     string[];
    }>();
    for (const n of notes) {
      const key = n.source.id;
      if (!bySource.has(key)) {
        bySource.set(key, {
          source_slug: '', // filled below
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

  // Sources that have hits for the current root, in roots-descending order
  // so the richest dictionaries surface first.
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

      // Root metadata block (showed above the result grid).
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
      // Structured response covers Lane + a few v2-aware sources with rich
      // heading metadata; the dict response covers the rest with text_ar
      // chunks. Merge: prefer structured headings when present.
      const hits = new Map<string, SourceHit>();
      const SAMPLE_CAP = 6;

      for (const lex of structured?.lexicons ?? []) {
        const samples: string[] = [];
        for (const e of lex.entries) {
          const head = (e.heading_ar ?? '').trim();
          if (head && !samples.includes(head)) samples.push(head);
          for (const f of e.arabic_forms ?? []) {
            if (samples.length >= SAMPLE_CAP) break;
            const fc = f.trim();
            if (fc && !samples.includes(fc)) samples.push(fc);
          }
          if (samples.length >= SAMPLE_CAP) break;
        }
        hits.set(lex.slug, { count: lex.count ?? lex.entries.length, samples });
      }

      for (const src of dict?.sources ?? []) {
        if (hits.has(src.slug)) continue; // structured wins
        const samples: string[] = [];
        for (const e of src.entries) {
          const head = (e.heading_norm ?? '').trim();
          if (head && !samples.includes(head)) {
            samples.push(head);
          } else if (e.text_ar) {
            // Lift first short Arabic token from the chunk so we always
            // have a visible chip even when heading_norm is null.
            const tok = e.text_ar.trim().split(/[\s،,;:.]+/)
              .find(w => /[؀-ۿ]/.test(w) && w.length <= 16);
            if (tok && !samples.includes(tok)) samples.push(tok);
          }
          if (samples.length >= SAMPLE_CAP) break;
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
  }

  ngAfterViewInit(): void { this.animateCatalog(); }

  // ── Search controls ─────────────────────────────────────────────────
  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.search$.next(value);
  }
  tryRoot(root: string): void {
    this.searchTerm.set(root);
    this.search$.next(root);
    queueMicrotask(() => this.searchInputRef?.nativeElement.focus());
  }
  clearSearch(): void { this.setSearch(''); }
  focusSearch(): void {
    queueMicrotask(() => this.searchInputRef?.nativeElement.focus());
  }

  // ── Navigation ──────────────────────────────────────────────────────
  // Card "View Books" → go to the rich catalog
  openBooks(): void {
    this.router.navigate(['/lexicon/books']);
  }
  // Source card (with hits) → open that book at the current root
  openSourceAtRoot(src: AlDictSource): void {
    const root = this.searchTerm().trim();
    this.router.navigate(['/lexicon/books', src.slug], {
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
  // Click on an academic-readings card → open its dedicated shell at
  // the current root. Backed by `/lexicon/books/:slug` (the slug lookup
  // in the book-reader dispatches scholarship slugs to a separate shell).
  openScholarshipAtRoot(sourceSlug: string): void {
    const root = this.searchTerm().trim();
    this.router.navigate(['/lexicon/books', sourceSlug], {
      queryParams: root ? { root } : undefined,
    });
  }

  private animateCatalog(): void {
    const cards = Array.from(
      this.catalogRef?.nativeElement.querySelectorAll<HTMLElement>('.lx-hit-card') ?? [],
    );
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.28, stagger: 0.035, ease: 'power3.out', clearProps: 'transform' },
    );
  }
}

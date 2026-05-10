import {
  ChangeDetectionStrategy, Component, ElementRef, ViewChild,
  inject, signal, OnInit, AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import gsap from 'gsap';
import {
  AlDictionaryApiService,
  AlDictSource, AlRootSourceResult, LexEntry,
} from '../../../../../shared/services/al-dictionary-api.service';

interface DefPart { text: string; isGap: boolean }
interface DisplayEntry extends LexEntry { defParts: DefPart[] }
interface LaneDisplay { title_ar: string; title: string; author: string; count: number; entries: DisplayEntry[] }
interface RootMeta { text_ar: string; meaning_ar: string | null; frequency_quran: number | null }

const LANE_SLUGS = new Set(['lane_lexicon', 'lane_quranic_research_perseus']);

@Component({
  selector: 'km-lexicon-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconPageComponent implements OnInit, AfterViewInit {
  @ViewChild('catalog') catalogRef?: ElementRef<HTMLElement>;

  private readonly api = inject(AlDictionaryApiService);

  readonly sources          = signal<AlDictSource[]>([]);
  readonly sourcesLoading   = signal(true);
  readonly searchTerm       = signal('');
  readonly searching        = signal(false);
  readonly rootMeta         = signal<RootMeta | null>(null);
  readonly laneResult       = signal<LaneDisplay | null>(null);
  readonly classicalSources = signal<AlRootSourceResult[]>([]);
  readonly selectedSource   = signal<AlRootSourceResult | null>(null);
  readonly expandedSlugs    = signal<Set<string>>(new Set());

  readonly quickRoots = ['كتب', 'علم', 'قرأ', 'رحم', 'حمد', 'أمن', 'نزل', 'خلق', 'فتح', 'وحي'];

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(320),
      distinctUntilChanged(),
      switchMap(q => {
        const t = q.trim();
        if (!t) {
          this.rootMeta.set(null);
          this.laneResult.set(null);
          this.classicalSources.set([]);
          this.selectedSource.set(null);
          this.searching.set(false);
          return of(null);
        }
        this.searching.set(true);
        return forkJoin({
          structured: this.api.getStructuredRootEntries(t).pipe(catchError(() => of(null))),
          dict:       this.api.getRootEntries(t, 20).pipe(catchError(() => of(null))),
        }).pipe(map(res => ({ ...res, q: t })));
      }),
      takeUntilDestroyed(),
    ).subscribe(res => {
      this.searching.set(false);
      if (!res) return;

      const { structured, dict, q } = res;

      if (dict) {
        this.rootMeta.set({ text_ar: dict.root.text_ar, meaning_ar: dict.root.meaning_ar, frequency_quran: dict.root.frequency_quran });
      } else if (structured) {
        this.rootMeta.set({ text_ar: structured.root, meaning_ar: null, frequency_quran: null });
      } else {
        this.rootMeta.set({ text_ar: q, meaning_ar: null, frequency_quran: null });
      }

      const laneLex = structured?.lexicons.find(l => l.slug === 'lane_lexicon') ?? null;
      this.laneResult.set(laneLex ? {
        title_ar: laneLex.title_ar,
        title:    laneLex.title,
        author:   laneLex.author,
        count:    laneLex.count,
        entries:  laneLex.entries.map(e => ({ ...e, defParts: this.splitDef(e.definition) })),
      } : null);

      const classical = dict?.sources.filter(s => !LANE_SLUGS.has(s.slug)) ?? [];
      this.classicalSources.set(classical);
      this.selectedSource.set(null);

      if (laneLex) {
        this.expandedSlugs.set(new Set(['lane_lexicon']));
      } else if (classical[0]) {
        this.expandedSlugs.set(new Set([classical[0].slug]));
      }
    });
  }

  ngOnInit(): void {
    this.api.getSources().subscribe({
      next: res => { this.sources.set(res.sources); this.sourcesLoading.set(false); },
      error: () => this.sourcesLoading.set(false),
    });
  }

  ngAfterViewInit(): void { this.animateCatalog(); }

  setSearch(value: string): void { this.searchTerm.set(value); this.search$.next(value); }
  tryRoot(root: string): void { this.setSearch(root); }
  clearSearch(): void { this.setSearch(''); }

  selectSource(src: AlRootSourceResult): void { this.selectedSource.set(src); }
  clearSource(): void { this.selectedSource.set(null); }

  toggleExpand(slug: string): void {
    this.expandedSlugs.update(set => {
      const next = new Set(set);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  isExpanded(slug: string): boolean { return this.expandedSlugs().has(slug); }

  volPage(entry: { volume_no?: number | null; page_no?: number | null }): string {
    if (entry.volume_no && entry.page_no) return `ج${entry.volume_no} ص${entry.page_no}`;
    if (entry.page_no) return `ص${entry.page_no}`;
    return '';
  }

  hasArabic(text: string | null | undefined): boolean {
    return !!text && /[؀-ۿ]/.test(text);
  }

  private splitDef(text: string | null): DefPart[] {
    if (!text) return [];
    const parts = text.split('[◌]');
    return parts.flatMap((part, i) => {
      const segs: DefPart[] = [];
      if (part) segs.push({ text: part, isGap: false });
      if (i < parts.length - 1) segs.push({ text: '◌', isGap: true });
      return segs;
    });
  }

  private animateCatalog(): void {
    const cards = Array.from(
      this.catalogRef?.nativeElement.querySelectorAll<HTMLElement>('.lx-dict-card') ?? [],
    );
    if (!cards.length) return;
    gsap.fromTo(cards,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power3.out', clearProps: 'transform' },
    );
  }
}

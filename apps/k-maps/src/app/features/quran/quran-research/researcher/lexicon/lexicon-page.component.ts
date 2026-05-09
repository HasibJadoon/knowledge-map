import {
  Component, inject, signal, OnInit,
  ElementRef, ViewChild, AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlDictionaryApiService, AlDictSource, AlRootResult, AlRootSourceResult } from '../../../../../shared/services/al-dictionary-api.service';

@Component({
  selector: 'km-lexicon-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
})
export class LexiconPageComponent implements OnInit, AfterViewInit {
  @ViewChild('catalog') catalogRef?: ElementRef<HTMLElement>;

  private readonly api = inject(AlDictionaryApiService);

  readonly sources        = signal<AlDictSource[]>([]);
  readonly sourcesLoading = signal(true);
  readonly searchTerm     = signal('');
  readonly searching      = signal(false);
  readonly rootResult     = signal<AlRootResult | null>(null);
  readonly selectedSource = signal<AlRootSourceResult | null>(null);
  readonly expandedSlugs  = signal<Set<string>>(new Set());

  readonly quickRoots = ['كتب', 'علم', 'قرأ', 'رحم', 'حمد', 'أمن', 'نزل', 'خلق', 'فتح', 'وحي'];

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(320),
      distinctUntilChanged(),
      switchMap(q => {
        const t = q.trim();
        if (!t) {
          this.rootResult.set(null);
          this.selectedSource.set(null);
          this.searching.set(false);
          return of(null);
        }
        this.searching.set(true);
        return this.api.getRootEntries(t);
      }),
      takeUntilDestroyed(),
    ).subscribe(res => {
      this.searching.set(false);
      this.rootResult.set(res);
      this.selectedSource.set(null);
      if (res?.sources[0]) this.expandedSlugs.set(new Set([res.sources[0].slug]));
    });
  }

  ngOnInit(): void {
    this.api.getSources().subscribe({
      next: res => { this.sources.set(res.sources); this.sourcesLoading.set(false); },
      error: () => this.sourcesLoading.set(false),
    });
  }

  ngAfterViewInit(): void {
    this.animateCatalog();
  }

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

  volPage(entry: { volume_no: number | null; page_no: number | null }): string {
    if (entry.volume_no && entry.page_no) return `ج${entry.volume_no} ص${entry.page_no}`;
    if (entry.page_no) return `ص${entry.page_no}`;
    return '';
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

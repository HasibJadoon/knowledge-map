import { ChangeDetectionStrategy, Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlDictionaryApiService, AlDictSource, AlRootResult, AlRootSourceResult } from '../../../../shared/services/al-dictionary-api.service';
import { QuranResearchSearchService } from '../quran-research-search.service';

@Component({
  selector: 'app-lexicon-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconPageComponent {
  private readonly api    = inject(AlDictionaryApiService);
  private readonly search = inject(QuranResearchSearchService);

  readonly sources        = signal<AlDictSource[]>([]);
  readonly sourcesLoading = signal(true);
  readonly searching      = signal(false);
  readonly rootResult     = signal<AlRootResult | null>(null);
  readonly selectedSource = signal<AlRootSourceResult | null>(null);
  readonly expandedSlugs  = signal<Set<string>>(new Set());

  private readonly search$ = new Subject<string>();

  readonly quickRoots = ['كتب', 'علم', 'قرأ', 'رحم', 'حمد', 'أمن', 'نزل', 'خلق', 'فتح', 'وحي'];

  constructor() {
    this.api.getSources().subscribe({
      next: res => { this.sources.set(res.sources); this.sourcesLoading.set(false); },
      error: () => this.sourcesLoading.set(false),
    });

    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(q => {
        const trimmed = q.trim();
        if (!trimmed) {
          this.rootResult.set(null);
          this.selectedSource.set(null);
          this.searching.set(false);
          return of(null);
        }
        this.searching.set(true);
        return this.api.getRootEntries(trimmed);
      }),
      takeUntilDestroyed(),
    ).subscribe(res => {
      this.searching.set(false);
      this.rootResult.set(res);
      this.selectedSource.set(null);
      if (res) {
        // Auto-expand first source
        const first = res.sources[0];
        if (first) this.expandedSlugs.set(new Set([first.slug]));
      }
    });
  }

  get searchTerm() { return this.search.searchTerm; }

  setSearch(value: string): void {
    this.search.setSearch(value);
    this.search$.next(value);
  }

  tryRoot(root: string): void { this.setSearch(root); }

  selectSourceEntry(src: AlRootSourceResult): void { this.selectedSource.set(src); }
  clearSourceEntry(): void { this.selectedSource.set(null); }

  toggleExpand(slug: string): void {
    this.expandedSlugs.update(set => {
      const next = new Set(set);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  isExpanded(slug: string): boolean { return this.expandedSlugs().has(slug); }

  volPage(entry: { volume_no: number | null; page_no: number | null }): string {
    if (entry.volume_no && entry.page_no) return `ج${entry.volume_no} ص${entry.page_no}`;
    if (entry.page_no) return `ص${entry.page_no}`;
    return '';
  }
}

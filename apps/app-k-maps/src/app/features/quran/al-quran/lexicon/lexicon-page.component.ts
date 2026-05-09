import { ChangeDetectionStrategy, Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuranResearchApiService, QrLemma, QrLemmaOccurrence, QrRoot } from '../../../../shared/services/quran-research-api.service';
import { QuranResearchSearchService } from '../quran-research-search.service';

type SearchMode = 'root' | 'text';

@Component({
  selector: 'app-lexicon-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconPageComponent {
  private readonly api    = inject(QuranResearchApiService);
  private readonly search = inject(QuranResearchSearchService);

  readonly searchMode    = signal<SearchMode>('root');
  readonly searching     = signal(false);
  readonly roots         = signal<QrRoot[]>([]);
  readonly lemmas        = signal<QrLemma[]>([]);
  readonly selectedRoot  = signal<string | null>(null);
  readonly selectedLemma = signal<QrLemma | null>(null);
  readonly occurrences   = signal<QrLemmaOccurrence[]>([]);
  readonly occTotal      = signal(0);
  readonly occLoading    = signal(false);

  private readonly search$ = new Subject<string>();

  readonly quickRoots = ['كتب','علم','قرأ','رحم','حمد','سبح','أمن','هدى','نزل','خلق'];

  constructor() {
    this.search$.pipe(
      debounceTime(280),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q.trim()) {
          this.roots.set([]); this.lemmas.set([]); this.searching.set(false);
          return of(null);
        }
        this.searching.set(true);
        return this.searchMode() === 'root'
          ? this.api.searchRoots(q)
          : this.api.searchLemmas(q);
      }),
      takeUntilDestroyed(),
    ).subscribe(res => {
      this.searching.set(false);
      if (!res) return;
      if ('roots' in res) { this.roots.set(res.roots); this.lemmas.set([]); }
      else                { this.lemmas.set(res.rows);  this.roots.set([]); }
    });

    effect(() => {
      const root = this.selectedRoot();
      if (!root) return;
      this.searching.set(true);
      this.api.getLemmasByRoot(root).subscribe({
        next: res => { this.lemmas.set(res.rows); this.searching.set(false); },
        error: () => this.searching.set(false),
      });
    });

    effect(() => {
      const lemma = this.selectedLemma();
      if (!lemma) return;
      this.occLoading.set(true);
      this.api.getLemmaOccurrences(lemma.id).subscribe({
        next: res => { this.occurrences.set(res.occurrences); this.occTotal.set(res.total); this.occLoading.set(false); },
        error: () => this.occLoading.set(false),
      });
    });
  }

  setSearch(value: string): void { this.search.setSearch(value); this.search$.next(value); }
  setMode(mode: SearchMode): void {
    this.searchMode.set(mode); this.roots.set([]); this.lemmas.set([]);
    this.selectedRoot.set(null); this.selectedLemma.set(null); this.occurrences.set([]);
    const q = this.search.searchTerm();
    if (q.trim()) this.search$.next(q);
  }

  selectRoot(root: string): void { this.selectedRoot.set(root); this.selectedLemma.set(null); this.occurrences.set([]); }
  selectLemma(l: QrLemma): void { this.selectedLemma.set(l); this.occurrences.set([]); }
  clearLemma(): void { this.selectedLemma.set(null); this.occurrences.set([]); }
  clearRoot(): void  { this.selectedRoot.set(null); this.lemmas.set([]); this.selectedLemma.set(null); }

  tryRoot(root: string): void { this.setSearch(root); }

  verseKey(o: QrLemmaOccurrence): string { return `${o.surah}:${o.ayah}`; }

  get searchTerm() { return this.search.searchTerm; }
}

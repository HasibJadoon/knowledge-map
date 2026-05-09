import {
  Component, OnInit, inject, signal, computed,
  ElementRef, ViewChild, AfterViewInit, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import gsap from 'gsap';
import { QuranResearchApiService } from '../../../../../shared/services/quran/quran-research-api.service';
import type { QrLemma, QrLemmaOccurrence, QrRoot } from '../../../../../shared/models/quran/qr.models';

type SearchMode = 'root' | 'text';

@Component({
  selector: 'km-lexicon-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
})
export class LexiconPageComponent implements AfterViewInit {
  @ViewChild('grid') grid?: ElementRef<HTMLElement>;

  private readonly api = inject(QuranResearchApiService);

  readonly searchMode   = signal<SearchMode>('root');
  readonly searchTerm   = signal('');
  readonly searching    = signal(false);

  readonly roots        = signal<QrRoot[]>([]);
  readonly lemmas       = signal<QrLemma[]>([]);
  readonly selectedRoot = signal<string | null>(null);
  readonly selectedLemma = signal<QrLemma | null>(null);
  readonly occurrences  = signal<QrLemmaOccurrence[]>([]);
  readonly occTotal     = signal(0);
  readonly occLoading   = signal(false);

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(280),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q.trim()) {
          this.roots.set([]);
          this.lemmas.set([]);
          this.searching.set(false);
          return of(null);
        }
        this.searching.set(true);
        if (this.searchMode() === 'root') {
          return this.api.searchRoots(q);
        } else {
          return this.api.searchLemmas(q);
        }
      }),
      takeUntilDestroyed(),
    ).subscribe(res => {
      this.searching.set(false);
      if (!res) return;
      if ('roots' in res) {
        this.roots.set(res.roots);
        this.lemmas.set([]);
      } else {
        this.lemmas.set(res.rows);
        this.roots.set([]);
      }
    });

    effect(() => {
      const root = this.selectedRoot();
      if (!root) return;
      this.searching.set(true);
      this.api.getLemmasByRoot(root).subscribe({
        next: res => {
          this.lemmas.set(res.rows);
          this.searching.set(false);
        },
        error: () => this.searching.set(false),
      });
    });

    effect(() => {
      const lemma = this.selectedLemma();
      if (!lemma) return;
      this.occLoading.set(true);
      this.api.getLemmaOccurrences(lemma.id).subscribe({
        next: res => {
          this.occurrences.set(res.occurrences);
          this.occTotal.set(res.total);
          this.occLoading.set(false);
        },
        error: () => this.occLoading.set(false),
      });
    });
  }

  ngAfterViewInit(): void {
    this.animateGrid();
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.search$.next(value);
  }

  setMode(mode: SearchMode): void {
    this.searchMode.set(mode);
    this.roots.set([]);
    this.lemmas.set([]);
    this.selectedRoot.set(null);
    this.selectedLemma.set(null);
    const term = this.searchTerm();
    if (term.trim()) this.search$.next(term);
  }

  selectRoot(root: string): void {
    this.selectedRoot.set(root);
    this.selectedLemma.set(null);
    this.occurrences.set([]);
  }

  selectLemma(lemma: QrLemma): void {
    this.selectedLemma.set(lemma);
    this.occurrences.set([]);
  }

  clearLemma(): void {
    this.selectedLemma.set(null);
    this.occurrences.set([]);
  }

  clearRoot(): void {
    this.selectedRoot.set(null);
    this.lemmas.set([]);
    this.selectedLemma.set(null);
    this.occurrences.set([]);
  }

  verseKey(occ: QrLemmaOccurrence): string {
    return `${occ.surah}:${occ.ayah}`;
  }

  private animateGrid(): void {
    const cards = Array.from(
      this.grid?.nativeElement.querySelectorAll<HTMLElement>('.lx-root-card, .lx-lemma-card') ?? [],
    );
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.32, stagger: 0.04, ease: 'power3.out', clearProps: 'transform' },
    );
  }
}

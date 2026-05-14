// ─── Mobile books library — mirror of desktop /lexicon/books ──────────────
//
// Lists every lexicon AND every academic source as a single grid so the
// reader can browse the whole library without typing a root first.
// Source count + click behaviour match the desktop layout; only the
// presentation switches to Ionic / single-column phone-friendly layout.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionSheetController, IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AlDictionaryApiService, AlDictSource, ScholarshipSource,
} from '../../../../shared/services/al-dictionary-api.service';

interface BookCard {
  kind:     'lexicon' | 'scholarship';
  slug:     string;
  title_ar: string;
  title_en: string;
  author:   string;
  period:   string;
  roots:    number;
  genre?:   string;
  genre_ar?: string;
  year?:    number | null;
}

type Filter = 'all' | 'lexicon' | 'scholarship';

@Component({
  selector: 'app-lexicon-books-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './lexicon-books-page.component.html',
  styleUrl: './lexicon-books-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconBooksPageComponent {
  private readonly api          = inject(AlDictionaryApiService);
  private readonly router       = inject(Router);
  private readonly actionSheets = inject(ActionSheetController);

  readonly books = signal<BookCard[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<Filter>('all');

  readonly lexiconCount     = computed(() => this.books().filter(b => b.kind === 'lexicon').length);
  readonly scholarshipCount = computed(() => this.books().filter(b => b.kind === 'scholarship').length);

  readonly filteredBooks = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.books();
    return this.books().filter(b => b.kind === f);
  });

  constructor() {
    forkJoin({
      lex: this.api.getSources().pipe(
        catchError(() => of({ sources: [] as AlDictSource[], total: 0 })),
      ),
      sch: this.api.getScholarshipSources().pipe(
        catchError(() => of({ sources: [] as ScholarshipSource[], total: 0 })),
      ),
    }).pipe(takeUntilDestroyed()).subscribe(({ lex, sch }) => {
      const cards: BookCard[] = [];
      for (const s of lex.sources) {
        cards.push({
          kind:     'lexicon',
          slug:     s.slug,
          title_ar: s.title_ar,
          title_en: s.title_en,
          author:   s.author,
          period:   s.period,
          roots:    s.roots,
        });
      }
      for (const s of sch.sources) {
        if (!s.slug) continue;
        cards.push({
          kind:     'scholarship',
          slug:     s.slug,
          title_ar: s.title_ar,
          title_en: s.title_en,
          author:   s.author,
          period:   s.year ? String(s.year) : '',
          roots:    s.count,
          genre:    s.genre,
          genre_ar: s.genre_label?.ar,
          year:     s.year,
        });
      }
      this.books.set(cards);
      this.loading.set(false);
    });
  }

  goBack(): void {
    // Blur the active element first so Ionic doesn't aria-hide a focused
    // descendant when transitioning back to the hub.
    const active = document.activeElement as HTMLElement | null;
    active?.blur?.();
    this.router.navigate(['/quran/al-quran/lexicon']);
  }

  setFilter(f: Filter): void { this.filter.set(f); }

  async openFilterSheet(): Promise<void> {
    const current = this.filter();
    const sheet = await this.actionSheets.create({
      cssClass: 'lxb-filter-sheet',
      buttons: [
        {
          text: 'الكل',
          cssClass: current === 'all' ? 'lxb-sheet-active' : '',
          handler: () => this.filter.set('all'),
        },
        {
          text: 'المعاجم',
          cssClass: current === 'lexicon' ? 'lxb-sheet-active' : '',
          handler: () => this.filter.set('lexicon'),
        },
        {
          text: 'أكاديمي',
          cssClass: current === 'scholarship' ? 'lxb-sheet-active' : '',
          handler: () => this.filter.set('scholarship'),
        },
        { text: 'إلغاء', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  /** Open a source in the unified rich reader. The reader dispatches by
   *  source kind (Lane / Classical / Mufradat / Scholarship) and loads
   *  the appropriate composer endpoint. */
  openBook(b: BookCard): void {
    const active = document.activeElement as HTMLElement | null;
    active?.blur?.();
    this.router.navigate(['/quran/al-quran/lexicon/read', b.slug]);
  }
}

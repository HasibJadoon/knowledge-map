// ─── Mobile books library — mirror of desktop /lexicon/books ──────────────
//
// Lists every lexicon AND every academic source as a single grid so the
// reader can browse the whole library without typing a root first.
// Source count + click behaviour match the desktop layout; only the
// presentation switches to Ionic / single-column phone-friendly layout.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
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

@Component({
  selector: 'app-lexicon-books-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './lexicon-books-page.component.html',
  styleUrl: './lexicon-books-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconBooksPageComponent {
  private readonly api    = inject(AlDictionaryApiService);
  private readonly router = inject(Router);

  readonly books = signal<BookCard[]>([]);
  readonly loading = signal(true);

  readonly lexiconCount     = computed(() => this.books().filter(b => b.kind === 'lexicon').length);
  readonly scholarshipCount = computed(() => this.books().filter(b => b.kind === 'scholarship').length);

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

  goBack(): void { this.router.navigate(['/quran/al-quran/lexicon']); }

  /** Open a source. Lane → existing rich mobile page. Other classical
   *  and scholarship sources currently fall through to the same Lane
   *  page with `?source=<slug>` so the slug is preserved end-to-end
   *  for future per-source mobile shells. */
  openBook(b: BookCard): void {
    if (b.slug === 'lane_lexicon' || b.slug === 'lane_quranic_research_perseus') {
      this.router.navigate(['/quran/al-quran/lane-lexicon']);
      return;
    }
    this.router.navigate(['/quran/al-quran/lane-lexicon'], {
      queryParams: { source: b.slug },
    });
  }
}

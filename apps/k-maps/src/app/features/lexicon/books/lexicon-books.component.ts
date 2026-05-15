import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, catchError, of } from 'rxjs';
import {
  AlDictionaryApiService, AlDictSource, ScholarshipSource,
} from '../../../shared/services/al-dictionary-api.service';

// Unified card type. Lexicon cards use `roots` (root count); scholarship
// cards use `count` (note count) — both rendered as "X جذرًا" / "X قراءات".
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
  selector: 'km-lexicon-books',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="lex-books" dir="rtl">
      <header>
        <a class="back" [routerLink]="['/quran/al-quran']">← الرجوع</a>
        <h1>المكتبة</h1>
        <p>اختر معجمًا أو قراءة أكاديمية للتصفّح كاملًا. <span class="stat">{{ books().length }} مصدرًا</span></p>
      </header>

      @if (loading()) {
        <p class="muted">…</p>
      } @else {
        <ul class="grid">
          @for (b of books(); track b.slug) {
            <li>
              <a class="card" [class.card--academic]="b.kind === 'scholarship'"
                 [attr.data-genre]="b.genre"
                 [routerLink]="['/lexicon/books', b.slug]">
                @if (b.kind === 'scholarship') {
                  <span class="card__kind-badge">أكاديمي · {{ b.genre_ar || 'Academic' }}</span>
                }
                <h2>{{ b.title_ar }}</h2>
                <p class="author">{{ b.author }}{{ b.year ? ' · ' + b.year : '' }}</p>
                <p class="period">{{ b.period }}</p>
                <p class="stats">
                  @if (b.kind === 'scholarship') {
                    {{ b.roots | number }} قراءة
                  } @else {
                    {{ b.roots | number }} جذرًا
                  }
                </p>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [`
    :host { display: block; background: #1c1b18; min-height: 100vh; font-family: 'Amiri', Georgia, serif; color: #e9e0c8; }
    .lex-books { max-width: 1100px; margin: 0 auto; padding: 32px 24px 80px; }
    header { margin-bottom: 24px; }
    h1 { font-size: 2rem; margin: 4px 0 0; }
    p { color: #a89f87; margin: 4px 0; }
    .stat { color: #c8a04a; margin-inline-start: 0.6rem; font-size: 0.85rem; }
    .muted { color: #a89f87; }
    .back { color: #c8a04a; text-decoration: none; font-size: 0.95rem; }
    .grid { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .card { position: relative; display: block; background: #25231e; border: 1px solid #3a362c; border-radius: 12px; padding: 20px; text-decoration: none; color: inherit; transition: transform .15s, border-color .15s, box-shadow .15s; }
    .card:hover { transform: translateY(-2px); border-color: #c8a04a; box-shadow: 0 4px 12px rgba(0,0,0,.4); }
    .card h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: #e9e0c8; }
    .author { font-size: 0.9rem; }
    .period { font-size: 0.8rem; opacity: 0.7; }
    .stats { color: #c8a04a; font-weight: 600; font-size: 0.9rem; }

    /* Academic / scholarship variant — saddle accent so the kind is recognized */
    .card--academic { border-color: rgba(214, 138, 74, 0.32); background: linear-gradient(155deg, rgba(214,138,74,0.08), rgba(255,255,255,0.012)); }
    .card--academic:hover { border-color: #d68a4a; box-shadow: 0 4px 14px rgba(214, 138, 74, 0.18); }
    .card--academic h2 { color: #d68a4a; }
    .card--academic .stats { color: #d68a4a; }
    .card--academic[data-genre='epigraphic']           { border-color: rgba(182,201,138, 0.40); h2 { color: #b6c98a; } .stats { color: #b6c98a; } }
    .card--academic[data-genre='qur_anic_hermeneutic'] { border-color: rgba(169,210,138, 0.40); h2 { color: #a9d28a; } .stats { color: #a9d28a; } }
    .card--academic[data-genre='comparative_semitic']  { border-color: rgba(146,190,225, 0.40); h2 { color: #92bee1; } .stats { color: #92bee1; } }

    .card__kind-badge {
      position: absolute;
      top: 10px; inset-inline-start: 10px;
      padding: 2px 8px;
      font-size: 0.7rem;
      font-weight: 600;
      border-radius: 999px;
      background: rgba(214,138,74, 0.14);
      color: #d68a4a;
      border: 1px solid rgba(214,138,74, 0.30);
      letter-spacing: 0.02em;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconBooksComponent {
  private readonly api = inject(AlDictionaryApiService);
  readonly books = signal<BookCard[]>([]);
  readonly loading = signal(true);

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
}

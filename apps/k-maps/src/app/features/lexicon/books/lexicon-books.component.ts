import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlDictionaryApiService, AlDictSource } from '../../../shared/services/al-dictionary-api.service';

@Component({
  selector: 'km-lexicon-books',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="lex-books" dir="rtl">
      <header>
        <a class="back" [routerLink]="['/lexicon']">← الرجوع</a>
        <h1>المكتبة</h1>
        <p>اختر معجمًا لقراءته كاملًا.</p>
      </header>

      @if (loading()) {
        <p class="muted">…</p>
      } @else {
        <ul class="grid">
          @for (b of books(); track b.slug) {
            <li>
              <a class="card" [routerLink]="['/lexicon/books', b.slug]">
                <h2>{{ b.title_ar }}</h2>
                <p class="author">{{ b.author }}</p>
                <p class="period">{{ b.period }}</p>
                <p class="stats">{{ b.roots | number }} جذرًا</p>
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
    .muted { color: #a89f87; }
    .back { color: #c8a04a; text-decoration: none; font-size: 0.95rem; }
    .grid { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .card { display: block; background: #25231e; border: 1px solid #3a362c; border-radius: 12px; padding: 20px; text-decoration: none; color: inherit; transition: transform .15s, border-color .15s, box-shadow .15s; }
    .card:hover { transform: translateY(-2px); border-color: #c8a04a; box-shadow: 0 4px 12px rgba(0,0,0,.4); }
    .card h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: #e9e0c8; }
    .author { font-size: 0.9rem; }
    .period { font-size: 0.8rem; opacity: 0.7; }
    .stats { color: #c8a04a; font-weight: 600; font-size: 0.9rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconBooksComponent {
  private readonly api = inject(AlDictionaryApiService);
  readonly books = signal<AlDictSource[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.api.getSources().pipe(takeUntilDestroyed()).subscribe({
      next: r => { this.books.set(r.sources); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}

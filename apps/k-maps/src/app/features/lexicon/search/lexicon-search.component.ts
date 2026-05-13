import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'km-lexicon-search',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="search" dir="rtl">
      <header>
        <a class="back" [routerLink]="['/lexicon']">← الرئيسية</a>
        <h1>نتائج البحث</h1>
        <p class="meta">{{ query() }} <span class="mode">({{ mode() === 'root' ? 'جذر' : 'كلمة' }})</span></p>
      </header>
      <p class="placeholder">صفحة نتائج البحث — قيد الإنشاء.</p>
    </section>
  `,
  styles: [`
    :host { display: block; background: #1c1b18; min-height: 100vh; font-family: 'Amiri', Georgia, serif; color: #e9e0c8; }
    .search { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    header { margin-bottom: 24px; }
    h1 { font-size: 1.6rem; margin: 8px 0; }
    .meta { font-size: 1.2rem; color: #c8a04a; }
    .mode { color: #a89f87; font-size: 0.95rem; }
    .back { color: #c8a04a; text-decoration: none; }
    .placeholder { color: #a89f87; padding: 40px; text-align: center; border: 1px dashed #3a362c; border-radius: 12px; background: #25231e; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconSearchComponent {
  readonly query = signal('');
  readonly mode  = signal<'root' | 'word'>('root');

  constructor() {
    const route = inject(ActivatedRoute);
    route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(p => {
      this.query.set(p.get('q') ?? '');
      const m = p.get('mode');
      if (m === 'word' || m === 'root') this.mode.set(m);
    });
  }
}

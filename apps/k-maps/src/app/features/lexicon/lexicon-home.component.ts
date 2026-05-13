import {
  ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlDictionaryApiService, AlDictSource } from '../../shared/services/al-dictionary-api.service';

type SearchMode = 'root' | 'word';

@Component({
  selector: 'km-lexicon-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lexicon-home.component.html',
  styleUrl: './lexicon-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconHomeComponent {
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  private readonly api    = inject(AlDictionaryApiService);
  private readonly router = inject(Router);

  readonly sources        = signal<AlDictSource[]>([]);
  readonly sourcesLoading = signal(true);
  readonly searchMode     = signal<SearchMode>('root');
  readonly query          = signal('');

  // Curated quick-pick roots (well-known classical roots).
  readonly quickRoots = ['كتب', 'علم', 'قرأ', 'رحم', 'حمد', 'أمن', 'نزل', 'خلق', 'فتح', 'وحي'];

  constructor() {
    this.api.getSources().pipe(takeUntilDestroyed()).subscribe({
      next: res => { this.sources.set(res.sources); this.sourcesLoading.set(false); },
      error: () => this.sourcesLoading.set(false),
    });
  }

  // Total roots across all available sources (display stat for the Books card).
  readonly totalRoots = () => this.sources().reduce((s, x) => s + (x.roots ?? 0), 0);

  // Show only the top N books by root count on the home card.
  readonly featuredBooks = () => [...this.sources()]
    .sort((a, b) => (b.roots ?? 0) - (a.roots ?? 0))
    .slice(0, 6);

  focusSearch() {
    queueMicrotask(() => this.searchInputRef?.nativeElement.focus());
  }

  setMode(m: SearchMode) { this.searchMode.set(m); this.focusSearch(); }

  submit() {
    const q = this.query().trim();
    if (!q) return;
    this.router.navigate(['/lexicon/search'], {
      queryParams: { q, mode: this.searchMode() },
    });
  }

  quickPick(root: string) {
    this.query.set(root);
    this.searchMode.set('root');
    this.submit();
  }
}

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { StatusPillComponent } from '../../../shared/components/status-pill/status-pill.component';
import {
  WorldviewLibraryApiService,
  WvSourceRow,
} from '../../../shared/services/worldview/worldview-library-api.service';

interface WvSourceMeta {
  tradition?: string;
  worldview?: string;
  [key: string]: unknown;
}

interface WvSource {
  id: string;
  source_type?: string | null;
  title: string;
  subtitle?: string | null;
  creator?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  published_year?: number | null;
  language?: string | null;
  source_domain?: string | null;
  meta?: WvSourceMeta | null;
  unit_count?: number | null;
  people_count?: number | null;
  people_names?: string[] | null;
}

@Component({
  selector: 'km-worldview-library',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, StatusPillComponent],
  templateUrl: './worldview-library.component.html',
  styleUrl: './worldview-library.component.scss',
})
export class WorldviewLibraryComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private libraryApi = inject(WorldviewLibraryApiService);
  private cdr = inject(ChangeDetectorRef);

  readonly sources = signal<WvSource[]>([]);
  readonly loading = signal(true);
  readonly activeTypeFilter = signal<string>('all');
  readonly groupByType = signal(false);
  readonly searchQuery = signal('');

  readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly objectKeys = Object.keys;

  readonly sourceTypes = computed(() => {
    const types = new Set(this.sources().map((source) => this.normalizeType(source.source_type)));
    return ['all', ...Array.from(types)];
  });

  readonly filteredSources = computed(() => {
    const type = this.activeTypeFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return this.sources().filter((source) => {
      const matchesType = type === 'all' || this.normalizeType(source.source_type) === type;
      if (!matchesType) return false;
      if (!query) return true;

      const haystack = [
        source.title,
        source.subtitle,
        source.creator,
        source.publisher,
        source.language,
        source.source_domain,
        source.meta?.tradition,
        source.meta?.worldview,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  });

  readonly groupedSources = computed(() => {
    if (!this.groupByType()) return null;

    const groups: Record<string, WvSource[]> = {};
    for (const source of this.filteredSources()) {
      const type = this.normalizeType(source.source_type);
      (groups[type] ??= []).push(source);
    }
    return groups;
  });

  ngOnInit(): void {
    this.libraryApi.listSources(100).subscribe({
      next: (rows) => {
        this.sources.set(rows.map((row) => this.normalizeSource(row)));
        this.loading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => {
          gsap.fromTo(
            '.wv-card',
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.055, ease: 'power2.out' },
          );
        });
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private normalizeSource(row: WvSourceRow): WvSource {
    return {
      ...row,
      publication_year: row.published_year ?? null,
    };
  }

  ngAfterViewInit(): void {
    gsap.fromTo('.wv-lib-page', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  openSource(source: WvSource): void {
    void this.router.navigate(['/worldview/library', source.id]);
  }

  back(): void {
    void this.router.navigate(['/worldview']);
  }

  normalizeType(type?: string | null): string {
    return (type ?? '').trim() || 'other';
  }

  typeIcon(type?: string | null): string {
    const key = this.normalizeType(type);
    const map: Record<string, string> = {
      book: '📚',
      article: '📰',
      essay: '✍',
      paper: '🧾',
      lecture: '🎓',
      podcast: '🎙',
      video: '▶',
      website: '⌘',
      scripture: '✧',
      report: '▣',
      other: '◎',
    };
    return map[key] ?? '◎';
  }

  typeLabel(type?: string | null): string {
    const key = this.normalizeType(type);
    const map: Record<string, string> = {
      book: 'Book',
      article: 'Article',
      essay: 'Essay',
      paper: 'Paper',
      lecture: 'Lecture',
      podcast: 'Podcast',
      video: 'Video',
      website: 'Website',
      scripture: 'Scripture',
      report: 'Report',
      other: 'Source',
    };
    return map[key] ?? this.startCase(key);
  }

  typeColor(type?: string | null): string {
    const key = this.normalizeType(type);
    const map: Record<string, string> = {
      book: 'gold',
      article: 'blue',
      essay: 'ember',
      paper: 'purple',
      lecture: 'sage',
      podcast: 'sage',
      video: 'blue',
      website: 'amber',
      scripture: 'gold',
      report: 'purple',
      other: '',
    };
    return map[key] ?? '';
  }

  sourceMetaLine(source: WvSource): string {
    const parts = [
      source.subtitle,
      source.publisher,
      source.meta?.tradition as string | undefined,
      source.source_domain,
    ].filter(Boolean);
    return parts.join(' · ');
  }

  sourcePeopleLine(source: WvSource): string {
    const peopleNames = (source.people_names ?? []).filter(Boolean);
    if (peopleNames.length) return peopleNames.join(' · ');
    if ((source.people_count ?? 0) > 0) {
      return `${source.people_count} ${source.people_count === 1 ? 'person' : 'people'}`;
    }
    return '';
  }

  private startCase(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

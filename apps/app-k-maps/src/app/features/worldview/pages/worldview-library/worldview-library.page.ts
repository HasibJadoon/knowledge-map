import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

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
  meta_json?: string | WvSourceMeta | null;
  meta?: WvSourceMeta | null;
  unit_count?: number | null;
  people_count?: number | null;
  people_names?: string[] | null;
}

@Component({
  selector: 'app-worldview-library',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, FormsModule],
  templateUrl: './worldview-library.page.html',
  styleUrl: './worldview-library.page.scss',
})
export class WorldviewLibraryPage implements OnInit {
  readonly sources = signal<WvSource[]>([]);
  readonly loading = signal(true);
  readonly activeTypeFilter = signal<string>('all');
  readonly groupByType = signal(false);
  readonly searchQuery = signal('');

  readonly skeletons = [1, 2, 3, 4, 5, 6];
  readonly objectKeys = Object.keys;

  readonly sourceTypes = computed(() => {
    const types = new Set(this.sources().map((s) => this.normalizeType(s.source_type)));
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
    void this.loadSources();
  }

  private async loadSources(): Promise<void> {
    try {
      const res = await fetch(`${environment.apiBase}/worldview/sources?limit=100`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; data?: WvSource[]; results?: WvSource[] };
      if (data.ok) this.sources.set((data.data ?? data.results ?? []).map((source) => this.normalizeSource(source)));
    } catch {
      // silently ignore
    } finally {
      this.loading.set(false);
    }
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
    return map[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
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
    return [source.subtitle, source.publisher, source.meta?.tradition as string | undefined, source.source_domain]
      .filter(Boolean)
      .join(' · ');
  }

  sourcePeopleLine(source: WvSource): string {
    const names = (source.people_names ?? []).filter(Boolean);
    if (names.length) return names.join(' · ');
    if ((source.people_count ?? 0) > 0) {
      return `${source.people_count} ${source.people_count === 1 ? 'person' : 'people'}`;
    }
    return '';
  }

  sourceYear(source: WvSource): number | null {
    return source.publication_year ?? source.published_year ?? null;
  }

  private normalizeSource(source: WvSource): WvSource {
    const meta = this.parseMeta(source.meta ?? source.meta_json);
    return {
      ...source,
      meta,
      creator: source.creator ?? (typeof meta?.['creator'] === 'string' ? meta['creator'] : null),
      publication_year: source.publication_year ?? source.published_year ?? null,
    };
  }

  private parseMeta(value: unknown): WvSourceMeta | null {
    if (!value) return null;
    if (typeof value === 'object' && !Array.isArray(value)) return value as WvSourceMeta;
    if (typeof value !== 'string') return null;
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as WvSourceMeta : null;
    } catch {
      return null;
    }
  }
}

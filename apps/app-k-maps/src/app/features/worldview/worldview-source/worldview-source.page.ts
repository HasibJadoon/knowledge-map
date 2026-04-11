import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../../../environments/environment';

interface WvSource {
  id: string;
  source_type?: string | null;
  title: string;
  subtitle?: string | null;
  creator?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  language?: string | null;
  source_domain?: string | null;
  status?: string | null;
  meta?: Record<string, unknown> | null;
  people?: Array<{ id: string; display_name?: string | null; role?: string | null }> | null;
}

interface WvUnit {
  id: string;
  source_id: string;
  parent_unit_id?: string | null;
  unit_type?: string | null;
  title?: string | null;
  order_index?: number | null;
  start_ref?: string | null;
  end_ref?: string | null;
  anchor_text?: string | null;
  summary?: string | null;
  body_preview?: string | null;
  children?: WvUnit[];
}

@Component({
  selector: 'app-worldview-source',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './worldview-source.page.html',
  styleUrl: './worldview-source.page.scss',
})
export class WorldviewSourcePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sourceId = signal('');
  readonly source = signal<WvSource | null>(null);
  readonly units = signal<WvUnit[]>([]);
  readonly loading = signal(true);
  readonly skeletons = [1, 2, 3, 4];

  readonly rootUnits = computed(() =>
    this.units()
      .filter(u => !u.parent_unit_id)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  );

  readonly chapterCount = computed(() => this.rootUnits().length);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sourceId') ?? '';
    this.sourceId.set(id);
    void this.load(id);
  }

  private async load(id: string): Promise<void> {
    try {
      const res = await fetch(`${environment.apiBase}/worldview/sources/${id}`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; source: WvSource; units: WvUnit[] };
      if (data.ok) {
        this.source.set(data.source);
        this.units.set(data.units ?? []);
      }
    } catch {
      // silently ignore
    } finally {
      this.loading.set(false);
    }
  }

  openUnit(unitId: string): void {
    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', unitId]);
  }

  typeIcon(type?: string | null): string {
    const map: Record<string, string> = {
      book: '📚', article: '📰', essay: '✍', paper: '🧾',
      lecture: '🎓', podcast: '🎙', video: '▶', scripture: '✧', document: '◎', other: '◎',
    };
    return map[(type ?? '').toLowerCase()] ?? '◎';
  }

  typeLabel(type?: string | null): string {
    const map: Record<string, string> = {
      book: 'Book', article: 'Article', essay: 'Essay', paper: 'Paper',
      lecture: 'Lecture', podcast: 'Podcast', video: 'Video', scripture: 'Scripture', document: 'Document',
    };
    return map[(type ?? '').toLowerCase()] ?? 'Source';
  }

  typeColor(type?: string | null): string {
    const map: Record<string, string> = {
      book: 'gold', article: 'blue', essay: 'ember', paper: 'purple',
      lecture: 'sage', podcast: 'sage', video: 'blue', scripture: 'gold', document: '',
    };
    return map[(type ?? '').toLowerCase()] ?? '';
  }

  unitTypeLabel(type?: string | null): string {
    const map: Record<string, string> = {
      chapter: 'Chapter', section: 'Section', part: 'Part', preface: 'Preface',
      introduction: 'Introduction', appendix: 'Appendix', conclusion: 'Conclusion', verse: 'Verse',
    };
    return map[(type ?? '').toLowerCase()] ?? 'Unit';
  }

  peopleLine(): string {
    const src = this.source();
    if (!src) return '';
    if (src.people?.length) return src.people.map(p => p.display_name).filter(Boolean).join(' · ');
    return src.creator ?? '';
  }
}

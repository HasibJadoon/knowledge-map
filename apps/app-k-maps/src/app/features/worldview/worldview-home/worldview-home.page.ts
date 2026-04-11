import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../../../environments/environment';

interface WvCard {
  glyph: string;
  title: string;
  desc: string;
  route: string;
  tag: string;
}

interface WvStat {
  key: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-worldview-home',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './worldview-home.page.html',
  styleUrl: './worldview-home.page.scss',
})
export class WorldviewHomePage implements OnInit {
  readonly stats = signal<WvStat[]>([
    { key: 'worldviews',   label: 'Worldviews', value: '—' },
    { key: 'sources',      label: 'Sources',    value: '—' },
    { key: 'source_units', label: 'Units',      value: '—' },
    { key: 'people',       label: 'People',     value: '—' },
  ]);

  readonly cards: WvCard[] = [
    {
      glyph: '§',
      title: 'Library',
      desc: 'Source library — books, notes, highlights and distillations across all your reading.',
      route: '/worldview/library',
      tag: 'Sources',
    },
    {
      glyph: '↔',
      title: 'Comparison',
      desc: 'Parallel scripture comparison across traditions — side-by-side tab analysis.',
      route: '/worldview/compare',
      tag: 'Analysis',
    },
    {
      glyph: '⚡',
      title: 'Brainstorm',
      desc: 'Free-form research journal and idea capture — session-based thinking space.',
      route: '/worldview/brainstorm',
      tag: 'Research',
    },
  ];

  ngOnInit(): void {
    void this.loadCounts();
  }

  private async loadCounts(): Promise<void> {
    try {
      const res = await fetch(`${environment.apiBase}/hub/counts`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; counts: Record<string, number> };
      if (!data.ok || !data.counts) return;
      const c = data.counts;
      this.stats.update(list =>
        list.map(s => ({ ...s, value: c[s.key] != null ? String(c[s.key]) : '—' }))
      );
    } catch {
      // silently ignore
    }
  }
}

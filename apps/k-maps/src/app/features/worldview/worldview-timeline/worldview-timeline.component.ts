import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { WorldviewLibraryApiService } from '../../../shared/services/worldview/worldview-library-api.service';

// Desktop dual-register timeline. Mirrors the mobile WorldviewTimelinePage logic
// (era ranges as a long tail + dated incidents clustering into a modern spike),
// reading the same /units/:id/annotations payload. Plain-Angular chrome.

interface TlIncident { year: number; title: string; kind: 'spine' | 'modern'; }
interface TlEra {
  id: string; title: string; yearStart: number; yearEnd: number;
  order: number; color: string; summary: string; incidents: TlIncident[];
}
interface EraRect { x: number; w: number; color: string; title: string; labelX: number; showLabel: boolean; }
interface DotGeom { x: number; y: number; r: number; kind: 'spine' | 'modern'; title: string; year: number; }
interface Tick { x: number; label: string; }

const ERA_RAMP = ['#c9a84c', '#cf953f', '#cc7748', '#c45a3a', '#b8443f'];
const VB_W = 1000, PAD_L = 26, PAD_R = 26, AXIS_Y = 96;

@Component({
  selector: 'km-worldview-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './worldview-timeline.component.html',
  styleUrl: './worldview-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewTimelineComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly libraryApi = inject(WorldviewLibraryApiService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly loading = signal(true);
  readonly eras = signal<TlEra[]>([]);
  readonly vbW = VB_W;
  readonly axisY = AXIS_Y;

  readonly domain = computed<[number, number]>(() => {
    const years: number[] = [];
    for (const era of this.eras()) {
      years.push(era.yearStart, era.yearEnd);
      for (const inc of era.incidents) years.push(inc.year);
    }
    if (!years.length) return [600, 2010];
    return [Math.floor(Math.min(...years) / 100) * 100, Math.ceil(Math.max(...years) / 10) * 10];
  });

  readonly eraRects = computed<EraRect[]>(() =>
    this.eras().map((era) => {
      const x0 = this.scale(era.yearStart);
      const w = Math.max(4, this.scale(era.yearEnd) - x0);
      return { x: x0, w, color: era.color, title: era.title, labelX: x0 + w / 2, showLabel: w > 150 };
    }),
  );

  readonly dots = computed<DotGeom[]>(() => {
    const all: TlIncident[] = [];
    for (const era of this.eras()) all.push(...era.incidents);
    all.sort((a, b) => a.year - b.year);
    const GAP = 24;
    const out: DotGeom[] = [];
    let lastX = -Infinity, row = 0;
    for (const inc of all) {
      const x = this.scale(inc.year);
      row = x - lastX < GAP ? row + 1 : 0;
      lastX = x;
      out.push({ x, y: AXIS_Y + 18 + row * 15, r: inc.kind === 'modern' ? 4.5 : 4, kind: inc.kind, title: inc.title, year: inc.year });
    }
    return out;
  });

  readonly ticks = computed<Tick[]>(() => {
    const [lo, hi] = this.domain();
    return [700, 1000, 1300, 1500, 1700, 1900, 2010]
      .filter((y) => y >= lo && y <= hi)
      .map((y) => ({ x: this.scale(y), label: String(y) }));
  });

  readonly incidentCount = computed(() => this.eras().reduce((s, e) => s + e.incidents.length, 0));

  ngOnInit(): void {
    const sourceId = this.route.snapshot.paramMap.get('sourceId') ?? '';
    const unitId = this.route.snapshot.paramMap.get('unitId') ?? '';
    this.sourceId.set(sourceId);
    this.unitId.set(unitId);
    if (!sourceId || !unitId) { void this.router.navigate(['/worldview/library']); return; }
    void this.load(unitId);
  }

  goToGraph(): void {
    void this.router.navigate(['/worldview/library', this.sourceId(), 'graph', this.unitId()]);
  }

  private async load(unitId: string): Promise<void> {
    this.loading.set(true);
    try {
      const annotations = await firstValueFrom(this.libraryApi.getUnitAnnotations(unitId));
      const wv = Array.isArray((annotations as { wv?: unknown[] })?.wv) ? (annotations as { wv: unknown[] }).wv : [];
      this.eras.set(this.buildEras(wv));
    } catch {
      this.eras.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private buildEras(rawNodes: unknown[]): TlEra[] {
    const eras: TlEra[] = [];
    rawNodes.forEach((raw) => {
      const node = (raw ?? {}) as Record<string, unknown>;
      if (String(node['node_type'] ?? '') !== 'era') return;
      const data = parseObj(node['data_json']);
      const yearStart = num(data?.['year_start']);
      const yearEnd = num(data?.['year_end']);
      if (yearStart == null || yearEnd == null) return;
      const incidents: TlIncident[] = Array.isArray(data?.['incidents'])
        ? (data!['incidents'] as unknown[]).map((i) => {
            const inc = (i ?? {}) as Record<string, unknown>;
            const year = num(inc['year']);
            if (year == null) return null;
            return { year, title: String(inc['title'] ?? ''), kind: (inc['kind'] === 'spine' ? 'spine' : 'modern') as 'spine' | 'modern' };
          }).filter((x): x is TlIncident => !!x)
        : [];
      eras.push({
        id: String(node['id'] ?? ''), title: String(node['title'] ?? 'Era'),
        yearStart, yearEnd, order: num(data?.['order_index']) ?? 999, color: '#c9a84c',
        summary: String(node['summary'] ?? node['text_plain'] ?? ''), incidents,
      });
    });
    eras.sort((a, b) => a.order - b.order || a.yearStart - b.yearStart);
    eras.forEach((era, i) => { era.color = ERA_RAMP[i % ERA_RAMP.length]; });
    return eras;
  }

  private scale(year: number): number {
    const [lo, hi] = this.domain();
    if (hi === lo) return PAD_L;
    return PAD_L + ((year - lo) / (hi - lo)) * (VB_W - PAD_L - PAD_R);
  }

  eraRangeLabel(era: TlEra): string { return `${era.yearStart} – ${era.yearEnd}`; }
}

function parseObj(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch { return null; }
}
function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

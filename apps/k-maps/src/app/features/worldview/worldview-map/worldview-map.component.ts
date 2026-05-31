import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  WorldviewLibraryApiService,
  WvMapFeature,
} from '../../../shared/services/worldview/worldview-library-api.service';

// Desktop westward-migration map (schematic equirectangular cartography).
// Mirrors the mobile WorldviewMapPage, with directional labels so the tight
// Mediterranean cluster stays readable.
//
// Data: fetched per source from D1 (wv_map_features via
// GET /worldview/units/:id/map-features). The curated WAYPOINTS below are kept
// as a fallback so the map still renders if the source has no map layer yet.

type LabelDir = 'up' | 'down' | 'right' | 'left';

interface Waypoint {
  id: string; kind: 'center' | 'stop'; label: string; sub: string;
  lon: number; lat: number; order: number; year: number | null; intensity: number;
  dir: LabelDir; era: string | null;
}
interface PlacedPoint extends Waypoint {
  x: number; y: number; r: number; color: string;
  labelAnchor: 'start' | 'middle' | 'end'; labelX: number; mainY: number; subY: number;
}
interface Arc { d: string; }
interface GridLine { x1: number; y1: number; x2: number; y2: number; }

// Fallback (Arjana, "Muslims in the Western Imagination"): the westward spread of
// the Muslim-monster imaginaire across the five eras. Used only when the backend
// returns no map features for the source.
const WAYPOINTS: Waypoint[] = [
  { id: 'center',        kind: 'center', label: 'Christian center', sub: 'Rome · Jerusalem',          lon: 16,    lat: 41.9,  order: 0, year: null, intensity: 0, dir: 'up',    era: 'medieval' },
  { id: 'andalus',       kind: 'stop',   label: 'al-Andalus',       sub: 'Saracens & Moors',          lon: -4.78, lat: 37.89, order: 1, year: 1100, intensity: 2, dir: 'down',  era: 'medieval' },
  { id: 'constantinople',kind: 'stop',   label: 'Constantinople',   sub: 'The Turk · 1453',           lon: 28.98, lat: 41.01, order: 2, year: 1453, intensity: 3, dir: 'right', era: 'renaissance' },
  { id: 'americas',      kind: 'stop',   label: 'The Americas',     sub: 'New World · New Cairo 1492',lon: -72,   lat: 18,    order: 3, year: 1492, intensity: 3, dir: 'up',    era: 'americas' },
  { id: 'barbary',       kind: 'stop',   label: 'Barbary Coast',    sub: 'Corsair panic',             lon: 3.06,  lat: 36.75, order: 4, year: 1785, intensity: 2, dir: 'down',  era: 'americas' },
  { id: 'nile',          kind: 'stop',   label: 'Egypt & the Nile', sub: 'Orientalism · the Mummy',   lon: 31.24, lat: 30.04, order: 5, year: 1836, intensity: 3, dir: 'right', era: 'orientalist' },
  { id: 'london',        kind: 'stop',   label: 'London',           sub: 'Gothic · Dracula',          lon: -0.13, lat: 51.51, order: 6, year: 1897, intensity: 2, dir: 'up',    era: 'orientalist' },
  { id: 'newyork',       kind: 'stop',   label: 'New York',         sub: 'September 11, 2001',         lon: -74,   lat: 40.71, order: 7, year: 2001, intensity: 3, dir: 'left',  era: 'sept11' },
  { id: 'guantanamo',    kind: 'stop',   label: 'Guantánamo',       sub: 'Bare life · 2002',           lon: -75.1, lat: 19.91, order: 8, year: 2002, intensity: 2, dir: 'down',  era: 'sept11' },
  { id: 'abughraib',     kind: 'stop',   label: 'Abu Ghraib',       sub: 'War on Terror · 2004',       lon: 44.06, lat: 33.29, order: 9, year: 2004, intensity: 3, dir: 'down',  era: 'sept11' },
];
const VB_W = 1000, VB_H = 560, LON_MIN = -92, LON_MAX = 52, LAT_MIN = 6, LAT_MAX = 54;

const ERA_COLORS: Record<string, string> = {
  medieval:    '#8a6d3b',
  renaissance: '#b5651d',
  americas:    '#2e7d6b',
  orientalist: '#7b4fa3',
  sept11:      '#c4503a',
};

@Component({
  selector: 'km-worldview-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './worldview-map.component.html',
  styleUrl: './worldview-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewMapComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly libraryApi = inject(WorldviewLibraryApiService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly vbW = VB_W;
  readonly vbH = VB_H;

  // Live waypoints — defaults to the curated set, replaced by D1 data when present.
  private readonly waypoints = signal<Waypoint[]>(WAYPOINTS);

  readonly points = computed<PlacedPoint[]>(() =>
    this.waypoints().map((w) => {
      const x = this.projX(w.lon), y = this.projY(w.lat);
      const r = w.kind === 'center' ? 12 : 8 + w.intensity * 1.6;
      return {
        ...w, x, y, r,
        color: w.kind === 'center' ? '#c9a84c' : this.eraColor(w),
        ...labelPlacement(w.dir, x, y, r),
      };
    }),
  );
  readonly center = computed<PlacedPoint>(() => this.points().find((p) => p.kind === 'center')!);
  readonly arcs = computed<Arc[]>(() => {
    const c = this.center();
    return this.points().filter((p) => p.kind === 'stop').sort((a, b) => a.order - b.order)
      .map((p) => ({ d: this.arcPath(c.x, c.y, p.x, p.y) }));
  });
  readonly rings = computed<number[]>(() => {
    const c = this.center();
    return this.points().filter((p) => p.kind === 'stop').map((p) => Math.hypot(p.x - c.x, p.y - c.y));
  });
  readonly gridLines = computed<GridLine[]>(() => {
    const lines: GridLine[] = [];
    for (let lon = -80; lon <= 40; lon += 20) lines.push({ x1: this.projX(lon), y1: 0, x2: this.projX(lon), y2: VB_H });
    for (let lat = 10; lat <= 50; lat += 10) lines.push({ x1: 0, y1: this.projY(lat), x2: VB_W, y2: this.projY(lat) });
    return lines;
  });
  readonly stops = computed(() => this.points().filter((p) => p.kind === 'stop').sort((a, b) => a.order - b.order));

  ngOnInit(): void {
    this.sourceId.set(this.route.snapshot.paramMap.get('sourceId') ?? '');
    this.unitId.set(this.route.snapshot.paramMap.get('unitId') ?? '');
    if (!this.sourceId()) {
      void this.router.navigate(['/worldview/library']);
      return;
    }
    void this.loadFeatures();
  }

  private async loadFeatures(): Promise<void> {
    const unit = this.unitId();
    if (!unit) return;
    try {
      const features = await firstValueFrom(this.libraryApi.getUnitMapFeatures(unit));
      const mapped = (features ?? []).map((f) => this.toWaypoint(f)).filter((w) => Number.isFinite(w.lon) && Number.isFinite(w.lat));
      if (mapped.length) this.waypoints.set(mapped);
    } catch {
      // Keep the curated fallback on any error.
    }
  }

  private toWaypoint(f: WvMapFeature): Waypoint {
    return {
      id: f.id,
      kind: f.kind === 'center' ? 'center' : 'stop',
      label: f.label,
      sub: f.sub ?? '',
      lon: Number(f.lon),
      lat: Number(f.lat),
      order: f.order_index ?? 0,
      year: f.year ?? null,
      intensity: f.intensity ?? 0,
      dir: ((f.dir as LabelDir) ?? 'up'),
      era: f.era ?? null,
    };
  }

  goToGraph(): void {
    void this.router.navigate(['/worldview/library', this.sourceId(), 'graph', this.unitId()]);
  }

  private projX(lon: number): number { return ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * VB_W; }
  private projY(lat: number): number { return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VB_H; }
  private arcPath(x0: number, y0: number, x1: number, y1: number): string {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, bow = Math.min(110, len * 0.2);
    return `M${x0},${y0} Q${mx + nx * bow},${my + ny * bow} ${x1},${y1}`;
  }
  private eraColor(w: Waypoint): string {
    return (w.era && ERA_COLORS[w.era]) || this.intensityColor(w.intensity);
  }
  private intensityColor(intensity: number): string { return `rgba(196,90,58,${(0.5 + (intensity / 3) * 0.5).toFixed(2)})`; }
}

function labelPlacement(dir: LabelDir, x: number, y: number, r: number): {
  labelAnchor: 'start' | 'middle' | 'end'; labelX: number; mainY: number; subY: number;
} {
  switch (dir) {
    case 'right': return { labelAnchor: 'start',  labelX: x + r + 8, mainY: y - 2, subY: y + 12 };
    case 'left':  return { labelAnchor: 'end',    labelX: x - r - 8, mainY: y - 2, subY: y + 12 };
    case 'down':  return { labelAnchor: 'middle', labelX: x,         mainY: y + r + 18, subY: y + r + 32 };
    case 'up':
    default:      return { labelAnchor: 'middle', labelX: x,         mainY: y - r - 20, subY: y - r - 7 };
  }
}

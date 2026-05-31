import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// Desktop westward-migration map (schematic equirectangular cartography).
// Mirrors the mobile WorldviewMapPage, with directional labels so the tight
// Mediterranean cluster stays readable. Waypoints curated for this work.

type LabelDir = 'up' | 'down' | 'right' | 'left';

interface Waypoint {
  id: string; kind: 'center' | 'stop'; label: string; sub: string;
  lon: number; lat: number; order: number; year: number | null; intensity: number; dir: LabelDir;
}
interface PlacedPoint extends Waypoint {
  x: number; y: number; r: number; color: string;
  labelAnchor: 'start' | 'middle' | 'end'; labelX: number; mainY: number; subY: number;
}
interface Arc { d: string; }
interface GridLine { x1: number; y1: number; x2: number; y2: number; }

const WAYPOINTS: Waypoint[] = [
  { id: 'center',   kind: 'center', label: 'Christian center', sub: 'Rome · Jerusalem',    lon: 16,  lat: 41.9, order: 0, year: null, intensity: 0, dir: 'up' },
  { id: 'ottoman',  kind: 'stop',   label: 'Ottoman East',     sub: 'Constantinople 1453', lon: 29,  lat: 41,   order: 1, year: 1453, intensity: 2, dir: 'right' },
  { id: 'americas', kind: 'stop',   label: 'The Americas',     sub: 'New World 1492',      lon: -72, lat: 18,   order: 2, year: 1492, intensity: 3, dir: 'up' },
  { id: 'barbary',  kind: 'stop',   label: 'Barbary Coast',    sub: 'Corsair panic 1600s', lon: 4,   lat: 35,   order: 3, year: 1700, intensity: 3, dir: 'down' },
];
const VB_W = 1000, VB_H = 560, LON_MIN = -92, LON_MAX = 52, LAT_MIN = 6, LAT_MAX = 54;

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

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly vbW = VB_W;
  readonly vbH = VB_H;

  readonly points = computed<PlacedPoint[]>(() =>
    WAYPOINTS.map((w) => {
      const x = this.projX(w.lon), y = this.projY(w.lat);
      const r = w.kind === 'center' ? 12 : 8 + w.intensity * 1.6;
      return {
        ...w, x, y, r,
        color: w.kind === 'center' ? '#c9a84c' : this.intensityColor(w.intensity),
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
    if (!this.sourceId()) void this.router.navigate(['/worldview/library']);
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

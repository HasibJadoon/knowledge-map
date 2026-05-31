import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';

// ─────────────────────────────────────────────────────────────────────────────
//  WorldviewMapPage — westward-migration map (schematic cartography)
//  Arjana's implicit geography: the Muslim-monster trope radiates from a medieval
//  Christian center (Rome / Jerusalem) outward — to the Ottoman East (1453), the
//  Americas (1492), and the Barbary Coast — with monstrosity rising by distance
//  from the center. Rendered as an equirectangular SVG (no tile library); the
//  waypoints are curated for this book and can later bind to wv_locations.
// ─────────────────────────────────────────────────────────────────────────────

interface Waypoint {
  id: string;
  kind: 'center' | 'stop';
  label: string;
  sub: string;
  lon: number;
  lat: number;
  order: number;
  year: number | null;
  intensity: number; // 0..3 — distance-from-center monstrosity
}

interface PlacedPoint extends Waypoint { x: number; y: number; r: number; color: string; }
interface Arc { d: string; midX: number; midY: number; year: number | null; }
interface GridLine { x1: number; y1: number; x2: number; y2: number; }

const WAYPOINTS: Waypoint[] = [
  { id: 'center',   kind: 'center', label: 'Christian center', sub: 'Rome · Jerusalem',        lon: 18,  lat: 41.9, order: 0, year: null, intensity: 0 },
  { id: 'ottoman',  kind: 'stop',   label: 'Ottoman East',     sub: 'Constantinople, 1453',    lon: 29,  lat: 41,   order: 1, year: 1453, intensity: 2 },
  { id: 'americas', kind: 'stop',   label: 'The Americas',     sub: 'New World, 1492',         lon: -70, lat: 18,   order: 2, year: 1492, intensity: 3 },
  { id: 'barbary',  kind: 'stop',   label: 'Barbary Coast',    sub: 'Corsair panic, 1600s',    lon: 3,   lat: 36.8, order: 3, year: 1700, intensity: 3 },
];

const VB_W = 1000;
const VB_H = 560;
const LON_MIN = -85, LON_MAX = 42, LAT_MIN = 8, LAT_MAX = 54;

@Component({
  selector: 'app-worldview-map',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './worldview-map.page.html',
  styleUrl: './worldview-map.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewMapPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sourceId = signal('');
  readonly unitId = signal('');

  readonly vbW = VB_W;
  readonly vbH = VB_H;

  readonly graphHref = computed(() =>
    this.sourceId() && this.unitId()
      ? `/worldview/library/${this.sourceId()}/graph/${this.unitId()}`
      : '/worldview/library',
  );

  readonly points = computed<PlacedPoint[]>(() =>
    WAYPOINTS.map((w) => ({
      ...w,
      x: this.projX(w.lon),
      y: this.projY(w.lat),
      r: w.kind === 'center' ? 13 : 9 + w.intensity * 2,
      color: w.kind === 'center' ? '#c9a84c' : this.intensityColor(w.intensity),
    })),
  );

  readonly center = computed<PlacedPoint>(() => this.points().find((p) => p.kind === 'center')!);

  readonly arcs = computed<Arc[]>(() => {
    const c = this.center();
    return this.points()
      .filter((p) => p.kind === 'stop')
      .sort((a, b) => a.order - b.order)
      .map((p) => this.arcPath(c.x, c.y, p.x, p.y));
  });

  /** Concentric "distance from the Christian center" rings. */
  readonly rings = computed<number[]>(() => {
    const c = this.center();
    return this.points()
      .filter((p) => p.kind === 'stop')
      .map((p) => Math.hypot(p.x - c.x, p.y - c.y));
  });

  readonly gridLines = computed<GridLine[]>(() => {
    const lines: GridLine[] = [];
    for (let lon = -80; lon <= 40; lon += 20) {
      lines.push({ x1: this.projX(lon), y1: 0, x2: this.projX(lon), y2: VB_H });
    }
    for (let lat = 10; lat <= 50; lat += 10) {
      lines.push({ x1: 0, y1: this.projY(lat), x2: VB_W, y2: this.projY(lat) });
    }
    return lines;
  });

  ngOnInit(): void {
    this.sourceId.set(this.route.snapshot.paramMap.get('sourceId') ?? '');
    this.unitId.set(this.route.snapshot.paramMap.get('unitId') ?? '');
    if (!this.sourceId()) {
      void this.router.navigate(['/worldview/library']);
    }
  }

  private projX(lon: number): number {
    return ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * VB_W;
  }
  private projY(lat: number): number {
    return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VB_H;
  }

  private arcPath(x0: number, y0: number, x1: number, y1: number): Arc {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    // Bow the arc perpendicular to the chord for a flight-path feel.
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const bow = Math.min(120, len * 0.22);
    const cx = mx + nx * bow;
    const cy = my + ny * bow;
    return { d: `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`, midX: cx, midY: cy - 6, year: null };
  }

  private intensityColor(intensity: number): string {
    const alpha = 0.5 + (intensity / 3) * 0.5;
    return `rgba(196,90,58,${alpha.toFixed(2)})`;
  }

  // Pair arcs with their destination year for labels.
  readonly labelledArcs = computed<Arc[]>(() => {
    const c = this.center();
    const stops = this.points().filter((p) => p.kind === 'stop').sort((a, b) => a.order - b.order);
    return stops.map((p) => ({ ...this.arcPath(c.x, c.y, p.x, p.y), year: p.year }));
  });

  readonly stops = computed(() => this.points().filter((p) => p.kind === 'stop').sort((a, b) => a.order - b.order));
}

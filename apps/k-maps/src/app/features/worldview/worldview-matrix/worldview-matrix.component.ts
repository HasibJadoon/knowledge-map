import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { WorldviewLibraryApiService } from '../../../shared/services/worldview/worldview-library-api.service';

// Desktop Era × Trope heatmap. Mirrors the mobile WorldviewMatrixPage.

interface MxEra { slug: string; short: string; title: string; order: number; }
interface MxCell { value: number; eraSlug: string; }
interface MxRow { id: string; title: string; cells: MxCell[]; total: number; }

// Compact column labels — the full era title is shown on hover via [title].
const ERA_SHORT: Record<string, string> = {
  medieval: 'Medieval', renaissance: 'Renaiss.', americas: 'Americas',
  orientalist: 'Orient.', sept11: '9/11 +',
};

@Component({
  selector: 'km-worldview-matrix',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './worldview-matrix.component.html',
  styleUrl: './worldview-matrix.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewMatrixComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly libraryApi = inject(WorldviewLibraryApiService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly loading = signal(true);
  readonly eras = signal<MxEra[]>([]);
  readonly rows = signal<MxRow[]>([]);

  readonly gridCols = computed(() => `minmax(140px, 1.6fr) repeat(${this.eras().length}, minmax(64px, 1fr))`);
  readonly hasData = computed(() => this.eras().length > 0 && this.rows().length > 0);
  readonly levels = [0, 1, 2, 3];

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
      this.build(wv);
    } catch {
      this.eras.set([]); this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private build(rawNodes: unknown[]): void {
    const eras: MxEra[] = [];
    const tropes: { id: string; title: string; intensity: Record<string, number> }[] = [];
    for (const raw of rawNodes) {
      const node = (raw ?? {}) as Record<string, unknown>;
      const type = String(node['node_type'] ?? '');
      const data = parseObj(node['data_json']);
      if (type === 'era') {
        const slug = String(data?.['era'] ?? '');
        if (!slug) continue;
        // Column label comes from the era node (data_json.short); ERA_SHORT is a fallback.
        eras.push({ slug, short: String(data?.['short'] ?? ERA_SHORT[slug] ?? String(node['title'] ?? slug).split(/[\s/(]/)[0]), title: String(node['title'] ?? slug), order: num(data?.['order_index']) ?? 999 });
      } else if (type === 'trope') {
        const intensityRaw = parseObj(data?.['era_intensity']);
        const intensity: Record<string, number> = {};
        if (intensityRaw) for (const [k, v] of Object.entries(intensityRaw)) { const n = num(v); if (n != null) intensity[k] = n; }
        tropes.push({ id: String(node['id'] ?? ''), title: String(node['title'] ?? ''), intensity });
      }
    }
    eras.sort((a, b) => a.order - b.order);
    const rows: MxRow[] = tropes.map((t) => {
      const cells = eras.map((era) => ({ eraSlug: era.slug, value: t.intensity[era.slug] ?? 0 }));
      return { id: t.id, title: t.title, cells, total: cells.reduce((s, c) => s + c.value, 0) };
    });
    rows.sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));
    this.eras.set(eras);
    this.rows.set(rows);
  }

  cellBg(value: number): string {
    if (value <= 0) return 'rgba(255,255,255,0.018)';
    return `rgba(196,90,58,${(0.14 + (value / 3) * 0.72).toFixed(3)})`;
  }
  cellLabel(value: number): string { return value > 0 ? String(value) : '·'; }
  levelBg(level: number): string { return this.cellBg(level); }
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

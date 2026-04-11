import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { WvGraphShellComponent } from '../wv-graph/wv-graph-shell/wv-graph-shell.component';

interface WvSource {
  id: string;
  source_type?: string | null;
  title: string;
  subtitle?: string | null;
  creator?: string | null;
  publication_year?: number | null;
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
  children?: WvUnit[];
}

interface WvGraphApiNode {
  id: string;
  node_type: string;
  title: string;
  text_plain: string;
  summary?: string | null;
  display_label_short?: string | null;
  display_label_medium?: string | null;
  slug?: string | null;
  data_json?: unknown;
  meta_json?: unknown;
  created_at?: string | null;
}

interface WvGraphApiEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: string;
  strength?: number | null;
  display_label_short?: string | null;
  display_label_medium?: string | null;
}

interface WvGraphApiEvidenceLink {
  id: string;
  source_type: string;
  source_id: string;
  target_node_id: string;
  relation: string;
  evidence_text?: string | null;
  display_label_short?: string | null;
  display_label_medium?: string | null;
}

interface TocItem {
  unit: WvUnit;
  depth: number;
  numbering: string;
}

@Component({
  selector: 'km-worldview-unit-graph',
  standalone: true,
  imports: [CommonModule, WvGraphShellComponent],
  templateUrl: './worldview-unit-graph.component.html',
  styleUrl: './worldview-unit-graph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewUnitGraphComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiBase = environment.apiBase;

  private routeSub?: Subscription;
  private loadVersion = 0;

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly source = signal<WvSource | null>(null);
  readonly allUnits = signal<WvUnit[]>([]);
  readonly worldviewNodes = signal<WvGraphApiNode[]>([]);
  readonly worldviewEdges = signal<WvGraphApiEdge[]>([]);
  readonly worldviewEvidenceLinks = signal<WvGraphApiEvidenceLink[]>([]);
  readonly sourceLoading = signal(true);
  readonly graphLoading = signal(true);

  readonly unitsById = computed(() => new Map(this.allUnits().map((unit) => [unit.id, unit] as const)));
  readonly rootUnits = computed(() => this.buildUnitTree(this.allUnits()));
  readonly tocItems = computed(() => this.flattenUnits(this.rootUnits()));
  readonly selectedUnit = computed(() => this.unitsById().get(this.unitId()) ?? null);
  readonly loading = computed(() => this.sourceLoading() || this.graphLoading());
  readonly hasGraph = computed(() => this.worldviewNodes().length > 0);

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const sourceId = params.get('sourceId') ?? '';
      const unitId = params.get('unitId') ?? '';

      if (!sourceId || !unitId) {
        void this.router.navigate(['/worldview/library']);
        return;
      }

      void this.load(sourceId, unitId);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  async load(sourceId: string, unitId: string): Promise<void> {
    const previousSourceId = this.sourceId();
    const shouldLoadSource = previousSourceId !== sourceId || !this.source() || this.allUnits().length === 0;
    const loadVersion = ++this.loadVersion;

    this.sourceId.set(sourceId);
    this.unitId.set(unitId);
    this.graphLoading.set(true);
    this.worldviewNodes.set([]);
    this.worldviewEdges.set([]);
    this.worldviewEvidenceLinks.set([]);

    if (shouldLoadSource) {
      this.sourceLoading.set(true);
      this.source.set(null);
      this.allUnits.set([]);
    }

    try {
      const sourceRequest = shouldLoadSource
        ? fetch(`${this.apiBase}/worldview/sources/${sourceId}`)
        : Promise.resolve<Response | null>(null);
      const annotationsRequest = fetch(`${this.apiBase}/worldview/units/${unitId}/annotations`);

      const [sourceRes, annotationsRes] = await Promise.all([sourceRequest, annotationsRequest]);
      if (loadVersion !== this.loadVersion) return;

      if (sourceRes) {
        if (sourceRes.ok) {
          const sourceData = (await sourceRes.json()) as {
            ok?: boolean;
            source?: WvSource | null;
            units?: unknown[];
          };

          if (sourceData?.ok) {
            this.source.set(sourceData.source ?? null);
            this.allUnits.set((sourceData.units ?? []).map((unit) => this.normalizeUnit(unit)));
          }
        }

        this.sourceLoading.set(false);
      }

      if (annotationsRes.ok) {
        const annotationsData = (await annotationsRes.json()) as {
          ok?: boolean;
          wv?: unknown;
          wv_node_edges?: unknown;
          wv_evidence_links?: unknown;
        };

        if (annotationsData?.ok) {
          this.worldviewNodes.set(this.normalizeWvNodesPayload(annotationsData.wv));
          this.worldviewEdges.set(this.normalizeWvEdgesPayload(annotationsData.wv_node_edges));
          this.worldviewEvidenceLinks.set(
            this.normalizeWvEvidenceLinksPayload(annotationsData.wv_evidence_links),
          );
        }
      }
    } catch {
      if (loadVersion !== this.loadVersion) return;
      if (shouldLoadSource) {
        this.sourceLoading.set(false);
      }
      this.worldviewNodes.set([]);
      this.worldviewEdges.set([]);
      this.worldviewEvidenceLinks.set([]);
    } finally {
      if (loadVersion === this.loadVersion) {
        if (!shouldLoadSource) {
          this.sourceLoading.set(false);
        }
        this.graphLoading.set(false);
        this.cdr.markForCheck();
      }
    }
  }

  goBack(): void {
    const sourceId = this.sourceId();
    if (!sourceId) {
      void this.router.navigate(['/worldview/library']);
      return;
    }

    void this.router.navigate(['/worldview/library', sourceId], {
      queryParams: this.unitId() ? { unit: this.unitId() } : undefined,
    });
  }

  onUnitChange(event: Event): void {
    const unitId = (event.target as HTMLSelectElement | null)?.value ?? '';
    if (!unitId || unitId === this.unitId()) return;
    void this.router.navigate(['/worldview/library', this.sourceId(), 'graph', unitId]);
  }

  optionLabel(item: TocItem): string {
    const title = this.unitLabel(item.unit);
    return `${item.numbering} · ${title}`;
  }

  unitLabel(unit: WvUnit | null | undefined): string {
    return unit?.title?.trim() || unit?.anchor_text?.trim() || 'Untitled unit';
  }

  unitRef(unit: WvUnit | null | undefined): string {
    if (!unit) return '';
    if (unit.start_ref && unit.end_ref && unit.start_ref !== unit.end_ref) {
      return `${unit.start_ref} – ${unit.end_ref}`;
    }
    return unit.start_ref || unit.end_ref || '';
  }

  unitTypeLabel(type?: string | null): string {
    const key = (type ?? '').trim().toLowerCase();
    const map: Record<string, string> = {
      chapter: 'Chapter',
      section: 'Section',
      part: 'Part',
      passage: 'Passage',
      unit: 'Unit',
      excerpt: 'Excerpt',
      page: 'Page',
      paragraph: 'Paragraph',
    };
    return map[key] ?? 'Unit';
  }

  sourceTypeLabel(type?: string | null): string {
    const key = (type ?? '').trim().toLowerCase();
    const map: Record<string, string> = {
      book: 'Book',
      article: 'Article',
      essay: 'Essay',
      paper: 'Paper',
      lecture: 'Lecture',
      podcast: 'Podcast',
      video: 'Video',
      website: 'Website',
      document: 'Document',
      scripture: 'Scripture',
      report: 'Report',
    };
    return map[key] ?? 'Source';
  }

  sourceTypeColor(type?: string | null): string {
    const key = (type ?? '').trim().toLowerCase();
    const map: Record<string, string> = {
      book: 'gold',
      article: 'blue',
      essay: 'ember',
      paper: 'purple',
      lecture: 'sage',
      podcast: 'sage',
      video: 'blue',
      website: 'amber',
      document: 'gold',
      scripture: 'gold',
      report: 'purple',
    };
    return map[key] ?? '';
  }

  private normalizeUnit(value: unknown): WvUnit {
    const unit = (value ?? {}) as Record<string, unknown>;
    return {
      id: String(unit['id'] ?? ''),
      source_id: String(unit['source_id'] ?? ''),
      parent_unit_id: typeof unit['parent_unit_id'] === 'string' ? unit['parent_unit_id'] : null,
      unit_type: typeof unit['unit_type'] === 'string' ? unit['unit_type'] : null,
      title: typeof unit['title'] === 'string' ? unit['title'] : null,
      order_index: typeof unit['order_index'] === 'number' ? unit['order_index'] : null,
      start_ref: typeof unit['start_ref'] === 'string' ? unit['start_ref'] : null,
      end_ref: typeof unit['end_ref'] === 'string' ? unit['end_ref'] : null,
      anchor_text: typeof unit['anchor_text'] === 'string' ? unit['anchor_text'] : null,
      summary: typeof unit['summary'] === 'string' ? unit['summary'] : null,
      children: [],
    };
  }

  private buildUnitTree(units: WvUnit[]): WvUnit[] {
    const childrenByParent = new Map<string, WvUnit[]>();

    for (const unit of units) {
      if (!unit.parent_unit_id) continue;
      const bucket = childrenByParent.get(unit.parent_unit_id) ?? [];
      bucket.push(unit);
      childrenByParent.set(unit.parent_unit_id, bucket);
    }

    const buildBranch = (parentId: string | null): WvUnit[] => {
      const branch = parentId
        ? (childrenByParent.get(parentId) ?? [])
        : units.filter((unit) => !unit.parent_unit_id);

      return this.sortUnits(branch).map((unit) => ({
        ...unit,
        children: buildBranch(unit.id),
      }));
    };

    return buildBranch(null);
  }

  private flattenUnits(units: WvUnit[]): TocItem[] {
    const items: TocItem[] = [];
    const walk = (branch: WvUnit[], depth: number, prefix: number[]) => {
      branch.forEach((unit, index) => {
        const numbering = [...prefix, index + 1];
        items.push({
          unit,
          depth,
          numbering: numbering.join('.'),
        });
        walk(unit.children ?? [], depth + 1, numbering);
      });
    };

    walk(units, 0, []);
    return items;
  }

  private sortUnits(units: WvUnit[]): WvUnit[] {
    return [...units].sort((left, right) => {
      const leftOrder = left.order_index ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.order_index ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.id.localeCompare(right.id);
    });
  }

  private normalizeWvNodesPayload(value: unknown): WvGraphApiNode[] {
    if (!Array.isArray(value)) return [];

    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .map((node) => ({
        id: String(node['id'] ?? ''),
        node_type: String(node['node_type'] ?? 'insight'),
        title: String(node['title'] ?? ''),
        text_plain: String(node['text_plain'] ?? ''),
        summary: (node['summary'] as string | null) ?? null,
        display_label_short: (node['display_label_short'] as string | null) ?? null,
        display_label_medium: (node['display_label_medium'] as string | null) ?? null,
        slug: (node['slug'] as string | null) ?? null,
        data_json: node['data_json'] ?? null,
        meta_json: node['meta_json'] ?? null,
        created_at: (node['created_at'] as string | null) ?? null,
      }))
      .filter((node) => !!node.id && !!node.title);
  }

  private normalizeWvEdgesPayload(value: unknown): WvGraphApiEdge[] {
    if (!Array.isArray(value)) return [];

    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .map((edge) => ({
        id: String(edge['id'] ?? ''),
        from_node_id: String(edge['from_node_id'] ?? ''),
        to_node_id: String(edge['to_node_id'] ?? ''),
        relation_type: String(edge['relation_type'] ?? 'related_to'),
        strength: typeof edge['strength'] === 'number' ? edge['strength'] : null,
        display_label_short: (edge['display_label_short'] as string | null) ?? null,
        display_label_medium: (edge['display_label_medium'] as string | null) ?? null,
      }))
      .filter((edge) => !!edge.id && !!edge.from_node_id && !!edge.to_node_id);
  }

  private normalizeWvEvidenceLinksPayload(value: unknown): WvGraphApiEvidenceLink[] {
    if (!Array.isArray(value)) return [];

    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .map((link) => ({
        id: String(link['id'] ?? ''),
        source_type: String(link['source_type'] ?? ''),
        source_id: String(link['source_id'] ?? ''),
        target_node_id: String(link['target_node_id'] ?? ''),
        relation: String(link['relation'] ?? ''),
        evidence_text: (link['evidence_text'] as string | null) ?? null,
        display_label_short: (link['display_label_short'] as string | null) ?? null,
        display_label_medium: (link['display_label_medium'] as string | null) ?? null,
      }))
      .filter((link) => !!link.id);
  }
}

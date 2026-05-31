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
import { IonicModule } from '@ionic/angular';
import { Subscription, firstValueFrom } from 'rxjs';

import { WorldviewLibraryApiService } from '../../../../shared/services/worldview/worldview-library-api.service';
import { WvGraphShellComponent } from '../../wv-graph/wv-graph-shell/wv-graph-shell.component';

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
  selector: 'app-worldview-unit-graph',
  standalone: true,
  imports: [CommonModule, IonicModule, WvGraphShellComponent],
  templateUrl: './worldview-unit-graph.page.html',
  styleUrl: './worldview-unit-graph.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewUnitGraphPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly libraryApi = inject(WorldviewLibraryApiService);

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
  readonly readerHref = computed(() =>
    this.sourceId() && this.unitId()
      ? `/worldview/library/${this.sourceId()}/read/${this.unitId()}`
      : '/worldview/library',
  );

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
      const [sourceDetail, annotations] = await Promise.all([
        shouldLoadSource
          ? firstValueFrom(this.libraryApi.getSource(sourceId)).catch(() => null)
          : Promise.resolve(null),
        firstValueFrom(this.libraryApi.getUnitAnnotations(unitId)).catch(() => null),
      ]);
      if (loadVersion !== this.loadVersion) return;

      if (shouldLoadSource) {
        if (sourceDetail?.id) {
          const { units, ...source } = sourceDetail;
          this.source.set({ ...source, publication_year: source.published_year ?? null });
          this.allUnits.set((units ?? []).map((unit) => this.normalizeUnit(unit)));
        }
        this.sourceLoading.set(false);
      }

      if (annotations) {
        this.worldviewNodes.set(this.normalizeWvNodesPayload(annotations.wv));
        this.worldviewEdges.set(this.normalizeWvEdgesPayload(annotations.wv_node_edges));
        this.worldviewEvidenceLinks.set(
          this.normalizeWvEvidenceLinksPayload(annotations.wv_evidence_links),
        );
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

  openTimeline(): void {
    if (this.sourceId() && this.unitId()) {
      void this.router.navigate(['/worldview/library', this.sourceId(), 'timeline', this.unitId()]);
    }
  }

  openMatrix(): void {
    if (this.sourceId() && this.unitId()) {
      void this.router.navigate(['/worldview/library', this.sourceId(), 'matrix', this.unitId()]);
    }
  }

  onUnitChange(event: CustomEvent<{ value?: string }>): void {
    const unitId = event.detail?.value ?? '';
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

  typeLabel(type?: string | null): string {
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

  typeColor(type?: string | null): string {
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

  // Accepts the current worldview worker columns (parent_id, unit_index,
  // page_start/end, text_excerpt, description_md) as well as legacy names.
  private normalizeUnit(value: unknown): WvUnit {
    const unit = (value ?? {}) as Record<string, unknown>;
    const parentRaw = unit['parent_unit_id'] ?? unit['parent_id'];
    const orderRaw = unit['order_index'] ?? unit['unit_index'];
    const startRaw = unit['start_ref'] ?? (typeof unit['page_start'] === 'number' ? `p. ${unit['page_start']}` : null);
    const endRaw = unit['end_ref'] ?? (typeof unit['page_end'] === 'number' ? `p. ${unit['page_end']}` : null);
    return {
      id: String(unit['id'] ?? ''),
      source_id: String(unit['source_id'] ?? ''),
      parent_unit_id: typeof parentRaw === 'string' ? parentRaw : null,
      unit_type: typeof unit['unit_type'] === 'string' ? unit['unit_type'] : null,
      title: typeof unit['title'] === 'string' ? unit['title'] : null,
      order_index: typeof orderRaw === 'number' ? orderRaw : null,
      start_ref: typeof startRaw === 'string' ? startRaw : null,
      end_ref: typeof endRaw === 'string' ? endRaw : null,
      anchor_text: typeof unit['anchor_text'] === 'string' ? unit['anchor_text']
        : (typeof unit['text_excerpt'] === 'string' ? unit['text_excerpt'] : null),
      summary: typeof unit['summary'] === 'string' ? unit['summary']
        : (typeof unit['description_md'] === 'string' ? unit['description_md'] : null),
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

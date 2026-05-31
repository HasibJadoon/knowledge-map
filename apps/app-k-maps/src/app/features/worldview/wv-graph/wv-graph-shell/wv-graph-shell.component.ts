import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WvGraphCanvasComponent } from '../wv-graph-canvas/wv-graph-canvas.component';
import { WvGraphToolbarComponent } from '../wv-graph-toolbar/wv-graph-toolbar.component';
import { WvGraphSidepanelComponent } from '../wv-graph-sidepanel/wv-graph-sidepanel.component';
import { WvGraphBottomsheetComponent } from '../wv-graph-bottomsheet/wv-graph-bottomsheet.component';
import {
  WvGraphData, WvGraphEdge, WvGraphNode, WvGraphMode, WvNodeType, WvEdgeRelation, MOCK_WV_GRAPH,
  ClusterColor, clusterColor,
} from '../../../../shared/models/worldview/wv-graph.model';

export interface WvClusterInfo {
  slug: string;
  title: string;
  count: number;
  color: ClusterColor;
}

// ── API shape types ────────────────────────────────────────────────────────────
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

// ── Type maps ──────────────────────────────────────────────────────────────────
const NODE_TYPE_MAP: Record<string, WvNodeType> = {
  claim: 'claim', principle: 'principle', framework: 'framework',
  cause: 'cause', evidence: 'evidence', insight: 'insight',
  observation: 'insight', distillation: 'principle', note: 'insight',
  // Worldview genealogy node types (Arjana corpus and similar)
  thesis: 'claim', method: 'framework', concept: 'principle',
  era: 'framework', trope: 'cause', monster_figure: 'evidence', motif: 'insight',
};

const EDGE_RELATION_MAP: Record<string, WvEdgeRelation> = {
  supports: 'supports', part_of: 'part_of', contrasts_with: 'contrasts_with',
  leads_to: 'leads_to', questions: 'questions', related_to: 'related_to',
  contradicts: 'contrasts_with', causes: 'leads_to', illustrates: 'supports',
};

// ─────────────────────────────────────────────────────────────────────────────
//  WvGraphShell — orchestrator
//  · Fetches / receives graph data
//  · Manages selected node, mode, type filters, panel width
//  · Switches between desktop (sidepanel) and mobile (bottomsheet) layouts
// ─────────────────────────────────────────────────────────────────────────────

const PANEL_MIN = 220;
const PANEL_MAX = 480;
const PANEL_DEFAULT = 300;

@Component({
  selector: 'app-wv-graph-shell',
  standalone: true,
  imports: [
    CommonModule,
    WvGraphCanvasComponent,
    WvGraphToolbarComponent,
    WvGraphSidepanelComponent,
    WvGraphBottomsheetComponent,
  ],
  templateUrl: './wv-graph-shell.component.html',
  styleUrl: './wv-graph-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvGraphShellComponent implements OnInit, OnChanges {
  @ViewChild('canvasComp') canvasComp?: WvGraphCanvasComponent;

  /** Pass in real data from parent; falls back to mock */
  @Input() graphData: WvGraphData | null = null;
  /** Force mobile layout regardless of viewport */
  @Input() forceMobile = false;
  /** API nodes — mapped to internal WvGraphNode */
  @Input() nodes: WvGraphApiNode[] = [];
  /** API edges — mapped to internal WvGraphEdge */
  @Input() edges: WvGraphApiEdge[] = [];
  /** API evidence links (stored but not yet rendered in graph) */
  @Input() evidenceLinks: WvGraphApiEvidenceLink[] = [];

  // ── Internal signals for inputs ─────────────────────────────────────────────
  private readonly apiNodes  = signal<WvGraphApiNode[]>([]);
  private readonly apiEdges  = signal<WvGraphApiEdge[]>([]);

  // ── State ───────────────────────────────────────────────────────────────────
  readonly selectedNode   = signal<WvGraphNode | null>(null);
  readonly mode           = signal<WvGraphMode>('force');
  readonly activeTypes    = signal<Set<WvNodeType> | null>(null);
  readonly activeClusters = signal<Set<string> | null>(null);
  readonly showLabels     = signal(true);
  readonly useShortLabels = signal(true);
  readonly isMobile       = signal(false);
  readonly panelWidth     = signal(PANEL_DEFAULT);
  private clusterModeApplied = false;

  // Resolved graph — build from API inputs, fall back to mock or graphData
  readonly graph = computed((): WvGraphData => {
    const apiNodes = this.apiNodes();
    const apiEdges = this.apiEdges();
    const useShortLabels = this.useShortLabels();

    if (!apiNodes.length) return this.graphData ?? MOCK_WV_GRAPH;

    const nodes = apiNodes.map((n): WvGraphNode => {
      const data = parseJsonObject(n.data_json);
      return {
        id: n.id,
        type: (NODE_TYPE_MAP[n.node_type] ?? 'insight') as WvNodeType,
        label: resolveNodeLabel(n, useShortLabels),
        canonicalLabel: n.title,
        displayLabelShort: n.display_label_short ?? null,
        displayLabelMedium: n.display_label_medium ?? null,
        cluster: typeof data?.['cluster'] === 'string' ? (data['cluster'] as string) : null,
        clusterTitle: typeof data?.['cluster_title'] === 'string' ? (data['cluster_title'] as string) : null,
        summary: n.text_plain || n.summary || '',
      };
    });

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = apiEdges
      .filter((e) => nodeIds.has(e.from_node_id) && nodeIds.has(e.to_node_id))
      .map((e): WvGraphEdge => ({
        id: e.id,
        source: e.from_node_id,
        target: e.to_node_id,
        relation: (EDGE_RELATION_MAP[e.relation_type] ?? 'related_to') as WvEdgeRelation,
        strength: e.strength ?? undefined,
      }));

    return { nodes, edges };
  });

  /** Distinct clusters present in the graph, in first-seen order, with colors. */
  readonly clusters = computed((): WvClusterInfo[] => {
    const order: string[] = [];
    const titles = new Map<string, string>();
    const counts = new Map<string, number>();
    for (const node of this.graph().nodes) {
      const slug = node.cluster;
      if (!slug) continue;
      if (!counts.has(slug)) { order.push(slug); titles.set(slug, node.clusterTitle || slug); }
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return order.map((slug, index) => ({
      slug,
      title: titles.get(slug) ?? slug,
      count: counts.get(slug) ?? 0,
      color: clusterColor(slug, index),
    }));
  });

  readonly hasClusters = computed(() => this.clusters().length > 0);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes']) this.apiNodes.set(this.nodes ?? []);
    if (changes['edges']) this.apiEdges.set(this.edges ?? []);

    // First time a clustered graph arrives, default into the cluster view so the
    // community structure is visible without an extra tap.
    if ((changes['nodes'] || changes['edges']) && !this.clusterModeApplied && this.hasClusters()) {
      this.clusterModeApplied = true;
      this.mode.set('cluster');
    }
  }

  clusterActive(slug: string): boolean {
    return !this.activeClusters() || this.activeClusters()!.has(slug);
  }

  toggleCluster(slug: string): void {
    const all = this.clusters().map((c) => c.slug);
    const current = this.activeClusters();
    if (!current) {
      this.activeClusters.set(new Set(all.filter((s) => s !== slug)));
      return;
    }
    const next = new Set(current);
    if (next.has(slug)) {
      next.delete(slug);
      if (next.size === 0) { this.activeClusters.set(null); return; }
    } else {
      next.add(slug);
      if (next.size === all.length) { this.activeClusters.set(null); return; }
    }
    this.activeClusters.set(next);
  }

  // ── Drag resize state ───────────────────────────────────────────────────────
  private dragging = false;
  private dragStartX = 0;
  private dragStartWidth = 0;

  ngOnInit(): void {
    this.checkViewport();
  }

  @HostListener('window:resize')
  checkViewport(): void {
    this.isMobile.set(this.forceMobile || window.innerWidth < 768);
  }

  // ── Node selection ──────────────────────────────────────────────────────────
  onNodeClick(node: WvGraphNode): void {
    const current = this.selectedNode();
    if (current?.id === node.id) {
      this.selectedNode.set(null);
    } else {
      this.selectedNode.set(node);
      if (this.mode() === 'force') this.mode.set('focus');
    }
  }

  onBgClick(): void {
    this.selectedNode.set(null);
    if (this.mode() === 'focus') this.mode.set('force');
  }

  navigateTo(node: WvGraphNode): void {
    this.selectedNode.set(node);
  }

  // ── Mode / filter ───────────────────────────────────────────────────────────
  setMode(m: WvGraphMode): void { this.mode.set(m); }

  toggleType(type: WvNodeType): void {
    const current = this.activeTypes();
    if (!current) {
      // All active → deactivate this one
      const allTypes: WvNodeType[] = ['claim','principle','framework','cause','evidence','insight'];
      this.activeTypes.set(new Set(allTypes.filter(t => t !== type)));
    } else {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
        // If none left, reset to all
        if (next.size === 0) { this.activeTypes.set(null); return; }
      } else {
        next.add(type);
        const allTypes: WvNodeType[] = ['claim','principle','framework','cause','evidence','insight'];
        if (next.size === allTypes.length) { this.activeTypes.set(null); return; }
      }
      this.activeTypes.set(next);
    }
  }

  toggleLabels(): void { this.showLabels.update(v => !v); }

  // ── Zoom ────────────────────────────────────────────────────────────────────
  resetZoom(): void       { this.canvasComp?.resetZoom(); }
  centerSelected(): void  { this.canvasComp?.centerOnSelected(); }

  // ── Drag-resize panel ───────────────────────────────────────────────────────
  onResizeStart(event: MouseEvent): void {
    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartWidth = this.panelWidth();
    event.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragging) return;
    // Resize handle is on left edge of panel → dragging left increases width
    const delta = this.dragStartX - event.clientX;
    const newW = Math.min(PANEL_MAX, Math.max(PANEL_MIN, this.dragStartWidth + delta));
    this.panelWidth.set(newW);
  }

  @HostListener('window:mouseup')
  onMouseUp(): void { this.dragging = false; }
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function resolveNodeLabel(node: WvGraphApiNode, useShortLabels: boolean): string {
  if (!useShortLabels) {
    return node.title;
  }

  return node.display_label_short || node.display_label_medium || node.title;
}

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
} from '../wv-graph.model';

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
  readonly showLabels     = signal(true);
  readonly useShortLabels = signal(true);
  readonly isMobile       = signal(false);
  readonly panelWidth     = signal(PANEL_DEFAULT);

  // Resolved graph — build from API inputs, fall back to mock or graphData
  readonly graph = computed((): WvGraphData => {
    const apiNodes = this.apiNodes();
    const apiEdges = this.apiEdges();
    const useShortLabels = this.useShortLabels();

    if (!apiNodes.length) return this.graphData ?? MOCK_WV_GRAPH;

    const nodes = apiNodes.map((n): WvGraphNode => ({
      id: n.id,
      type: (NODE_TYPE_MAP[n.node_type] ?? 'insight') as WvNodeType,
      label: resolveNodeLabel(n, useShortLabels),
      canonicalLabel: n.title,
      displayLabelShort: n.display_label_short ?? null,
      displayLabelMedium: n.display_label_medium ?? null,
      summary: n.text_plain || n.summary || '',
    }));

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes']) this.apiNodes.set(this.nodes ?? []);
    if (changes['edges']) this.apiEdges.set(this.edges ?? []);
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

function resolveNodeLabel(node: WvGraphApiNode, useShortLabels: boolean): string {
  if (!useShortLabels) {
    return node.title;
  }

  return node.display_label_short || node.display_label_medium || node.title;
}

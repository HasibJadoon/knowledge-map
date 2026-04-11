import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  OnInit,
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
  WvGraphData, WvGraphNode, WvGraphMode, WvNodeType, MOCK_WV_GRAPH,
} from '../wv-graph.model';

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
export class WvGraphShellComponent implements OnInit {
  @ViewChild('canvasComp') canvasComp?: WvGraphCanvasComponent;

  /** Pass in real data from parent; falls back to mock */
  @Input() graphData: WvGraphData | null = null;
  /** Force mobile layout regardless of viewport */
  @Input() forceMobile = false;

  // ── State ───────────────────────────────────────────────────────────────────
  readonly selectedNode   = signal<WvGraphNode | null>(null);
  readonly mode           = signal<WvGraphMode>('force');
  readonly activeTypes    = signal<Set<WvNodeType> | null>(null);
  readonly showLabels     = signal(true);
  readonly isMobile       = signal(false);
  readonly panelWidth     = signal(PANEL_DEFAULT);

  // Resolved graph — real data or mock
  readonly graph = computed(() => this.graphData ?? MOCK_WV_GRAPH);

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

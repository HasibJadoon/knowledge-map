import {
  Component, Input, OnChanges, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, signal, computed, SimpleChanges,
  ChangeDetectionStrategy, inject, NgZone,
} from '@angular/core';
import { hierarchy, tree } from 'd3-hierarchy';
import gsap from 'gsap';
import { resolveNodeUi, lookupUi, DEFAULT_UI, NodeUiDef } from './ss-ui-registry';

// ── Domain types ──────────────────────────────────────────────────────────────

export interface TreebankNode {
  id: string;
  node_type: string;
  label_ar?: string;
  label_en?: string;
  text_ar?: string;
  registry_refs?: Record<string, string | null>;
  features?: Record<string, string | null>;
  morphology?: Record<string, unknown>;
  notes?: string | null;
  children?: TreebankNode[];
}

interface LayoutNode {
  id: string;
  data: TreebankNode;
  x: number;
  y: number;
  depth: number;
  hasChildren: boolean;
}

interface LayoutLink {
  sourceId: string;
  targetId: string;
  sx: number; sy: number;
  tx: number; ty: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_W = 220;
const NODE_H = 76;
const H_SEP  = 44;
const V_SEP  = 80;
const PAD_X  = 60;
const PAD_Y  = 40;

// ── Tree helpers ──────────────────────────────────────────────────────────────

function pruneForCollapsed(node: TreebankNode, collapsed: Set<string>): TreebankNode {
  if (collapsed.has(node.id)) return { ...node, children: [] };
  return { ...node, children: node.children?.map(c => pruneForCollapsed(c, collapsed)) ?? [] };
}

function collectOriginalHasChildren(node: TreebankNode, out: Map<string, boolean>): void {
  out.set(node.id, (node.children?.length ?? 0) > 0);
  node.children?.forEach(c => collectOriginalHasChildren(c, out));
}

function buildLayout(
  treebank: TreebankNode,
  collapsed: Set<string>,
): { nodes: LayoutNode[]; linkPairs: Array<{ sourceId: string; targetId: string }> } {
  const pruned = pruneForCollapsed(treebank, collapsed);
  const hasChildrenMap = new Map<string, boolean>();
  collectOriginalHasChildren(treebank, hasChildrenMap);

  const root = hierarchy<TreebankNode>(pruned, d => d.children?.length ? d.children : undefined);
  const treeLayout = tree<TreebankNode>().nodeSize([NODE_W + H_SEP, NODE_H + V_SEP]);
  treeLayout(root);

  let minX = Infinity;
  root.each(n => { const nx = (n as any).x; if (nx < minX) minX = nx; });
  const offsetX = -minX + PAD_X + NODE_W / 2;

  const nodes: LayoutNode[] = [];
  root.each(n => {
    nodes.push({
      id:          n.data.id,
      data:        n.data,
      x:           (n as any).x + offsetX - NODE_W / 2,
      y:           (n as any).y + PAD_Y,
      depth:       n.depth,
      hasChildren: hasChildrenMap.get(n.data.id) ?? false,
    });
  });

  const linkPairs = root.links().map(lk => ({
    sourceId: lk.source.data.id,
    targetId: lk.target.data.id,
  }));

  return { nodes, linkPairs };
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'km-sentence-structure-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ss-viewport" #viewport
      [class.ss-viewport--panning]="isPanning()"
      [class.ss-viewport--dragging]="!!draggingId()"
      (pointerdown)="onViewportDown($event)"
      (pointerup)="onViewportUp($event)"
      (pointercancel)="onViewportUp($event)"
    >

      @if (!hasTb()) {
        <div class="ss-empty">
          <span class="ss-empty__icon">⊙</span>
          <p>No treebank data for this passage.</p>
        </div>
      }

      @if (hasTb() && displayNodes().length) {

        <!-- Pannable canvas layer -->
        <div class="ss-canvas" #canvasEl>
          <!-- SVG bezier links -->
          <svg class="ss-links-svg" aria-hidden="true">
            @for (link of displayLinks(); track link.targetId) {
              <path
                class="ss-link"
                [attr.d]="cubicPath(link)"
                fill="none"
                stroke="rgba(201,168,76,0.22)"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            }
          </svg>

          <!-- Node cards -->
          @for (n of displayNodes(); track n.id) {
            <div
              class="ss-node"
              [class.ss-node--selected]="selectedId() === n.id"
              [class.ss-node--dragging]="draggingId() === n.id"
              [attr.data-node-id]="n.id"
              [attr.data-depth]="n.depth"
              [style.left.px]="n.x"
              [style.top.px]="n.y"
              [style.border-left-color]="nodeUi(n).bg"
            >
              <div class="ss-node__strip" [style.background]="nodeUi(n).bg"></div>

              <div class="ss-node__body">
                @if (n.data.label_ar) {
                  <span class="ss-node__label-ar" [style.color]="nodeUi(n).bg">
                    {{ n.data.label_ar }}
                  </span>
                }
                @if (n.data.label_en) {
                  <span class="ss-node__label-en">{{ n.data.label_en }}</span>
                }
                @if (n.data.text_ar) {
                  <span class="ss-node__text-ar">{{ n.data.text_ar }}</span>
                }
                <div class="ss-node__chips">
                  @if (chipUi(n, 'case'); as u) {
                    <span class="ss-node__chip"
                      [style.background]="u.bg + '26'"
                      [style.color]="u.bg"
                      [style.border-color]="u.bg + '40'">{{ u.label_ar }}</span>
                  }
                  @if (chipUi(n, 'verb_tense'); as u) {
                    <span class="ss-node__chip"
                      [style.background]="u.bg + '26'"
                      [style.color]="u.bg"
                      [style.border-color]="u.bg + '40'">{{ u.label_ar }}</span>
                  }
                  @if (chipUi(n, 'number'); as u) {
                    <span class="ss-node__chip"
                      [style.background]="u.bg + '26'"
                      [style.color]="u.bg"
                      [style.border-color]="u.bg + '40'">{{ u.label_ar }}</span>
                  }
                </div>
              </div>

              <!-- Collapse / expand toggle -->
              @if (n.hasChildren) {
                <button
                  class="ss-node__collapse"
                  (pointerdown)="$event.stopPropagation()"
                  (click)="toggleCollapse($event, n.id)"
                  [title]="collapsedIds().has(n.id) ? 'Expand' : 'Collapse'"
                >{{ collapsedIds().has(n.id) ? '+' : '−' }}</button>
              }
            </div>
          }
        </div>

        <!-- Detail drawer (fixed — outside pan layer) -->
        @if (selected()) {
          <div class="ss-drawer" (pointerdown)="$event.stopPropagation()" #drawerEl>
            <div class="ss-drawer__header"
              [style.border-left-color]="nodeUi(selectedLayoutNode()!).bg">
              <div class="ss-drawer__header-text">
                @if (selected()!.label_ar) {
                  <span class="ss-drawer__label-ar"
                    [style.color]="nodeUi(selectedLayoutNode()!).bg">
                    {{ selected()!.label_ar }}
                  </span>
                }
                @if (selected()!.label_en) {
                  <span class="ss-drawer__label-en">{{ selected()!.label_en }}</span>
                }
              </div>
              <button class="ss-drawer__close" (click)="deselectAll()">✕</button>
            </div>

            @if (selected()!.text_ar) {
              <p class="ss-drawer__text-ar">{{ selected()!.text_ar }}</p>
            }
            @if (selected()!.notes) {
              <p class="ss-drawer__notes">{{ selected()!.notes }}</p>
            }

            @if (morphRows(selected()!).length) {
              <div class="ss-drawer__section">
                <span class="ss-drawer__section-title">Morphology</span>
                @for (row of morphRows(selected()!); track row.key) {
                  <div class="ss-drawer__row">
                    <span class="ss-drawer__key">{{ row.key }}</span>
                    <span class="ss-drawer__val"
                      [class.ss-drawer__val--ar]="row.ar">{{ row.val }}</span>
                  </div>
                }
              </div>
            }

            @if (featureRows(selected()!).length) {
              <div class="ss-drawer__section">
                <span class="ss-drawer__section-title">Features</span>
                @for (row of featureRows(selected()!); track row.key) {
                  <div class="ss-drawer__row">
                    <span class="ss-drawer__key">{{ row.key }}</span>
                    <span class="ss-drawer__chip"
                      [style.background]="lookupVal(row.rawVal).bg + '26'"
                      [style.color]="lookupVal(row.rawVal).bg"
                      [style.border-color]="lookupVal(row.rawVal).bg + '40'">
                      {{ lookupVal(row.rawVal).label_ar || row.val }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        }

        <p class="ss-hint">Drag canvas to pan &nbsp;•&nbsp; Drag node to move &nbsp;•&nbsp; Click to inspect</p>
      }
    </div>
  `,
  styles: [`
    /* ── Viewport ──────────────────────────────────────────────────────────── */
    .ss-viewport {
      position: relative;
      width: 100%;
      height: 620px;
      min-height: 400px;
      overflow: hidden;
      cursor: grab;
      border-radius: 16px;
      background: rgba(6, 9, 18, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.06);
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .ss-viewport--panning { cursor: grabbing; }
    .ss-viewport--dragging { cursor: none; }

    /* ── Canvas (pan transform applied here) ──────────────────────────────── */
    .ss-canvas {
      position: absolute;
      top: 0; left: 0;
      will-change: transform;
    }

    /* ── SVG links ────────────────────────────────────────────────────────── */
    .ss-links-svg {
      position: absolute;
      top: 0; left: 0;
      width: 1px; height: 1px;
      pointer-events: none;
      overflow: visible;
    }

    .ss-link { transition: stroke 0.15s; }

    /* ── Node cards ───────────────────────────────────────────────────────── */
    .ss-node {
      position: absolute;
      width: 220px;
      min-height: 76px;
      background: #0e1018;
      border: 1px solid #1e2030;
      border-left: 3px solid transparent;
      border-radius: 10px;
      display: flex;
      overflow: hidden;
      cursor: grab;
      transition: border-color 0.15s, box-shadow 0.15s;
      will-change: transform, opacity;

      &:hover {
        border-color: rgba(201, 168, 76, 0.35);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.55);
      }

      &--selected {
        box-shadow: 0 0 0 2px rgba(201, 168, 76, 0.55), 0 6px 28px rgba(0, 0, 0, 0.65);
        border-color: rgba(201, 168, 76, 0.5) !important;
      }

      &--dragging {
        cursor: grabbing;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
        z-index: 10;
      }
    }

    /* Left accent strip */
    .ss-node__strip {
      width: 3px;
      flex-shrink: 0;
      border-radius: 10px 0 0 10px;
    }

    .ss-node__body {
      flex: 1;
      padding: 8px 10px 8px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .ss-node__label-ar {
      font-family: var(--km-font-arabic, serif);
      font-size: 0.83rem;
      font-weight: 600;
      direction: rtl;
      text-align: right;
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ss-node__label-en {
      font-size: 0.65rem;
      color: #5a6070;
      font-style: italic;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ss-node__text-ar {
      font-family: var(--km-font-arabic, serif);
      font-size: 1.0rem;
      direction: rtl;
      text-align: right;
      color: #dde4f0;
      line-height: 1.55;
      margin-top: 2px;
      white-space: normal;
      word-break: break-word;
    }

    .ss-node__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      margin-top: 3px;
    }

    .ss-node__chip {
      font-size: 0.55rem;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid transparent;
      font-family: var(--km-font-arabic, serif);
      direction: rtl;
      white-space: nowrap;
    }

    /* Collapse / expand button */
    .ss-node__collapse {
      position: absolute;
      bottom: 5px;
      right: 6px;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #6b7280;
      font-size: 0.7rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      transition: background 0.15s, color 0.15s;

      &:hover {
        background: rgba(201, 168, 76, 0.15);
        color: #c9a84c;
        border-color: rgba(201, 168, 76, 0.3);
      }
    }

    /* ── Detail drawer ───────────────────────────────────────────────────── */
    .ss-drawer {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 240px;
      background: #0e1018;
      border: 1px solid #1e2030;
      border-radius: 12px;
      overflow: hidden;
      will-change: opacity, transform;
      z-index: 20;
    }

    .ss-drawer__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 12px 14px;
      border-left: 3px solid var(--km-gold, #c9a84c);
      border-bottom: 1px solid #1a1c26;
    }

    .ss-drawer__header-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .ss-drawer__label-ar {
      font-family: var(--km-font-arabic, serif);
      font-size: 1.0rem;
      direction: rtl;
      font-weight: 600;
    }

    .ss-drawer__label-en {
      font-size: 0.72rem;
      color: #5a6070;
      font-style: italic;
    }

    .ss-drawer__close {
      background: none;
      border: none;
      color: #3d4455;
      font-size: 0.78rem;
      cursor: pointer;
      padding: 0 0 0 12px;
      flex-shrink: 0;
      line-height: 1;
      &:hover { color: #9ca3af; }
    }

    .ss-drawer__text-ar {
      font-family: var(--km-font-arabic, serif);
      font-size: 1.1rem;
      direction: rtl;
      text-align: right;
      color: #dde4f0;
      padding: 10px 14px 6px;
      margin: 0;
      border-bottom: 1px solid #1a1c26;
      line-height: 1.7;
    }

    .ss-drawer__notes {
      font-size: 0.82rem;
      color: #5a6070;
      font-style: italic;
      padding: 8px 14px;
      margin: 0;
    }

    .ss-drawer__section {
      padding: 8px 14px 10px;
      border-top: 1px solid #1a1c26;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ss-drawer__section-title {
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--km-gold, #c9a84c);
      opacity: 0.6;
      font-family: var(--km-font-heading, 'Cinzel'), serif;
    }

    .ss-drawer__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .ss-drawer__key {
      font-size: 0.7rem;
      color: #3d4455;
      text-transform: capitalize;
      white-space: nowrap;
    }

    .ss-drawer__val {
      font-size: 0.78rem;
      color: #8890a4;
      text-align: right;
      &--ar {
        font-family: var(--km-font-arabic, serif);
        direction: rtl;
        font-size: 0.9rem;
        color: #dde4f0;
      }
    }

    .ss-drawer__chip {
      font-size: 0.68rem;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid transparent;
      font-family: var(--km-font-arabic, serif);
      direction: rtl;
    }

    /* ── Hint ─────────────────────────────────────────────────────────────── */
    .ss-hint {
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.62rem;
      color: rgba(255, 255, 255, 0.2);
      pointer-events: none;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    /* ── Empty state ─────────────────────────────────────────────────────── */
    .ss-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 0.75rem;
      color: #2a3040;
      text-align: center;

      &__icon { font-size: 2.5rem; opacity: 0.2; }
      p { font-size: 0.875rem; font-style: italic; }
    }
  `],
})
export class SentenceStructureCanvasComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() treebank: TreebankNode | null = null;

  @ViewChild('canvasEl')  private canvasEl!:  ElementRef<HTMLElement>;
  @ViewChild('viewport')  private viewport!:  ElementRef<HTMLElement>;
  @ViewChild('drawerEl')  private drawerEl?:  ElementRef<HTMLElement>;

  private zone  = inject(NgZone);
  private animTl: gsap.core.Timeline | null = null;
  private canvasElRef: HTMLElement | null = null;  // direct DOM ref for pan

  // ── Internal treebank signal ──────────────────────────────────────────────
  private readonly _tb = signal<TreebankNode | null>(null);
  readonly hasTb = computed(() => !!this._tb());

  // ── Pan state ─────────────────────────────────────────────────────────────
  readonly panX      = signal(PAD_X);
  readonly panY      = signal(PAD_Y);
  readonly isPanning = signal(false);

  // ── Drag / selection ──────────────────────────────────────────────────────
  readonly draggingId = signal<string | null>(null);
  readonly selectedId = signal<string | null>(null);

  // ── Collapse state ────────────────────────────────────────────────────────
  readonly collapsedIds = signal<Set<string>>(new Set());

  // ── User-dragged positions ────────────────────────────────────────────────
  private readonly _userPos = signal<Map<string, { x: number; y: number }>>(new Map());

  // ── Pointer tracking ──────────────────────────────────────────────────────
  private ptr: {
    type: 'pan' | 'node';
    pointerId: number;
    nodeId?: string;
    nodeEl?: HTMLElement;       // reference for direct DOM transform during drag
    startClientX: number;
    startClientY: number;
    origPanX: number;
    origPanY: number;
    origNx?: number;
    origNy?: number;
    moved: boolean;
  } | null = null;

  // ── Layout computeds ──────────────────────────────────────────────────────

  private readonly _base = computed(() => {
    const tb = this._tb();
    const collapsed = this.collapsedIds();
    if (!tb) return { nodes: [] as LayoutNode[], linkPairs: [] as Array<{ sourceId: string; targetId: string }> };
    return buildLayout(tb, collapsed);
  });

  readonly displayNodes = computed<LayoutNode[]>(() => {
    const { nodes } = this._base();
    const overrides  = this._userPos();
    if (!overrides.size) return nodes;
    return nodes.map(n => {
      const p = overrides.get(n.id);
      return p ? { ...n, x: p.x, y: p.y } : n;
    });
  });

  readonly displayLinks = computed<LayoutLink[]>(() => {
    const { linkPairs } = this._base();
    const nodeMap = new Map(this.displayNodes().map(n => [n.id, n]));
    return linkPairs.flatMap(({ sourceId, targetId }) => {
      const s = nodeMap.get(sourceId);
      const t = nodeMap.get(targetId);
      if (!s || !t) return [];
      return [{ sourceId, targetId,
        sx: s.x + NODE_W / 2,
        sy: s.y + NODE_H,
        tx: t.x + NODE_W / 2,
        ty: t.y,
      }];
    });
  });

  readonly selected = computed<TreebankNode | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.displayNodes().find(n => n.id === id)?.data ?? null;
  });

  readonly selectedLayoutNode = computed<LayoutNode | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.displayNodes().find(n => n.id === id) ?? null;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if ('treebank' in changes) {
      this._tb.set(this.treebank);
      this.collapsedIds.set(new Set());
      this._userPos.set(new Map());
      this.panX.set(PAD_X);
      this.panY.set(PAD_Y);
      this.selectedId.set(null);
      this.resetCanvasTransform();
      setTimeout(() => this.runAnimation(), 90);
    }
  }

  private resetCanvasTransform(): void {
    const el = this.canvasElRef ?? this.canvasEl?.nativeElement;
    if (el) el.style.transform = `translate(${PAD_X}px,${PAD_Y}px)`;
  }

  ngAfterViewInit(): void {
    if (this.treebank) setTimeout(() => this.runAnimation(), 90);

    this.canvasElRef = this.canvasEl?.nativeElement ?? null;
    this.resetCanvasTransform();

    // Run pointermove outside Angular zone to avoid CD on every frame
    this.zone.runOutsideAngular(() => {
      const vp = this.viewport?.nativeElement as HTMLElement | undefined;
      if (!vp) return;
      vp.addEventListener('pointermove', (e: PointerEvent) => {
        if (!this.ptr || e.pointerId !== this.ptr.pointerId) return;
        const dx = e.clientX - this.ptr.startClientX;
        const dy = e.clientY - this.ptr.startClientY;

        if (!this.ptr.moved && Math.hypot(dx, dy) > 4) {
          this.ptr.moved = true;
          if (this.ptr.type === 'node' && this.ptr.nodeId) {
            // Single signal update when drag begins
            this.zone.run(() => this.draggingId.set(this.ptr!.nodeId!));
          }
        }

        if (!this.ptr.moved) return;

        if (this.ptr.type === 'pan' && this.canvasElRef) {
          // Direct DOM for pan too — commit to signal only on pointerup
          const x = this.ptr.origPanX + dx;
          const y = this.ptr.origPanY + dy;
          this.canvasElRef.style.transform = `translate(${x}px,${y}px)`;
        } else if (this.ptr.type === 'node' && this.ptr.nodeEl) {
          // Direct DOM — zero Angular CD
          this.ptr.nodeEl.style.transform = `translate(${dx}px,${dy}px)`;
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.animTl?.kill();
  }

  // ── Pointer events ────────────────────────────────────────────────────────

  onViewportDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.ss-drawer') || target.closest('.ss-node__collapse')) return;

    // Always capture to the viewport so all move/up events come here
    const vp = this.viewport?.nativeElement as HTMLElement | undefined;
    vp?.setPointerCapture(e.pointerId);

    const nodeEl = target.closest<HTMLElement>('[data-node-id]');

    if (nodeEl) {
      const nodeId = nodeEl.dataset['nodeId'];
      if (!nodeId) return;
      const n = this.displayNodes().find(n => n.id === nodeId);
      if (!n) return;

      this.ptr = {
        type: 'node', pointerId: e.pointerId, nodeId, nodeEl,
        startClientX: e.clientX, startClientY: e.clientY,
        origPanX: this.panX(), origPanY: this.panY(),
        origNx: n.x, origNy: n.y, moved: false,
      };
      // Don't set draggingId yet — wait until actually moved (avoids re-render on tap)
    } else {
      this.ptr = {
        type: 'pan', pointerId: e.pointerId,
        startClientX: e.clientX, startClientY: e.clientY,
        origPanX: this.panX(), origPanY: this.panY(),
        moved: false,
      };
      this.isPanning.set(true);
    }
  }

  onViewportUp(e: PointerEvent): void {
    if (!this.ptr || e.pointerId !== this.ptr.pointerId) return;
    const { moved, type, nodeId, nodeEl, origNx, origNy, origPanX, origPanY, startClientX, startClientY } = this.ptr;
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    this.ptr = null;
    this.isPanning.set(false);

    if (type === 'pan') {
      // Commit final pan position to signals
      this.panX.set(origPanX + dx);
      this.panY.set(origPanY + dy);
    } else if (type === 'node') {
      if (moved && nodeEl && nodeId) {
        // Clear the imperative transform
        nodeEl.style.transform = '';
        // Commit final node position to signal — single re-render
        const finalX = (origNx ?? 0) + dx;
        const finalY = (origNy ?? 0) + dy;
        this._userPos.update(m => {
          const next = new Map(m);
          next.set(nodeId, { x: finalX, y: finalY });
          return next;
        });
      }
      this.draggingId.set(null);

      // Tap (no movement) → toggle selection
      if (!moved && nodeId) {
        const wasSelected = this.selectedId() === nodeId;
        this.selectedId.set(wasSelected ? null : nodeId);
        if (!wasSelected) setTimeout(() => this.animateDrawerIn(), 20);
      }
    }
  }

  // ── Collapse / expand ─────────────────────────────────────────────────────

  toggleCollapse(event: Event, id: string): void {
    event.stopPropagation();
    this.collapsedIds.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    this._userPos.set(new Map()); // reset drag positions on re-layout
    setTimeout(() => this.runAnimation(), 90);
  }

  deselectAll(): void { this.selectedId.set(null); }

  // ── GSAP animations ───────────────────────────────────────────────────────

  private runAnimation(): void {
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = this.canvasEl?.nativeElement;
    if (!canvas) return;

    // Cache ref and ensure initial pan transform is applied (canvasElRef may not
    // have been set yet if @if rendered after ngAfterViewInit)
    if (!this.canvasElRef) this.canvasElRef = canvas;
    if (!canvas.style.transform) {
      canvas.style.transform = `translate(${this.panX()}px,${this.panY()}px)`;
    }

    const nodeEls = Array.from(canvas.querySelectorAll<HTMLElement>('.ss-node'));
    const linkEls = Array.from(canvas.querySelectorAll<SVGPathElement>('.ss-link'));
    if (!nodeEls.length) return;

    this.animTl?.kill();
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    this.animTl = tl;

    tl.fromTo(linkEls, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.02 });

    const sorted = [...nodeEls].sort(
      (a, b) => Number(a.dataset['depth'] ?? 0) - Number(b.dataset['depth'] ?? 0),
    );
    tl.fromTo(sorted,
      { opacity: 0, y: 16, scale: 0.88 },
      { opacity: 1, y: 0, scale: 1, duration: 0.36, stagger: 0.055,
        ease: 'back.out(1.5)', transformOrigin: 'top center' },
      '-=0.15',
    );
  }

  private animateDrawerIn(): void {
    const el = this.drawerEl?.nativeElement;
    if (!el) return;
    gsap.fromTo(el, { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.28, ease: 'power2.out' });
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  nodeUi(n: LayoutNode): NodeUiDef { return resolveNodeUi(n.data.registry_refs); }

  chipUi(n: LayoutNode, featureKey: string): NodeUiDef | null {
    const val = n.data.features?.[featureKey];
    if (!val) return null;
    const ui = lookupUi(val);
    return ui === DEFAULT_UI ? null : ui;
  }

  cubicPath(link: LayoutLink): string {
    const midY = (link.sy + link.ty) / 2;
    return `M ${link.sx} ${link.sy} C ${link.sx} ${midY}, ${link.tx} ${midY}, ${link.tx} ${link.ty}`;
  }

  lookupVal(val: string): NodeUiDef { return lookupUi(val); }

  morphRows(node: TreebankNode): Array<{ key: string; val: string; ar: boolean }> {
    if (!node.morphology) return [];
    return Object.entries(node.morphology)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => ({
        key: k.replace(/_/g, ' '),
        val: String(v),
        ar: ['root', 'pattern', 'stem'].includes(k),
      }));
  }

  featureRows(node: TreebankNode): Array<{ key: string; val: string; rawVal: string }> {
    if (!node.features) return [];
    return Object.entries(node.features)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => ({
        key: k.replace(/_/g, ' '),
        val: String(v),
        rawVal: String(v),
      }));
  }
}

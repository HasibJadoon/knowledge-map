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

const NODE_W   = 220;
const NODE_H   = 76;
const H_SEP    = 44;
const V_SEP    = 80;
const PAD_X    = 60;
const PAD_Y    = 40;
const DURATION = 0.45; // seconds — D3 example uses 250 ms

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

  let minD3X = Infinity;
  root.each(n => { const nx = (n as any).x; if (nx < minD3X) minD3X = nx; });

  const nodes: LayoutNode[] = [];
  root.each(n => {
    nodes.push({
      id:          n.data.id,
      data:        n.data,
      x:           (n as any).x - minD3X + PAD_X,
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

        <!-- SVG links sit at the viewport level, translated with the canvas -->
        <svg #linkssvg class="ss-links-svg" aria-hidden="true"
          style="position:absolute;top:0;left:0;width:6000px;height:6000px;pointer-events:none;overflow:visible">
          <g #linkGroup>
            @for (link of displayLinks(); track link.targetId) {
              <path
                class="ss-link"
                [attr.d]="cubicPath(link)"
                fill="none"
                stroke="rgba(201,168,76,0.35)"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            }
          </g>
        </svg>

        <div class="ss-canvas" #canvasEl>
          <!-- Node cards -->
          @for (n of displayNodes(); track n.id) {
            <div
              class="ss-node"
              [class.ss-node--dragging]="draggingId() === n.id"
              [class.ss-node--collapsed]="n.hasChildren && collapsedIds().has(n.id)"
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

              @if (n.hasChildren) {
                <span class="ss-node__caret">
                  {{ collapsedIds().has(n.id) ? '▸' : '▾' }}
                </span>
              }
            </div>
          }
        </div>

        <p class="ss-hint">Tap node to expand/collapse &nbsp;•&nbsp; Drag to pan</p>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .ss-viewport {
      position: relative;
      width: 100%;
      flex: 1;
      min-height: 400px;
      overflow: hidden;
      cursor: grab;
      border-radius: 0;
      background: transparent;
      border: none;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .ss-viewport--panning { cursor: grabbing; }
    .ss-viewport--dragging { cursor: none; }

    .ss-canvas {
      position: absolute;
      top: 0; left: 0;
      will-change: transform;
    }

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
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      will-change: transform, opacity;

      &:hover {
        border-color: rgba(201, 168, 76, 0.35);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.55);
      }

      &--dragging {
        cursor: grabbing;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
        z-index: 10;
      }
    }

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

    .ss-node__caret {
      position: absolute;
      bottom: 4px;
      right: 6px;
      font-size: 0.6rem;
      color: rgba(201, 168, 76, 0.5);
      pointer-events: none;
      line-height: 1;
    }

    .ss-node--collapsed {
      border-bottom: 2px dashed rgba(201, 168, 76, 0.22);
    }

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

  @ViewChild('canvasEl')  private canvasEl!:   ElementRef<HTMLElement>;
  @ViewChild('viewport')  private viewport!:   ElementRef<HTMLElement>;
  @ViewChild('linkGroup') private linkGroup!:  ElementRef<SVGGElement>;

  private zone = inject(NgZone);
  private animTl: gsap.core.Timeline | null = null;
  private canvasElRef: HTMLElement | null = null;
  private linkGroupRef: SVGGElement | null = null;

  // ── Signals ───────────────────────────────────────────────────────────────
  private readonly _tb       = signal<TreebankNode | null>(null);
  readonly hasTb             = computed(() => !!this._tb());
  readonly panX              = signal(PAD_X);
  readonly panY              = signal(PAD_Y);
  readonly isPanning         = signal(false);
  readonly draggingId        = signal<string | null>(null);
  readonly collapsedIds      = signal<Set<string>>(new Set());
  private readonly _userPos  = signal<Map<string, { x: number; y: number }>>(new Map());

  // ── Pointer tracking ──────────────────────────────────────────────────────
  private ptr: {
    type: 'pan' | 'node';
    pointerId: number;
    nodeId?: string;
    nodeEl?: HTMLElement;
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
    const overrides = this._userPos();
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
        sx: s.x + NODE_W / 2, sy: s.y + NODE_H,
        tx: t.x + NODE_W / 2, ty: t.y,
      }];
    });
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if ('treebank' in changes) {
      this._tb.set(this.treebank);
      this.collapsedIds.set(new Set());
      this._userPos.set(new Map());
      this.panX.set(PAD_X);
      this.panY.set(PAD_Y);
      setTimeout(() => this.runAnimation(), 90);
    }
  }

  ngAfterViewInit(): void {
    if (this.treebank) setTimeout(() => this.runAnimation(), 90);

    this.zone.runOutsideAngular(() => {
      const vp = this.viewport?.nativeElement as HTMLElement | undefined;
      if (!vp) return;

      // Wheel → pan
      vp.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const x = this.panX() - e.deltaX;
        const y = this.panY() - e.deltaY;
        this.panX.set(x);
        this.panY.set(y);
        if (this.canvasElRef) gsap.set(this.canvasElRef, { x, y });
        this.syncLinkGroup(x, y);
      }, { passive: false });

      // Pointer move → pan or drag
      vp.addEventListener('pointermove', (e: PointerEvent) => {
        if (!this.ptr || e.pointerId !== this.ptr.pointerId) return;
        const dx = e.clientX - this.ptr.startClientX;
        const dy = e.clientY - this.ptr.startClientY;

        if (!this.ptr.moved && Math.hypot(dx, dy) > 5) {
          this.ptr.moved = true;
          if (this.ptr.type === 'node' && this.ptr.nodeId) {
            this.zone.run(() => this.draggingId.set(this.ptr!.nodeId!));
          }
        }

        if (!this.ptr.moved) return;

        if (this.ptr.type === 'pan' && this.canvasElRef) {
          const x = this.ptr.origPanX + dx;
          const y = this.ptr.origPanY + dy;
          gsap.set(this.canvasElRef, { x, y });
          this.syncLinkGroup(x, y);
        } else if (this.ptr.type === 'node' && this.ptr.nodeEl) {
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
      this.panX.set(origPanX + dx);
      this.panY.set(origPanY + dy);
    } else if (type === 'node') {
      if (moved && nodeEl && nodeId) {
        nodeEl.style.transform = '';
        this._userPos.update(m => {
          const next = new Map(m);
          next.set(nodeId, { x: (origNx ?? 0) + dx, y: (origNy ?? 0) + dy });
          return next;
        });
      }
      this.draggingId.set(null);

      // Tap (no drag) → collapse / expand
      if (!moved && nodeId) {
        this.toggleCollapse(nodeId);
      }
    }
  }

  // ── Collapse / expand — D3-style ──────────────────────────────────────────

  private getDescendantIds(rootId: string): Set<string> {
    const tb = this._tb();
    if (!tb) return new Set();
    const result = new Set<string>();
    const find = (node: TreebankNode): boolean => {
      if (node.id === rootId) {
        const collect = (n: TreebankNode) => {
          n.children?.forEach(c => { result.add(c.id); collect(c); });
        };
        collect(node);
        return true;
      }
      return node.children?.some(c => find(c)) ?? false;
    };
    find(tb);
    return result;
  }

  toggleCollapse(id: string): void {
    const tb = this._tb();
    if (!tb) return;
    const n = this.displayNodes().find(n => n.id === id);
    if (!n?.hasChildren) return;

    const wasCollapsed = this.collapsedIds().has(id);

    // Snapshot current positions (like D3's x0, y0)
    const oldPos = new Map(this.displayNodes().map(node => [node.id, { x: node.x, y: node.y }]));
    const parentOldPos = { x: n.x, y: n.y };

    // Pre-compute target layout
    const nextCollapsed = new Set(this.collapsedIds());
    if (wasCollapsed) nextCollapsed.delete(id); else nextCollapsed.add(id);
    const { nodes: newNodes } = buildLayout(tb, nextCollapsed);
    const newPos = new Map(newNodes.map(node => [node.id, { x: node.x, y: node.y }]));
    const parentNewPos = newPos.get(id) ?? parentOldPos;

    const canvas = this.canvasElRef;

    if (!wasCollapsed) {
      // ── COLLAPSE ────────────────────────────────────────────────────────
      const descendantIds = this.getDescendantIds(id);
      if (!canvas || !descendantIds.size) {
        this.collapsedIds.set(nextCollapsed);
        this._userPos.set(new Map());
        this.recenterCanvas(newNodes);
        return;
      }

      // Animate exit nodes toward parent's new position (D3 exit pattern)
      const exitEls = Array.from(canvas.querySelectorAll<HTMLElement>('.ss-node'))
        .filter(el => descendantIds.has(el.dataset['nodeId'] ?? ''));

      exitEls.forEach(el => {
        const op = oldPos.get(el.dataset['nodeId'] ?? '') ?? { x: 0, y: 0 };
        gsap.to(el, {
          x: parentNewPos.x - op.x,
          y: parentNewPos.y - op.y,
          opacity: 0,
          scale: 0.7,
          duration: DURATION,
          ease: 'power2.in',
          overwrite: true,
        });
      });

      // After exit animation: update signal, slide remaining, recenter
      setTimeout(() => {
        this.zone.run(() => {
          this.collapsedIds.set(nextCollapsed);
          this._userPos.set(new Map());

          requestAnimationFrame(() => {
            if (!canvas) return;
            // Slide remaining nodes from old → new positions
            Array.from(canvas.querySelectorAll<HTMLElement>('.ss-node')).forEach(el => {
              const nid = el.dataset['nodeId'];
              if (!nid) return;
              const op = oldPos.get(nid);
              const np = newPos.get(nid);
              if (!op || !np) return;
              if (Math.abs(op.x - np.x) > 0.5 || Math.abs(op.y - np.y) > 0.5) {
                gsap.fromTo(el,
                  { x: op.x - np.x, y: op.y - np.y },
                  { x: 0, y: 0, duration: DURATION, ease: 'power2.out', overwrite: true },
                );
              } else {
                gsap.set(el, { x: 0, y: 0, opacity: 1, scale: 1 });
              }
            });
            this.recenterCanvas(newNodes);
          });
        });
      }, DURATION * 1000);

    } else {
      // ── EXPAND ──────────────────────────────────────────────────────────
      this.collapsedIds.set(nextCollapsed);
      this._userPos.set(new Map());

      // Wait for Angular to re-render the new nodes
      setTimeout(() => {
        if (!canvas) return;

        const allNodeEls = Array.from(canvas.querySelectorAll<HTMLElement>('.ss-node'));

        // Group ENTERING nodes by depth for one-by-one reveal (D3 enter pattern)
        const enterByDepth = new Map<number, HTMLElement[]>();
        allNodeEls.forEach(el => {
          const nid = el.dataset['nodeId'];
          if (!nid || oldPos.has(nid)) return; // skip existing nodes
          const depth = Number(el.dataset['depth'] ?? 0);
          if (!enterByDepth.has(depth)) enterByDepth.set(depth, []);
          enterByDepth.get(depth)!.push(el);
        });

        // Enter each depth level sequentially
        const depthLevels = Array.from(enterByDepth.keys()).sort((a, b) => a - b);
        depthLevels.forEach((depth, depthIdx) => {
          const els = enterByDepth.get(depth)!;
          els.forEach((el, i) => {
            const nid = el.dataset['nodeId'];
            const np = newPos.get(nid ?? '') ?? { x: 0, y: 0 };
            // Start from parent's old position (D3 enter pattern)
            const dx = parentOldPos.x - np.x;
            const dy = parentOldPos.y - np.y;
            gsap.fromTo(el,
              { opacity: 0, x: dx, y: dy, scale: 0.75 },
              {
                opacity: 1, x: 0, y: 0, scale: 1,
                duration: DURATION,
                delay: depthIdx * 0.12 + i * 0.04,
                ease: 'back.out(1.2)',
                transformOrigin: 'top center',
                overwrite: true,
              },
            );
          });
        });

        // Slide existing nodes that moved (D3 update pattern)
        allNodeEls.forEach(el => {
          const nid = el.dataset['nodeId'];
          if (!nid) return;
          const op = oldPos.get(nid);
          const np = newPos.get(nid);
          if (!op || !np) return; // new node handled above
          if (Math.abs(op.x - np.x) > 0.5 || Math.abs(op.y - np.y) > 0.5) {
            gsap.fromTo(el,
              { x: op.x - np.x, y: op.y - np.y },
              { x: 0, y: 0, duration: DURATION, ease: 'power2.out', overwrite: true },
            );
          }
        });

        this.recenterCanvas(newNodes);
      }, 50);
    }
  }

  /** Sync SVG link group transform to match canvas pan. */
  private syncLinkGroup(x: number, y: number): void {
    if (this.linkGroupRef) {
      this.linkGroupRef.setAttribute('transform', `translate(${x},${y})`);
    }
  }

  // ── Re-center canvas to keep tree in view ─────────────────────────────────
  private recenterCanvas(nodes: LayoutNode[]): void {
    const canvas = this.canvasElRef;
    const vp = this.viewport?.nativeElement as HTMLElement | null;
    if (!canvas || !vp || !nodes.length) return;

    const vpW = vp.clientWidth;
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + NODE_W));
    const treeW = maxX - minX;
    const cx = Math.max(PAD_X, (vpW - treeW) / 2) - minX;
    const cy = PAD_Y;

    this.panX.set(cx);
    this.panY.set(cy);
    gsap.to(canvas, {
      x: cx, y: cy, duration: DURATION, ease: 'power2.out', overwrite: true,
      onUpdate: () => this.syncLinkGroup(
        gsap.getProperty(canvas, 'x') as number,
        gsap.getProperty(canvas, 'y') as number,
      ),
      onComplete: () => this.syncLinkGroup(cx, cy),
    });
  }

  // ── Initial entrance animation ────────────────────────────────────────────
  private runAnimation(): void {
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = this.canvasEl?.nativeElement;
    if (!canvas) return;

    this.canvasElRef = canvas;
    this.linkGroupRef = this.linkGroup?.nativeElement ?? null;

    // Center tree horizontally
    const vp = this.viewport?.nativeElement as HTMLElement | null;
    const vpW = vp?.clientWidth ?? 800;
    const allNodes = this.displayNodes();
    if (allNodes.length) {
      const minX = Math.min(...allNodes.map(n => n.x));
      const maxX = Math.max(...allNodes.map(n => n.x + NODE_W));
      const treeW = maxX - minX;
      const cx = Math.max(PAD_X, (vpW - treeW) / 2) - minX;
      const cy = PAD_Y;
      this.panX.set(cx);
      this.panY.set(cy);
      gsap.set(canvas, { x: cx, y: cy });
      this.syncLinkGroup(cx, cy);
    } else {
      const px = this.panX(), py = this.panY();
      gsap.set(canvas, { x: px, y: py });
      this.syncLinkGroup(px, py);
    }

    // Stagger nodes in by depth
    const nodeEls = Array.from(canvas.querySelectorAll<HTMLElement>('.ss-node'))
      .sort((a, b) => Number(a.dataset['depth'] ?? 0) - Number(b.dataset['depth'] ?? 0));
    const linkEls = Array.from(canvas.querySelectorAll<SVGPathElement>('.ss-link'));
    if (!nodeEls.length) return;

    this.animTl?.kill();
    const tl = gsap.timeline();
    this.animTl = tl;

    tl.fromTo(linkEls,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, stagger: 0.02 },
    );
    tl.fromTo(nodeEls,
      { opacity: 0, y: 20, scale: 0.85 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06,
        ease: 'back.out(1.4)', transformOrigin: 'top center' },
      '-=0.1',
    );
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
}

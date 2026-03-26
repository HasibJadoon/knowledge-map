import {
  Component, Input, OnChanges, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, signal, computed,
  ChangeDetectionStrategy, NgZone, inject,
} from '@angular/core';
import { hierarchy, tree, HierarchyNode } from 'd3-hierarchy';
import gsap from 'gsap';
import { resolveNodeUi, lookupUi, DEFAULT_UI, NodeUiDef } from './ss-ui-registry';

// ── Domain types ─────────────────────────────────────────────────────────────

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
  /** left edge in px */
  x: number;
  /** top edge in px */
  y: number;
  depth: number;
}

interface LayoutLink {
  sourceId: string;
  targetId: string;
  /** bottom-centre of source card */
  sx: number;
  sy: number;
  /** top-centre of target card */
  tx: number;
  ty: number;
}

// ── Layout constants ──────────────────────────────────────────────────────────

const NODE_W  = 220;   // card width px
const NODE_H  = 76;    // card height px (fixed for link math)
const H_SEP   = 28;    // horizontal gap between sibling cards
const V_SEP   = 64;    // vertical gap between depth levels
const PAD_X   = 32;    // canvas horizontal padding
const PAD_Y   = 24;    // canvas vertical padding

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'km-sentence-structure-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ss-canvas-outer" #canvasOuter (click)="deselectAll()">

      @if (!treebank) {
        <div class="ss-empty">
          <span class="ss-empty__icon">⊙</span>
          <p>No treebank data for this passage.</p>
        </div>
      }

      @if (treebank && layoutNodes().length) {
        <!-- Scrollable inner -->
        <div class="ss-canvas-scroll">
          <div
            class="ss-canvas"
            [style.width.px]="canvasW()"
            [style.height.px]="canvasH()"
            #canvasEl
          >
            <!-- SVG: links only ────────────────────────── -->
            <svg
              class="ss-links-svg"
              [attr.width]="canvasW()"
              [attr.height]="canvasH()"
              aria-hidden="true"
            >
              @for (link of layoutLinks(); track link.targetId) {
                <path
                  class="ss-link"
                  [attr.d]="cubicPath(link)"
                  fill="none"
                  stroke="rgba(201,168,76,0.18)"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              }
            </svg>

            <!-- HTML cards overlay ──────────────────────── -->
            @for (n of layoutNodes(); track n.id) {
              <div
                class="ss-node"
                [class.ss-node--selected]="selectedId() === n.id"
                [attr.data-depth]="n.depth"
                [style.left.px]="n.x"
                [style.top.px]="n.y"
                [style.border-left-color]="nodeUi(n).bg"
                (click)="selectNode($event, n)"
              >
                <!-- Left accent strip -->
                <div class="ss-node__strip" [style.background]="nodeUi(n).bg"></div>

                <div class="ss-node__body">
                  <!-- Arabic grammatical label (colored) -->
                  @if (n.data.label_ar) {
                    <span class="ss-node__label-ar" [style.color]="nodeUi(n).bg">
                      {{ n.data.label_ar }}
                    </span>
                  }

                  <!-- English gloss -->
                  @if (n.data.label_en) {
                    <span class="ss-node__label-en">{{ n.data.label_en }}</span>
                  }

                  <!-- Arabic text (word nodes) -->
                  @if (n.data.text_ar) {
                    <span class="ss-node__text-ar">{{ n.data.text_ar }}</span>
                  }

                  <!-- Feature chips row -->
                  <div class="ss-node__chips">
                    @if (chipUi(n, 'case'); as u) {
                      <span class="ss-node__chip"
                        [style.background]="u.bg + '26'"
                        [style.color]="u.bg"
                        [style.border-color]="u.bg + '40'">
                        {{ u.label_ar }}
                      </span>
                    }
                    @if (chipUi(n, 'verb_tense'); as u) {
                      <span class="ss-node__chip"
                        [style.background]="u.bg + '26'"
                        [style.color]="u.bg"
                        [style.border-color]="u.bg + '40'">
                        {{ u.label_ar }}
                      </span>
                    }
                    @if (chipUi(n, 'number'); as u) {
                      <span class="ss-node__chip"
                        [style.background]="u.bg + '26'"
                        [style.color]="u.bg"
                        [style.border-color]="u.bg + '40'">
                        {{ u.label_ar }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Detail drawer ───────────────────────────────── -->
        @if (selected()) {
          <div class="ss-drawer" (click)="$event.stopPropagation()" #drawerEl>
            <div class="ss-drawer__header" [style.border-left-color]="nodeUi(selectedLayoutNode()!).bg">
              <div class="ss-drawer__header-text">
                @if (selected()!.label_ar) {
                  <span class="ss-drawer__label-ar" [style.color]="nodeUi(selectedLayoutNode()!).bg">
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
                    <span class="ss-drawer__val" [class.ss-drawer__val--ar]="row.ar">{{ row.val }}</span>
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
      }
    </div>
  `,
  styles: [`
    /* ── Outer wrap ───────────────────────────────────────────────────────── */
    .ss-canvas-outer {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      min-height: 320px;
    }

    /* ── Horizontal scroll container ─────────────────────────────────────── */
    .ss-canvas-scroll {
      width: 100%;
      overflow-x: auto;
      overflow-y: visible;
      /* custom scrollbar */
      scrollbar-width: thin;
      scrollbar-color: rgba(201,168,76,0.25) transparent;
      &::-webkit-scrollbar { height: 4px; }
      &::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 2px; }
    }

    /* ── Canvas (absolute positioning context) ───────────────────────────── */
    .ss-canvas {
      position: relative;
      /* width & height set via [style] */
    }

    /* ── SVG links ────────────────────────────────────────────────────────── */
    .ss-links-svg {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      overflow: visible;
    }

    .ss-link {
      transition: stroke 0.2s;
    }

    /* ── Node card ────────────────────────────────────────────────────────── */
    .ss-node {
      position: absolute;
      width: 220px;
      min-height: 76px;
      background: #111;
      border: 1px solid #252525;
      border-left: 3px solid transparent;
      border-radius: 9px;
      display: flex;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      will-change: transform, opacity;

      &:hover {
        border-color: rgba(201,168,76,0.35);
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      }

      &--selected {
        box-shadow: 0 0 0 2px rgba(201,168,76,0.55), 0 6px 28px rgba(0,0,0,0.6);
        border-color: rgba(201,168,76,0.5) !important;
      }
    }

    /* Left accent strip */
    .ss-node__strip {
      width: 3px;
      flex-shrink: 0;
      border-radius: 9px 0 0 9px;
    }

    .ss-node__body {
      flex: 1;
      padding: 7px 9px 7px 7px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .ss-node__label-ar {
      font-family: var(--km-font-arabic, 'UthmanicHafs'), serif;
      font-size: 0.82rem;
      font-weight: 600;
      direction: rtl;
      text-align: right;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ss-node__label-en {
      font-size: 0.65rem;
      color: #6b7280;
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ss-node__text-ar {
      font-family: var(--km-font-arabic, 'UthmanicHafs'), serif;
      font-size: 1.0rem;
      direction: rtl;
      text-align: right;
      color: #e5e7eb;
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

    /* ── Detail drawer ───────────────────────────────────────────────────── */
    .ss-drawer {
      background: #111;
      border: 1px solid #252525;
      border-radius: 12px;
      padding: 0;
      overflow: hidden;
      will-change: opacity, transform;
    }

    .ss-drawer__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 12px 14px;
      border-left: 3px solid var(--km-gold, #c9a84c);
      border-bottom: 1px solid #1e1e1e;
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
      color: #6b7280;
      font-style: italic;
    }

    .ss-drawer__close {
      background: none;
      border: none;
      color: #4b5563;
      font-size: 0.78rem;
      cursor: pointer;
      padding: 0 0 0 12px;
      flex-shrink: 0;
      line-height: 1;
      &:hover { color: #9ca3af; }
    }

    .ss-drawer__text-ar {
      font-family: var(--km-font-arabic, serif);
      font-size: 1.15rem;
      direction: rtl;
      text-align: right;
      color: #e5e7eb;
      padding: 10px 14px 4px;
      margin: 0;
      border-bottom: 1px solid #1a1a1a;
    }

    .ss-drawer__notes {
      font-size: 0.82rem;
      color: #6b7280;
      font-style: italic;
      padding: 8px 14px;
      margin: 0;
    }

    .ss-drawer__section {
      padding: 8px 14px 10px;
      border-top: 1px solid #1a1a1a;
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
      color: #4b5563;
      text-transform: capitalize;
      white-space: nowrap;
    }

    .ss-drawer__val {
      font-size: 0.78rem;
      color: #9ca3af;
      text-align: right;
      &--ar {
        font-family: var(--km-font-arabic, serif);
        direction: rtl;
        font-size: 0.9rem;
        color: #e5e7eb;
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

    /* ── Empty state ─────────────────────────────────────────────────────── */
    .ss-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 4rem 1rem;
      color: #374151;
      text-align: center;

      &__icon { font-size: 2.5rem; opacity: 0.2; }
      p { font-size: 0.875rem; font-style: italic; }
    }
  `],
})
export class SentenceStructureCanvasComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() treebank: TreebankNode | null = null;

  @ViewChild('canvasEl')  canvasEl!:  ElementRef<HTMLElement>;
  @ViewChild('canvasOuter') canvasOuter!: ElementRef<HTMLElement>;
  @ViewChild('drawerEl')  drawerEl?:  ElementRef<HTMLElement>;

  private zone   = inject(NgZone);
  private animTl: gsap.core.Timeline | null = null;

  // ── Layout state ───────────────────────────────────────────────────────────

  layoutNodes = signal<LayoutNode[]>([]);
  layoutLinks = signal<LayoutLink[]>([]);
  canvasW     = signal(800);
  canvasH     = signal(400);
  selectedId  = signal<string | null>(null);

  selected = computed<TreebankNode | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.layoutNodes().find(n => n.id === id)?.data ?? null;
  });

  selectedLayoutNode = computed<LayoutNode | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.layoutNodes().find(n => n.id === id) ?? null;
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnChanges(): void {
    this.selectedId.set(null);
    this.computeLayout();
    setTimeout(() => this.runAnimation(), 90);
  }

  ngAfterViewInit(): void {
    if (this.treebank) {
      this.computeLayout();
      setTimeout(() => this.runAnimation(), 90);
    }
  }

  ngOnDestroy(): void {
    this.animTl?.kill();
  }

  // ── D3 layout (pure computation — no DOM) ─────────────────────────────────

  private computeLayout(): void {
    if (!this.treebank) {
      this.layoutNodes.set([]);
      this.layoutLinks.set([]);
      return;
    }

    // Build d3 hierarchy
    const root: HierarchyNode<TreebankNode> = hierarchy<TreebankNode>(
      this.treebank,
      d => d.children,
    );

    // Tree layout: nodeSize = [horizontal-step, vertical-step]
    const treeLayout = tree<TreebankNode>()
      .nodeSize([NODE_W + H_SEP, NODE_H + V_SEP]);

    treeLayout(root);

    // Find x bounds to normalize to positive coordinates
    let minX = Infinity, maxX = -Infinity;
    root.each(n => {
      const nx = (n as unknown as { x: number }).x;
      if (nx < minX) minX = nx;
      if (nx > maxX) maxX = nx;
    });

    const offsetX = -minX + PAD_X + NODE_W / 2;

    const nodes: LayoutNode[] = [];
    const links: LayoutLink[] = [];

    root.each(n => {
      const nx = (n as unknown as { x: number }).x;
      const ny = (n as unknown as { y: number }).y;
      nodes.push({
        id:    n.data.id,
        data:  n.data,
        x:     nx + offsetX - NODE_W / 2,   // left edge
        y:     ny + PAD_Y,                   // top edge
        depth: n.depth,
      });
    });

    root.links().forEach(lk => {
      const sx = (lk.source as unknown as { x: number }).x;
      const sy = (lk.source as unknown as { y: number }).y;
      const tx = (lk.target as unknown as { x: number }).x;
      const ty = (lk.target as unknown as { y: number }).y;
      links.push({
        sourceId: lk.source.data.id,
        targetId: lk.target.data.id,
        sx: sx + offsetX,               // bottom-centre of source card
        sy: sy + PAD_Y + NODE_H,
        tx: tx + offsetX,               // top-centre of target card
        ty: ty + PAD_Y,
      });
    });

    const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
    const totalW   = (maxX - minX) + 2 * PAD_X + NODE_W;
    const totalH   = (maxDepth + 1) * (NODE_H + V_SEP) + 2 * PAD_Y;

    this.canvasW.set(Math.max(totalW, 600));
    this.canvasH.set(Math.max(totalH, 300));
    this.layoutNodes.set(nodes);
    this.layoutLinks.set(links);
  }

  // ── GSAP animation ────────────────────────────────────────────────────────

  private runAnimation(): void {
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = this.canvasEl?.nativeElement;
    if (!canvas) return;

    const nodeEls = Array.from(canvas.querySelectorAll<HTMLElement>('.ss-node'));
    const linkEls = Array.from(canvas.querySelectorAll<SVGPathElement>('.ss-link'));
    if (!nodeEls.length) return;

    this.animTl?.kill();
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    this.animTl = tl;

    // Links: fade in quickly
    tl.fromTo(linkEls,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, stagger: 0.025 }
    );

    // Sort nodes by depth so root animates first
    const sorted = [...nodeEls].sort(
      (a, b) => Number(a.dataset['depth'] ?? 0) - Number(b.dataset['depth'] ?? 0)
    );

    tl.fromTo(sorted,
      { opacity: 0, y: 18, scale: 0.85 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.38, stagger: 0.06,
        ease: 'back.out(1.4)',
        transformOrigin: 'top center',
      },
      '-=0.2'
    );
  }

  private animateDrawerIn(): void {
    const el = this.drawerEl?.nativeElement;
    if (!el) return;
    gsap.fromTo(el,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );
  }

  // ── Interaction ───────────────────────────────────────────────────────────

  selectNode(event: MouseEvent, n: LayoutNode): void {
    event.stopPropagation();
    const wasSelected = this.selectedId() === n.id;
    this.selectedId.set(wasSelected ? null : n.id);
    if (!wasSelected) setTimeout(() => this.animateDrawerIn(), 20);
  }

  deselectAll(): void {
    this.selectedId.set(null);
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  /** Primary card colour for a layout node. */
  nodeUi(n: LayoutNode): NodeUiDef {
    return resolveNodeUi(n.data.registry_refs);
  }

  /** Chip colour for a specific feature key on a node. Returns null if no value. */
  chipUi(n: LayoutNode, featureKey: string): NodeUiDef | null {
    const val = n.data.features?.[featureKey];
    if (!val) return null;
    const ui = lookupUi(val);
    return ui === DEFAULT_UI ? null : ui;
  }

  /** Cubic bezier SVG path between parent bottom-centre and child top-centre. */
  cubicPath(link: LayoutLink): string {
    const midY = (link.sy + link.ty) / 2;
    return `M ${link.sx} ${link.sy} C ${link.sx} ${midY}, ${link.tx} ${midY}, ${link.tx} ${link.ty}`;
  }

  /** Look up a raw feature value in the registry. */
  lookupVal(val: string): NodeUiDef {
    return lookupUi(val);
  }

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

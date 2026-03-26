// ─────────────────────────────────────────────────────────────────────────────
//  SentenceStructureCanvasComponent
//  D3 horizontal collapsible tree — card-based nodes, RTL, cinematic dark theme
// ─────────────────────────────────────────────────────────────────────────────

import {
  AfterViewInit, ChangeDetectionStrategy, Component,
  ElementRef, inject, Input, NgZone, OnChanges,
  OnDestroy, SimpleChanges, ViewChild, ViewEncapsulation,
} from '@angular/core';
import { hierarchy, tree as d3Tree } from 'd3-hierarchy';
import { select }                     from 'd3-selection';
import 'd3-transition';

// ── Public types ──────────────────────────────────────────────────────────────

export interface SsTreeNode {
  name:      string;
  id?:       string;
  term_id?:  string;
  label_ar?: string;
  children?: SsTreeNode[];
}

// ── Card geometry ─────────────────────────────────────────────────────────────

const CW   = 182;  // card width
const CH   = 74;   // card height
const CR   = 10;   // corner radius
const AW   =  5;   // accent strip width (right edge, toward parent in RTL)

// ── Tree spacing ──────────────────────────────────────────────────────────────

const SIB  = 112;  // vertical gap between siblings   (nodeSize[0])
const DEP  = 292;  // horizontal depth per level      (nodeSize[1])

// ── Viewport margins ──────────────────────────────────────────────────────────

const MT = 44, MB = 44, ML = 36, MR = 36;

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector:        'km-sentence-structure-canvas',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None,        // D3 HTML elements get styles
  template:        `<div #wrap class="kss"></div>`,
  styles: [`

    /* ── Component shell ──────────────────────────────────────── */
    km-sentence-structure-canvas { display: block; width: 100%; }
    .kss {
      display:        flex;
      flex-direction: column;
      gap:            .9rem;
      width:          100%;
    }

    /* ── Sentence card ───────────────────────────────────────── */
    .kss__card {
      background:     rgba(255, 255, 255, .04);
      border:         1px solid rgba(201, 168, 76, .22);
      border-radius:  14px;
      padding:        1.05rem 1.4rem .95rem;
      display:        flex;
      flex-direction: column;
      gap:            .7rem;
    }

    .kss__sentence {
      margin:         0;
      font-family:    var(--km-font-arabic, "Scheherazade New", serif);
      font-size:      1.65rem;
      line-height:    2.1;
      color:          #dce8ff;
      text-align:     center;
      direction:      rtl;
      letter-spacing: .02em;
    }

    .kss__chips {
      display:         flex;
      flex-wrap:       wrap;
      gap:             .42rem;
      justify-content: center;
      direction:       rtl;
    }

    .kss__chip {
      display:     inline-flex;
      align-items: center;
      gap:         .28rem;
      padding:     .22rem .58rem;
      border-radius: 999px;
      border:      1px solid transparent;
      transition:  filter .2s;
      cursor:      default;
    }
    .kss__chip:hover { filter: brightness(1.2); }

    .kss__chip-w {
      font-family: var(--km-font-arabic, "Scheherazade New", serif);
      font-size:   .95rem;
      color:       #dce8ff;
      line-height: 1.9;
    }

    .kss__chip-l {
      font-family: var(--km-font-arabic, "Scheherazade New", serif);
      font-size:   .58rem;
      opacity:     .88;
    }

    /* ── SVG scroll host ─────────────────────────────────────── */
    .kss__svg-host {
      width:      100%;
      overflow-x: auto;
      overflow-y: visible;
    }
    .kss__svg-host svg {
      display:     block;
      overflow:    visible;
      user-select: none;
    }

  `],
})
export class SentenceStructureCanvasComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() treeData:   SsTreeNode | null      = null;
  @Input() termColors: Record<string, string> = {};

  @ViewChild('wrap') private wrapRef!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);

  private wrap: any = null;   // D3 selection of host div
  private svg:  any = null;
  private gL:   any = null;   // link layer (below nodes)
  private gN:   any = null;   // node layer
  private root: any = null;
  private obs:  ResizeObserver | null = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.wrap = select(this.wrapRef.nativeElement);
      this.mountSvg();
      this.obs = new ResizeObserver(() => {
        if (this.root) this.refresh(null, this.root);
      });
      this.obs.observe(this.wrapRef.nativeElement);
      if (this.treeData) this.build();
    });
  }

  ngOnChanges(c: SimpleChanges): void {
    if (!this.wrap) return;
    if ('treeData' in c || 'termColors' in c)
      this.zone.runOutsideAngular(() => this.build());
  }

  ngOnDestroy(): void { this.obs?.disconnect(); }

  // ── Mount SVG (once) ──────────────────────────────────────────────────────

  private mountSvg(): void {
    this.wrap.selectAll('.kss__svg-host').remove();
    const host  = this.wrap.append('div').attr('class', 'kss__svg-host');
    this.svg    = host.append('svg');
    this.addDefs();
    this.gL     = this.svg.append('g').attr('fill', 'none');
    this.gN     = this.svg.append('g');
  }

  // ── Build / rebuild ───────────────────────────────────────────────────────

  private build(): void {
    // 1. D3-rendered sentence card
    this.renderCard();

    // 2. Clear tree layers
    this.gL.selectAll('*').remove();
    this.gN.selectAll('*').remove();
    this.root = null;

    if (!this.treeData) return;

    // 3. Hierarchy + stash
    this.root = hierarchy(this.treeData);
    let uid   = 0;
    this.root.descendants().forEach((d: any) => {
      d.uid       = uid++;
      d._children = d.children ?? null;
      if (d.depth > 1) d.children = null;   // collapse beyond first level
    });
    this.root.x0 = 0;
    this.root.y0 = 0;

    this.refresh(null, this.root);
  }

  // ── D3 sentence card ──────────────────────────────────────────────────────
  // Renders the full Arabic sentence + color-coded word chips above the tree.

  private renderCard(): void {
    this.wrap.selectAll('.kss__card').remove();
    if (!this.treeData) return;

    const card = this.wrap.insert('div', '.kss__svg-host')
      .attr('class', 'kss__card');

    // Full sentence text
    card.append('p')
      .attr('class', 'kss__sentence')
      .text(this.treeData.name);

    // First-level children as color-coded chips
    const kids = this.treeData.children ?? [];
    if (!kids.length) return;

    const row = card.append('div').attr('class', 'kss__chips');

    kids.forEach(ch => {
      const clr = ch.term_id ? (this.termColors[ch.term_id] ?? '#888') : '#888';
      const chip = row.append('span')
        .attr('class', 'kss__chip')
        .style('background',   this.rgba(clr, .12))
        .style('border-color', this.rgba(clr, .42));

      chip.append('span').attr('class', 'kss__chip-w').text(ch.name);

      if (ch.label_ar) {
        chip.append('span')
          .attr('class', 'kss__chip-l')
          .style('color', clr)
          .text(ch.label_ar);
      }
    });
  }

  // ── Core update — Observable HQ pattern, horizontal RTL ──────────────────

  private refresh(evt: MouseEvent | null, src: any): void {
    if (!this.svg || !this.root) return;

    const dur = evt?.altKey ? 2500 : 300;

    // Standard D3 layout → flip y for RTL (root on right, children to left)
    d3Tree<SsTreeNode>().nodeSize([SIB, DEP])(this.root);
    this.root.eachBefore((d: any) => { d.y = -d.y; });

    // Extents (after flip)
    let x0 =  Infinity, x1 = -Infinity;
    let y0 =  Infinity, y1 = -Infinity;
    this.root.eachBefore((d: any) => {
      if (d.x < x0) x0 = d.x;  if (d.x > x1) x1 = d.x;
      if (d.y < y0) y0 = d.y;  if (d.y > y1) y1 = d.y;
    });

    const vH = x1 - x0 + CH + MT + MB;
    const vW = y1 - y0 + CW + ML + MR;

    // offsets so card centres land inside margins
    const ox = -y0 + ML + CW / 2;   // horizontal (y-axis after flip = screen x)
    const oy = -x0 + MT + CH / 2;   // vertical

    // keep host div wide enough for horizontal scroll
    this.wrap.select('.kss__svg-host').style('min-width', `${vW}px`);

    const T = this.svg.transition().duration(dur)
      .attr('width',   vW)
      .attr('height',  vH)
      .attr('viewBox', `0 0 ${vW} ${vH}`);

    const nodes = this.root.descendants().reverse() as any[];
    const links = this.root.links()                 as any[];

    // ── Nodes ──────────────────────────────────────────────────────────────

    const node = this.gN
      .selectAll<SVGGElement, any>('g.kss-n')
      .data(nodes, (d: any) => d.uid);

    // ENTER — start at source's stashed position
    const nEnter = node.enter().append('g')
      .attr('class',     'kss-n')
      .attr('cursor',    'pointer')
      .attr('transform', () => {
        const ix = (src.y0 ?? src.y) + ox;
        const iy = (src.x0 ?? src.x) + oy;
        return `translate(${ix},${iy})`;
      })
      .attr('opacity', 0)
      .on('click', (e: MouseEvent, d: any) => {
        d.children = d.children ? null : d._children;
        this.refresh(e, d);
      })
      .on('mouseenter', (e: MouseEvent) => {
        select(e.currentTarget as SVGGElement)
          .select<SVGRectElement>('.kss-bg')
          .transition().duration(140)
          .attr('filter', 'url(#kss-glow)');
      })
      .on('mouseleave', (e: MouseEvent) => {
        select(e.currentTarget as SVGGElement)
          .select<SVGRectElement>('.kss-bg')
          .transition().duration(220)
          .attr('filter', null as any);
      });

    // Card background rect
    nEnter.append('rect').attr('class', 'kss-bg')
      .attr('x',      -CW / 2).attr('y', -CH / 2)
      .attr('width',  CW).attr('height', CH)
      .attr('rx', CR).attr('ry', CR)
      .attr('fill',         (d: any) => this.cardBg(d))
      .attr('stroke',       (d: any) => this.cardBorder(d))
      .attr('stroke-width', 1.5);

    // Right-side accent strip (parent connection side in RTL)
    nEnter.append('rect').attr('class', 'kss-ac')
      .attr('x',      CW / 2 - AW)
      .attr('y',      -CH / 2 + CR)
      .attr('width',  AW)
      .attr('height', CH - CR * 2)
      .attr('rx', 2)
      .attr('fill', (d: any) => this.tc(d));

    // Left-edge collapse indicator (children expand leftward)
    nEnter.append('circle').attr('class', 'kss-dot')
      .attr('cx', -(CW / 2) + 10)
      .attr('cy', 0)
      .attr('r',  4.5)
      .attr('fill',         (d: any) => (d._children && !d.children) ? this.tc(d) : 'none')
      .attr('stroke',       (d: any) => d._children                  ? this.tc(d) : 'none')
      .attr('stroke-width', 1.5);

    // Arabic name — dominant text
    nEnter.append('text').attr('class', 'kss-name')
      .attr('text-anchor',      'middle')
      .attr('dominant-baseline','middle')
      .attr('y', (d: any) => d.data.label_ar ? -11 : 2)
      .attr('font-family',      'var(--km-font-arabic,"Scheherazade New",serif)')
      .attr('font-size',        (d: any) => d.depth === 0 ? 16 : 15)
      .attr('fill',             '#dce8ff')
      .attr('paint-order',      'stroke')
      .attr('stroke',           'rgba(8,12,28,.9)')
      .attr('stroke-width',     4)
      .attr('stroke-linejoin',  'round')
      .text((d: any) => this.clip(d.data.name, d.depth === 0 ? 26 : 18));

    // Grammar label — subtle subtitle
    nEnter.append('text').attr('class', 'kss-lbl')
      .attr('text-anchor',      'middle')
      .attr('dominant-baseline','middle')
      .attr('y',  17)
      .attr('font-family', 'var(--km-font-arabic,"Scheherazade New",serif)')
      .attr('font-size',   10)
      .attr('fill',        (d: any) => this.tc(d))
      .attr('opacity',     .9)
      .attr('paint-order',     'stroke')
      .attr('stroke',          'rgba(8,12,28,.8)')
      .attr('stroke-width',    3)
      .attr('stroke-linejoin', 'round')
      .text((d: any) => d.data.label_ar ?? '');

    // UPDATE — transition to new positions
    const nUpdate = node.merge(nEnter).transition(T)
      .attr('transform', (d: any) => `translate(${d.y + ox},${d.x + oy})`)
      .attr('opacity', 1);

    nUpdate.select('.kss-bg')
      .attr('fill',   (d: any) => this.cardBg(d))
      .attr('stroke', (d: any) => this.cardBorder(d));
    nUpdate.select('.kss-ac')
      .attr('fill', (d: any) => this.tc(d));
    nUpdate.select('.kss-dot')
      .attr('fill',   (d: any) => (d._children && !d.children) ? this.tc(d) : 'none')
      .attr('stroke', (d: any) =>  d._children                 ? this.tc(d) : 'none');
    nUpdate.select('.kss-lbl')
      .attr('fill', (d: any) => this.tc(d));

    // EXIT — collapse toward source
    node.exit().transition(T)
      .attr('transform', () => `translate(${src.y + ox},${src.x + oy})`)
      .attr('opacity', 0)
      .remove();

    // ── Links ──────────────────────────────────────────────────────────────

    const link = this.gL
      .selectAll<SVGPathElement, any>('path.kss-l')
      .data(links, (d: any) => d.target.uid);

    const ip = { y: (src.y0 ?? src.y) + ox, x: (src.x0 ?? src.x) + oy };

    // ENTER — collapsed at source
    const lEnter = link.enter().append('path')
      .attr('class',          'kss-l')
      .attr('stroke',         (d: any) => this.tc(d.target))
      .attr('stroke-width',   1.8)
      .attr('stroke-opacity', .48)
      .attr('d', () => this.curve(ip, ip));

    // UPDATE — animate to final positions
    (link.merge(lEnter) as any).transition(T)
      .attr('stroke', (d: any) => this.tc(d.target))
      .attr('d', (d: any) => this.curve(
        { y: d.source.y + ox, x: d.source.x + oy },
        { y: d.target.y + ox, x: d.target.x + oy },
      ));

    // EXIT — collapse toward source
    link.exit().transition(T)
      .attr('d', () => {
        const p = { y: src.y + ox, x: src.x + oy };
        return this.curve(p, p);
      })
      .remove();

    // Stash current positions for next transition
    this.root.eachBefore((d: any) => { d.x0 = d.x; d.y0 = d.y; });
  }

  // ── Cubic bezier: parent left-edge → child right-edge (RTL) ──────────────
  // In RTL layout: parent is to the RIGHT, children expand LEFT.
  // src.y = parent screen-x (larger), tgt.y = child screen-x (smaller).
  // Connect: parent left edge → midpoint → child right edge.

  private curve(
    s: { y: number; x: number },
    t: { y: number; x: number },
  ): string {
    const sx = s.y - CW / 2;          // parent left edge
    const tx = t.y + CW / 2;          // child  right edge
    const mx = (sx + tx) / 2;
    return `M${sx},${s.x} C${mx},${s.x} ${mx},${t.x} ${tx},${t.x}`;
  }

  // ── Color helpers ─────────────────────────────────────────────────────────

  /** Term color from termColors map, or gold fallback. */
  private tc(d: any): string {
    const c = d.data?.term_id ? this.termColors[d.data.term_id] : null;
    return c ?? 'rgba(201,168,76,.78)';
  }

  private cardBg(d: any): string {
    const c = d.data?.term_id ? this.termColors[d.data.term_id] : null;
    if (c) return this.rgba(c, .10);
    return d.depth === 0 ? 'rgba(201,168,76,.07)' : 'rgba(18,23,52,.88)';
  }

  private cardBorder(d: any): string {
    const c = d.data?.term_id ? this.termColors[d.data.term_id] : null;
    if (c) return this.rgba(c, .36);
    return d.depth === 0 ? 'rgba(201,168,76,.36)' : 'rgba(255,255,255,.09)';
  }

  /** Convert #RRGGBB to rgba(r,g,b,a). Safe for all SVG attr values. */
  private rgba(hex: string, a: number): string {
    if (!hex?.startsWith('#')) return `rgba(128,128,128,${a})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  private clip(s: string, max: number): string {
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  // ── SVG defs — hover glow filter ──────────────────────────────────────────

  private addDefs(): void {
    const defs = this.svg.append('defs');
    const f = defs.append('filter')
      .attr('id',     'kss-glow')
      .attr('x',      '-28%').attr('y',      '-28%')
      .attr('width',  '156%').attr('height', '156%');
    f.append('feGaussianBlur')
      .attr('in', 'SourceAlpha').attr('stdDeviation', 8).attr('result', 'b');
    f.append('feFlood')
      .attr('flood-color', 'rgba(201,168,76,.55)').attr('result', 'c');
    f.append('feComposite')
      .attr('in', 'c').attr('in2', 'b').attr('operator', 'in').attr('result', 'g');
    const m = f.append('feMerge');
    m.append('feMergeNode').attr('in', 'g');
    m.append('feMergeNode').attr('in', 'SourceGraphic');
  }
}

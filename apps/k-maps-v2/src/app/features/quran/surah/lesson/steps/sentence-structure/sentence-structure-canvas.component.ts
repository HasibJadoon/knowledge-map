// ─────────────────────────────────────────────────────────────────────────────
//  SentenceStructureCanvasComponent
//  D3 top-down collapsible tree — card-based nodes, RTL, cinematic dark theme
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

const CW  = 182;   // card width
const CH  =  74;   // card height
const CR  =  10;   // corner radius
const AH  =   5;   // accent strip height (top edge, toward parent above)

// ── Tree spacing ──────────────────────────────────────────────────────────────
// nodeSize([x-separation, y-depth])
// x = horizontal sibling gap, y = vertical depth per level

const XSEP = 220;  // horizontal gap between node centres
const YDEP = 155;  // vertical depth per level

// ── Viewport margins ──────────────────────────────────────────────────────────

const MT = 40, MB = 56, ML = 40, MR = 40;

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector:        'km-sentence-structure-canvas',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None,
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
      display:       inline-flex;
      align-items:   center;
      gap:           .28rem;
      padding:       .22rem .58rem;
      border-radius: 999px;
      border:        1px solid transparent;
      transition:    filter .2s;
      cursor:        default;
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

  private wrap: any = null;
  private svg:  any = null;
  private gL:   any = null;   // link layer
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
    const host = this.wrap.append('div').attr('class', 'kss__svg-host');
    this.svg   = host.append('svg');
    this.addDefs();
    this.gL    = this.svg.append('g').attr('fill', 'none');
    this.gN    = this.svg.append('g');
  }

  // ── Build / rebuild ───────────────────────────────────────────────────────

  private build(): void {
    this.renderCard();
    this.gL.selectAll('*').remove();
    this.gN.selectAll('*').remove();
    this.root = null;

    if (!this.treeData) return;

    this.root = hierarchy(this.treeData);
    let uid   = 0;
    this.root.descendants().forEach((d: any) => {
      d.uid       = uid++;
      d._children = d.children ?? null;
      if (d.depth > 1) d.children = null;
    });
    this.root.x0 = 0;
    this.root.y0 = 0;

    this.refresh(null, this.root);
  }

  // ── D3 sentence card ──────────────────────────────────────────────────────

  private renderCard(): void {
    this.wrap.selectAll('.kss__card').remove();
    if (!this.treeData) return;

    const card = this.wrap.insert('div', '.kss__svg-host')
      .attr('class', 'kss__card');

    card.append('p')
      .attr('class', 'kss__sentence')
      .text(this.treeData.name);

    const kids = this.treeData.children ?? [];
    if (!kids.length) return;

    const row = card.append('div').attr('class', 'kss__chips');
    kids.forEach(ch => {
      const clr  = ch.term_id ? (this.termColors[ch.term_id] ?? '#888') : '#888';
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

  // ── Core update — Observable HQ pattern, top-down RTL ────────────────────

  private refresh(evt: MouseEvent | null, src: any): void {
    if (!this.svg || !this.root) return;

    const dur = evt?.altKey ? 1500 : 160;

    // Layout: nodeSize([x-gap, y-depth]) — top-down
    d3Tree<SsTreeNode>().nodeSize([XSEP, YDEP])(this.root);

    // RTL: negate x so first Arabic word lands on the right
    this.root.eachBefore((d: any) => { d.x = -d.x; });

    // Extents after RTL flip
    let x0 =  Infinity, x1 = -Infinity;
    let y0 =  Infinity, y1 = -Infinity;
    this.root.eachBefore((d: any) => {
      if (d.x < x0) x0 = d.x;  if (d.x > x1) x1 = d.x;
      if (d.y < y0) y0 = d.y;  if (d.y > y1) y1 = d.y;
    });

    // SVG viewport
    const vW = x1 - x0 + CW + ML + MR;
    const vH = y1 - y0 + CH + MT + MB;

    // Offsets: card centres land inside margins
    const ox = -x0 + ML + CW / 2;   // horizontal
    const oy = -y0 + MT + CH / 2;   // vertical

    this.wrap.select('.kss__svg-host').style('min-width', `${vW}px`);

    const T = this.svg.transition().duration(dur)
      .attr('width',   vW)
      .attr('height',  vH)
      .attr('viewBox', `0 0 ${vW} ${vH}`);

    const nodes = this.root.descendants().reverse() as any[];
    const links = this.root.links()                 as any[];

    // ── Nodes ──────────────────────────────────────────────────────────────

    const node = (this.gN as any)
      .selectAll('g.kss-n')
      .data(nodes, (d: any) => d.uid);

    // ENTER — collapse-in from source position
    const nEnter = node.enter().append('g')
      .attr('class',     'kss-n')
      .attr('cursor',    'pointer')
      .attr('transform', () => {
        const ix = (src.x0 ?? src.x) + ox;
        const iy = (src.y0 ?? src.y) + oy;
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
          .transition().duration(80)
          .attr('filter', 'url(#kss-glow)');
      })
      .on('mouseleave', (e: MouseEvent) => {
        select(e.currentTarget as SVGGElement)
          .select<SVGRectElement>('.kss-bg')
          .transition().duration(120)
          .attr('filter', null as any);
      });

    // Card background
    nEnter.append('rect').attr('class', 'kss-bg')
      .attr('x',      -CW / 2).attr('y', -CH / 2)
      .attr('width',  CW).attr('height', CH)
      .attr('rx', CR).attr('ry', CR)
      .attr('fill',         (d: any) => this.cardBg(d))
      .attr('stroke',       (d: any) => this.cardBorder(d))
      .attr('stroke-width', 1.5);

    // Top accent strip (parent connection side — link enters from above)
    nEnter.append('rect').attr('class', 'kss-ac')
      .attr('x',      -CW / 2 + CR)
      .attr('y',      -CH / 2)
      .attr('width',  CW - CR * 2)
      .attr('height', AH)
      .attr('rx', 2)
      .attr('fill', (d: any) => this.tc(d));

    // Bottom-center collapse dot (children expand downward)
    nEnter.append('circle').attr('class', 'kss-dot')
      .attr('cx', 0)
      .attr('cy', CH / 2 - 9)
      .attr('r',  4.5)
      .attr('fill',         (d: any) => (d._children && !d.children) ? this.tc(d) : 'none')
      .attr('stroke',       (d: any) =>  d._children                 ? this.tc(d) : 'none')
      .attr('stroke-width', 1.5);

    // Arabic name
    nEnter.append('text').attr('class', 'kss-name')
      .attr('text-anchor',       'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', (d: any) => d.data.label_ar ? -11 : 2)
      .attr('font-family', 'var(--km-font-arabic,"Scheherazade New",serif)')
      .attr('font-size',   (d: any) => d.depth === 0 ? 16 : 15)
      .attr('fill',             '#dce8ff')
      .attr('paint-order',      'stroke')
      .attr('stroke',           'rgba(8,12,28,.9)')
      .attr('stroke-width',     4)
      .attr('stroke-linejoin',  'round')
      .text((d: any) => this.clip(d.data.name, d.depth === 0 ? 26 : 18));

    // Grammar label
    nEnter.append('text').attr('class', 'kss-lbl')
      .attr('text-anchor',       'middle')
      .attr('dominant-baseline', 'middle')
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

    // UPDATE — transition to final positions
    const nUpdate = node.merge(nEnter).transition(T)
      .attr('transform', (d: any) => `translate(${d.x + ox},${d.y + oy})`)
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

    // EXIT — collapse back toward source
    node.exit().transition(T)
      .attr('transform', () => `translate(${src.x + ox},${src.y + oy})`)
      .attr('opacity', 0)
      .remove();

    // ── Links ──────────────────────────────────────────────────────────────

    const link = (this.gL as any)
      .selectAll('path.kss-l')
      .data(links, (d: any) => d.target.uid);

    const ip = { x: (src.x0 ?? src.x) + ox, y: (src.y0 ?? src.y) + oy };

    // ENTER — collapsed at source
    const lEnter = link.enter().append('path')
      .attr('class',          'kss-l')
      .attr('stroke',         (d: any) => this.tc(d.target))
      .attr('stroke-width',   1.8)
      .attr('stroke-opacity', .48)
      .attr('d', () => this.curve(ip, ip));

    // UPDATE
    (link.merge(lEnter) as any).transition(T)
      .attr('stroke', (d: any) => this.tc(d.target))
      .attr('d', (d: any) => this.curve(
        { x: d.source.x + ox, y: d.source.y + oy },
        { x: d.target.x + ox, y: d.target.y + oy },
      ));

    // EXIT
    link.exit().transition(T)
      .attr('d', () => {
        const p = { x: src.x + ox, y: src.y + oy };
        return this.curve(p, p);
      })
      .remove();

    // Stash
    this.root.eachBefore((d: any) => { d.x0 = d.x; d.y0 = d.y; });
  }

  // ── Cubic bezier: parent bottom-edge → child top-edge (top-down) ─────────

  private curve(
    s: { x: number; y: number },
    t: { x: number; y: number },
  ): string {
    const sy = s.y + CH / 2;         // parent bottom edge
    const ty = t.y - CH / 2;         // child  top edge
    const my = (sy + ty) / 2;
    return `M${s.x},${sy} C${s.x},${my} ${t.x},${my} ${t.x},${ty}`;
  }

  // ── Color helpers ─────────────────────────────────────────────────────────

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

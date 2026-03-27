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

const CW  = 190;   // card width
const CH  =  90;   // card height (taller to fit wrapped Arabic text)
const CR  =  10;   // corner radius
const AH  =   5;   // accent strip height (top edge, toward parent above)

// ── Tree spacing ──────────────────────────────────────────────────────────────
// nodeSize([x-separation, y-depth])
// x = horizontal sibling gap, y = vertical depth per level

const XSEP = 230;  // horizontal gap between node centres
const YDEP = 172;  // vertical depth per level

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
    /* min-height:100% lets content grow beyond the scroll-viewport  */
    /* so the parent overflow:auto container actually scrolls.       */
    km-sentence-structure-canvas {
      display:        flex;
      flex-direction: column;
      min-height:     100%;
      width:          100%;
    }
    .kss {
      display:        flex;
      flex-direction: column;
      flex:           1;           /* fills host height */
      min-height:     100%;        /* but at least as tall as scroll-viewport */
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
      margin-top:     0.5rem;   /* clear the fixed top bar */
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
      font-size:   1.05rem;
      color:       #dce8ff;
      line-height: 1.9;
    }

    .kss__chip-l {
      font-family: var(--km-font-arabic, "Scheherazade New", serif);
      font-size:   .82rem;
      opacity:     1;
      filter:      brightness(1.6) saturate(1.2);
    }

    /* ── SVG host — centres tree horizontally, parent scrolls ─ */
    .kss__svg-host {
      width:           100%;
      overflow:        visible;
      display:         flex;
      justify-content: center;
      align-items:     flex-start;
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

  private wrap:   any = null;
  private svg:    any = null;
  private gL:     any = null;   // link layer
  private gN:     any = null;   // node layer
  private root:   any = null;
  private obs:    ResizeObserver | null = null;
  private lastOx  = NaN;        // visual offset from previous layout (for exit targeting)
  private lastOy  = NaN;

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
      if (d.depth > 0) d.children = null;   // start fully collapsed
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
        .style('background',   this.rgba(clr, .18))
        .style('border-color', this.rgba(clr, .55));
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

    // Set min-width on the wrap div so the parent scroll container sees full width
    this.wrap.style('min-width', `${vW}px`);

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

    // Source's old visual position (stable reference for enter/exit animations).
    // On first build lastOx is NaN — fall back to src's final position in new layout.
    const srcOldX = isNaN(this.lastOx) ? src.x + ox : (src.x0 ?? src.x) + this.lastOx;
    const srcOldY = isNaN(this.lastOy) ? src.y + oy : (src.y0 ?? src.y) + this.lastOy;

    // ENTER — expand from source's old visual position
    const nEnter = node.enter().append('g')
      .attr('class',     'kss-n')
      .attr('cursor',    'pointer')
      .attr('transform', () => `translate(${srcOldX},${srcOldY})`)
      .attr('opacity', 0)
      .on('click', (e: MouseEvent, d: any) => {
        d.children = d.children ? null : d._children;
        this.refresh(e, d);
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
      .attr('cy', CH / 2 - 7)
      .attr('r',  4.5)
      .attr('fill',         (d: any) => (d._children && !d.children) ? this.tc(d) : 'none')
      .attr('stroke',       (d: any) =>  d._children                 ? this.tc(d) : 'none')
      .attr('stroke-width', 1.5);

    // Arabic name — word-wrapped, centred, explicit RTL direction
    nEnter.append('text').attr('class', 'kss-name')
      .attr('text-anchor',  'middle')
      .attr('direction',    'rtl')
      .attr('font-family',  'var(--km-font-arabic,"Scheherazade New",serif)')
      .attr('fill',             '#dce8ff')
      .attr('paint-order',      'stroke')
      .attr('stroke',           'rgba(8,12,28,.9)')
      .attr('stroke-width',     4)
      .attr('stroke-linejoin',  'round')
      .each(function(this: SVGTextElement, d: any) {
        const name: string = d.data.name;
        const fs: number   = d.depth === 0 ? 14 : 13;
        const hasLbl = !!d.data.label_ar;

        // Strip Arabic diacritics before measuring so harakat don't inflate char count
        const baseLen = (s: string) => [...s].filter(c => {
          const cp = c.codePointAt(0)!;
          return !((cp >= 0x064B && cp <= 0x065F) || (cp >= 0x0610 && cp <= 0x061A));
        }).length;
        const maxCh = Math.floor((CW - 20) / (fs * 0.62));

        // Build first line only — stop as soon as adding the next word would overflow
        const words = name.split(' ');
        let line = '';
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (baseLen(test) > maxCh && line) break;
          line = test;
        }
        // Ellipsis right after last visible word — no leading space so BiDi keeps it adjacent
        const display = line.length < name.length ? line + '...' : line;

        const areaTop = -CH / 2 + AH + 4;
        const areaBot = hasLbl ? CH / 2 - 36 : CH / 2 - 8;
        const midY    = (areaTop + areaBot) / 2;

        const el = select(this).attr('font-size', fs);
        el.append('tspan').attr('x', 0).attr('y', midY).text(display);
      });

    // Grammar label (SVG text, bottom of card)
    // Fill uses a bright light-blue (#dce8ff) so it's always readable on
    // dark cards regardless of the term accent color.
    nEnter.append('text').attr('class', 'kss-lbl')
      .attr('text-anchor',       'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y',  CH / 2 - 24)
      .attr('font-family', 'var(--km-font-arabic,"Scheherazade New",serif)')
      .attr('font-size',   13)
      .attr('fill',        '#dce8ff')
      .attr('opacity',     1)
      .attr('paint-order',     'stroke')
      .attr('stroke',          'rgba(8,12,28,.9)')
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
    // kss-lbl fill is fixed to #dce8ff (set on enter) — no update needed

    // EXIT — collapse back to source's old visual position (not re-layout position)
    node.exit().transition(T)
      .attr('transform', () => `translate(${srcOldX},${srcOldY})`)
      .attr('opacity', 0)
      .remove();

    // ── Links ──────────────────────────────────────────────────────────────

    const link = (this.gL as any)
      .selectAll('path.kss-l')
      .data(links, (d: any) => d.target.uid);

    const ip = { x: srcOldX, y: srcOldY };

    // ENTER — collapsed at source's old visual position
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

    // EXIT — collapse to source's old visual position
    link.exit().transition(T)
      .attr('d', () => this.curve(ip, ip))
      .remove();

    // Stash positions + offsets for next refresh
    this.root.eachBefore((d: any) => { d.x0 = d.x; d.y0 = d.y; });
    this.lastOx = ox;
    this.lastOy = oy;

    // Scroll parent to top-right so root node is visible (RTL: root is rightmost)
    const scrollEl = this.wrapRef.nativeElement.parentElement?.parentElement as HTMLElement | null;
    if (scrollEl && !evt) {
      scrollEl.scrollTop  = 0;
      scrollEl.scrollLeft = scrollEl.scrollWidth;
    }
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
    return c ?? 'rgba(201,168,76,.92)';
  }

  private cardBg(d: any): string {
    const c = d.data?.term_id ? this.termColors[d.data.term_id] : null;
    if (c) return this.rgba(c, .18);
    return d.depth === 0 ? 'rgba(201,168,76,.13)' : 'rgba(14,18,42,.95)';
  }

  private cardBorder(d: any): string {
    const c = d.data?.term_id ? this.termColors[d.data.term_id] : null;
    if (c) return this.rgba(c, .55);
    return d.depth === 0 ? 'rgba(201,168,76,.55)' : 'rgba(255,255,255,.16)';
  }

  private rgba(hex: string, a: number): string {
    if (!hex?.startsWith('#')) return `rgba(128,128,128,${a})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SentenceStructureCanvasComponent
//  D3 top-down collapsible tree — card-based nodes, RTL, cinematic dark theme
//
//  UX features:
//   • ✏ icon on hover → inline edit node text → commit to DB
//   • 📝 icon on hover → add note → saved to ar_notes + ar_note_targets
//       extra_json stores { task_id, step_no, node_depth, node_name }
//   • Top sentence card has matching edit + note buttons
//   • Swipe navigation handled by the parent step component
// ─────────────────────────────────────────────────────────────────────────────

import {
  AfterViewInit, ChangeDetectionStrategy, Component,
  ElementRef, EventEmitter, inject, Input, NgZone, OnChanges,
  OnDestroy, Output, SimpleChanges, ViewChild, ViewEncapsulation,
} from '@angular/core';
import { hierarchy, tree as d3Tree } from 'd3-hierarchy';
import { select }                     from 'd3-selection';
import 'd3-transition';
import {
  SurahModulesService,
} from '../../../../../../shared/services/surah-modules.service';

// ── Public types ──────────────────────────────────────────────────────────────

export interface SsTreeNode {
  name:      string;
  id?:       string;
  term_id?:  string;
  label_ar?: string;
  children?: SsTreeNode[];
}

/** Metadata passed in from the step component for API calls */
export interface SsLessonMeta {
  lessonId:     number;
  taskId:       string;
  /** ID of the specific child task for this sentence (multi-sentence lessons) */
  childTaskId?: string;
  stepNo:       number;
  unitId:       string;
  containerId:  string;
}

// ── Card geometry ─────────────────────────────────────────────────────────────

const CW   = 220;   // card width
const CH   = 116;   // card height
const CR   =   0;   // corner radius
const AH   =   5;   // accent strip height
const XSEP = 270;   // horizontal gap between nodes
const YDEP = 210;   // vertical depth per level
const MT = 24, MB = 32, ML = 8, MR = 8;

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector:        'km-sentence-structure-canvas',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation:   ViewEncapsulation.None,
  template:        `<div #wrap class="kss"></div>`,
  styles: [`

    km-sentence-structure-canvas {
      display: flex; flex-direction: column;
      min-height: 100%; width: 100%;
    }
    .kss {
      display: flex; flex-direction: column;
      flex: 1; min-height: 100%;
      gap: .72rem; width: 100%;
    }

    /* ── Top sentence card ──────────────────────────────────── */
    .kss__card {
      position: relative;
      background:
        linear-gradient(180deg, rgba(22,18,16,.88) 0%, rgba(13,11,10,.96) 100%);
      border: 1px solid rgba(201,155,84,.16);
      border-radius: 0;
      padding: .85rem 1rem .78rem;
      display: flex; flex-direction: column; gap: .7rem;
    }
    .kss__card::before {
      content: '';
      position: absolute;
      inset: 0 auto auto 0;
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, rgba(226,196,141,.42), rgba(226,196,141,.08) 52%, transparent 86%);
      pointer-events: none;
    }
    .kss__card-actions {
      position: absolute; top: .48rem; right: .55rem;
      display: flex; gap: .28rem;
    }
    .kss__card-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 1.5rem; height: 1.5rem;
      background: rgba(201,168,76,.08);
      border: 1px solid rgba(201,168,76,.2);
      border-radius: 4px;
      cursor: pointer; font-size: .72rem; line-height: 1;
      transition: color .15s, background .15s, border-color .15s;
    }
    .kss__card-btn--edit { color: rgba(201,168,76,.6); }
    .kss__card-btn--note { color: rgba(120,180,255,.6); }
    .kss__card-btn:hover {
      background: rgba(201,168,76,.16);
      border-color: rgba(201,168,76,.55);
      color: #fff;
    }

    .kss__sentence {
      margin: 0; padding-right: 3.5rem; /* space for action buttons */
      font-family: var(--km-font-arabic,"Scheherazade New",serif);
      font-size: 1.78rem; line-height: 1.86;
      color: #dce8ff; text-align: center;
      direction: rtl; letter-spacing: 0;
      border-radius: 4px; transition: outline .15s;
    }
    .kss__sentence[contenteditable="true"] {
      outline: 2px solid rgba(201,168,76,.65);
      padding: .05em .3em; cursor: text;
    }

    .kss__chips {
      display: flex; flex-wrap: wrap; gap: .34rem;
      justify-content: center; direction: rtl;
    }
    .kss__chip {
      display: inline-flex; align-items: center; gap: .28rem;
      padding: .2rem .56rem; border-radius: 999px;
      border: 1px solid transparent; transition: filter .2s; cursor: default;
    }
    .kss__chip:hover { filter: brightness(1.2); }
    .kss__chip-w {
      font-family: var(--km-font-arabic,"Scheherazade New",serif);
      font-size: 1.14rem; color: #dce8ff; line-height: 1.58;
    }
    .kss__chip-l {
      font-family: var(--km-font-arabic,"Scheherazade New",serif);
      font-size: .88rem;
      filter: brightness(1.8) saturate(1.4);
      text-shadow: 0 0 6px currentColor, 0 0 12px currentColor, 0 0 22px currentColor;
    }

    /* ── SVG grammar label neon glow ─────────────────────────── */
    .kss-lbl {
      filter: drop-shadow(0 1px 0 rgba(0,0,0,.96))
              drop-shadow(0 0 2px rgba(0,0,0,.88))
              drop-shadow(0 0 6px rgba(82,42,0,.72))
              drop-shadow(0 0 12px rgba(155,91,0,.32));
    }

    /* ── SVG action icons (edit ✏ + note 📝) ────────────────── */
    .kss-actions { opacity: 0; transition: opacity .18s; }
    .kss-n:hover .kss-actions { opacity: 1; }

    /* ── SVG host ─────────────────────────────────────────────── */
    .kss__svg-host {
      width: 100%; overflow: visible;
      display: flex;
      justify-content: center;
    }
    .kss__svg-host svg {
      display: block;
      flex: 0 0 auto;
      overflow: visible;
      user-select: none;
    }

  `],
})
export class SentenceStructureCanvasComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input()  treeData:   SsTreeNode | null      = null;
  @Input()  termColors: Record<string, string> = {};
  /** Pass lesson context so the canvas can call the API directly */
  @Input()  lessonMeta: SsLessonMeta | null    = null;

  /** Emitted after a successful node-text edit (updated tree root) */
  @Output() treeDataChange = new EventEmitter<SsTreeNode>();

  @ViewChild('wrap') private wrapRef!: ElementRef<HTMLDivElement>;

  private readonly zone    = inject(NgZone);
  private readonly svc     = inject(SurahModulesService);

  private wrap:           any = null;
  private svg:            any = null;
  private gL:             any = null;
  private gN:             any = null;
  private root:           any = null;
  private obs:            ResizeObserver | null = null;
  private lastOx         = NaN;
  private lastOy         = NaN;
  /** True while a user-triggered D3 transition is running.
   *  Prevents the ResizeObserver from firing a scroll-inducing refresh
   *  mid-animation (the source of the "scroll jumps on expand/collapse" bug). */
  private isTransitioning = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.wrap = select(this.wrapRef.nativeElement);
      this.mountSvg();
      this.obs = new ResizeObserver(() => {
        // Skip if a user-click transition is already running — it will
        // resize the SVG itself and re-trigger the observer; calling refresh
        // again here would cause the auto-scroll to fire mid-animation.
        if (this.root && !this.isTransitioning) this.refresh(null, this.root);
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

  // ── Mount SVG ─────────────────────────────────────────────────────────────

  private mountSvg(): void {
    this.wrap.selectAll('.kss__svg-host').remove();
    const host = this.wrap.append('div').attr('class', 'kss__svg-host');
    this.svg   = host.append('svg');
    this.gL    = this.svg.append('g').attr('fill', 'none');
    this.gN    = this.svg.append('g');
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private build(): void {
    this.renderCard();
    this.gL.selectAll('*').remove();
    this.gN.selectAll('*').remove();
    this.root = null;

    if (!this.treeData) return;

    this.root = hierarchy(this.treeData);
    let uid = 0;
    this.root.descendants().forEach((d: any) => {
      d.uid       = uid++;
      d._children = d.children ?? null;
      if (d.depth > 0) d.children = null;
    });
    this.root.x0 = 0;
    this.root.y0 = 0;
    this.refresh(null, this.root);
  }

  // ── Top sentence card ─────────────────────────────────────────────────────

  private renderCard(): void {
    this.wrap.selectAll('.kss__card').remove();
    if (!this.treeData) return;

    const treeData = this.treeData;
    const card     = this.wrap.insert('div', '.kss__svg-host').attr('class', 'kss__card');

    // Sentence text
    const sentenceEl = card.append('p')
      .attr('class', 'kss__sentence')
      .text(treeData.name);

    // Action buttons (top-right)
    const actions = card.append('div').attr('class', 'kss__card-actions');

    // ✏ Edit button
    actions.append('button')
      .attr('class', 'kss__card-btn kss__card-btn--edit')
      .attr('title', 'Edit sentence text')
      .text('✏')
      .on('click', (e: MouseEvent) => {
        e.stopPropagation();
        this.startHtmlEdit(sentenceEl, treeData, /* isRoot */ true);
      });

    // 📝 Note button
    actions.append('button')
      .attr('class', 'kss__card-btn kss__card-btn--note')
      .attr('title', 'Add note to this sentence')
      .text('📝')
      .on('click', (e: MouseEvent) => {
        e.stopPropagation();
        this.startHtmlNote(card, treeData, /* depth */ 0);
      });

    // Chips row
    const kids = treeData.children ?? [];
    if (!kids.length) return;
    const row = card.append('div').attr('class', 'kss__chips');
    kids.forEach(ch => {
      const clr  = ch.term_id ? (this.termColors[ch.term_id] ?? '#888') : '#888';
      const chip = row.append('span')
        .attr('class', 'kss__chip')
        .style('background',   this.rgba(clr, .18))
        .style('border-color', this.rgba(clr, .55));
      chip.append('span').attr('class', 'kss__chip-w').text(ch.name);
      if (ch.label_ar)
        chip.append('span').attr('class', 'kss__chip-l').style('color', clr).text(ch.label_ar);
    });
  }

  // ── Core D3 update ────────────────────────────────────────────────────────

  private refresh(evt: MouseEvent | null, src: any): void {
    if (!this.svg || !this.root) return;

    const dur = evt?.altKey ? 1500 : 160;

    // Mark that a user-triggered transition is running so the ResizeObserver
    // doesn't fire a competing refresh (which would jump the scroll position).
    if (evt) {
      this.isTransitioning = true;
      setTimeout(() => { this.isTransitioning = false; }, dur + 100);
    }
    d3Tree<SsTreeNode>().nodeSize([XSEP, YDEP])(this.root);
    this.root.eachBefore((d: any) => { d.x = -d.x; });   // RTL flip

    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    this.root.eachBefore((d: any) => {
      if (d.x < x0) x0 = d.x;  if (d.x > x1) x1 = d.x;
      if (d.y < y0) y0 = d.y;  if (d.y > y1) y1 = d.y;
    });

    const vW = x1 - x0 + CW + ML + MR;
    const vH = y1 - y0 + CH + MT + MB;
    const ox  = -x0 + ML + CW / 2;
    const oy  = -y0 + MT + CH / 2;

    this.wrap.style('min-width', `${vW}px`);

    const T = this.svg.transition().duration(dur)
      .attr('width', vW).attr('height', vH)
      .attr('viewBox', `0 0 ${vW} ${vH}`);

    const nodes = this.root.descendants().reverse() as any[];
    const links = this.root.links()                 as any[];

    // ── Nodes ──────────────────────────────────────────────────────────────

    const node    = (this.gN as any).selectAll('g.kss-n').data(nodes, (d: any) => d.uid);
    const srcOldX = isNaN(this.lastOx) ? src.x + ox : (src.x0 ?? src.x) + this.lastOx;
    const srcOldY = isNaN(this.lastOy) ? src.y + oy : (src.y0 ?? src.y) + this.lastOy;

    const nEnter = node.enter().append('g')
      .attr('class', 'kss-n')
      .attr('cursor', 'pointer')
      .attr('transform', () => `translate(${srcOldX},${srcOldY})`)
      .attr('opacity', 0)
      // Expand/collapse — skip if action icons were clicked
      .on('click', (e: MouseEvent, d: any) => {
        if ((e.target as Element).closest('.kss-actions')) return;
        d.children = d.children ? null : d._children;
        this.refresh(e, d);
      });

    // Card background
    nEnter.append('rect').attr('class', 'kss-bg')
      .attr('x', -CW/2).attr('y', -CH/2)
      .attr('width', CW).attr('height', CH)
      .attr('rx', CR).attr('ry', CR)
      .attr('fill',         (d: any) => this.cardBg(d))
      .attr('stroke',       (d: any) => this.cardBorder(d))
      .attr('stroke-width', 1.5);

    // Top accent strip
    nEnter.append('rect').attr('class', 'kss-ac')
      .attr('x', -CW/2 + CR).attr('y', -CH/2)
      .attr('width', CW - CR*2).attr('height', AH)
      .attr('rx', 2).attr('fill', (d: any) => this.tc(d));

    // Collapse dot
    nEnter.append('circle').attr('class', 'kss-dot')
      .attr('cx', 0).attr('cy', CH/2 - 7).attr('r', 4.5)
      .attr('fill',   (d: any) => (d._children && !d.children) ? this.tc(d) : 'none')
      .attr('stroke', (d: any) =>  d._children                 ? this.tc(d) : 'none')
      .attr('stroke-width', 1.5);

    // Arabic name text
    nEnter.append('text').attr('class', 'kss-name')
      .attr('text-anchor', 'middle').attr('direction', 'rtl')
      .attr('font-family', 'var(--km-font-arabic,"Scheherazade New",serif)')
      .attr('fill', '#ffffff')
      .attr('paint-order', 'stroke')
      .attr('stroke', 'rgba(0,0,0,1)').attr('stroke-width', 5)
      .attr('stroke-linejoin', 'round')
      .each(function(this: SVGTextElement, d: any) {
        const name = d.data.name as string;
        const fs   = d.depth === 0 ? 17 : 16;
        const hasLbl = !!d.data.label_ar;
        const baseLen = (s: string) => [...s].filter(c => {
          const cp = c.codePointAt(0)!;
          return !((cp >= 0x064B && cp <= 0x065F) || (cp >= 0x0610 && cp <= 0x061A));
        }).length;
        const maxCh = Math.floor((CW - 20) / (fs * 0.62));
        const words = name.split(' ');
        let line = '';
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (baseLen(test) > maxCh && line) break;
          line = test;
        }
        const display = line.length < name.length ? line + '...' : line;
        const areaTop = -CH/2 + AH + 4;
        const areaBot = hasLbl ? CH/2 - 40 : CH/2 - 8;
        select(this).attr('font-size', fs)
          .append('tspan').attr('x', 0).attr('y', (areaTop + areaBot) / 2).text(display);
      });

    // Grammar label (gold neon)
    nEnter.append('text').attr('class', 'kss-lbl')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('y', CH/2 - 26)
      .attr('font-family', 'var(--km-font-arabic,"Scheherazade New",serif)')
      .attr('font-size', 16).attr('fill', '#f0c94a')
      .attr('paint-order', 'stroke').attr('stroke', 'rgba(0,0,0,1)')
      .attr('stroke-width', 5.8).attr('stroke-linejoin', 'round')
      .text((d: any) => d.data.label_ar ?? '');

    // ── Action icons group (visible on hover) ───────────────────────────────
    // Positioned top-right of each card
    // [ 📝 note ] [ ✏ edit ]   ← right to left because RTL card
    const actGrp = nEnter.append('g').attr('class', 'kss-actions');

    // ✏ Edit icon (rightmost)
    const editBtn = actGrp.append('g')
      .attr('class', 'kss-act-edit')
      .attr('transform', `translate(${CW/2 - 16}, ${-CH/2 + 16})`)
      .attr('cursor', 'pointer');
    editBtn.append('circle').attr('r', 10)
      .attr('fill', 'rgba(0,0,0,.6)')
      .attr('stroke', 'rgba(201,168,76,.5)').attr('stroke-width', 1);
    editBtn.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', 11).attr('fill', 'rgba(201,168,76,.9)')
      .attr('font-family', 'system-ui,sans-serif').text('✏');
    editBtn.on('click', (e: MouseEvent, d: any) => {
      e.stopPropagation();
      const nodeGrp = select((e.currentTarget as Element).parentNode!.parentNode as SVGGElement);
      this.startSvgNodeEdit(nodeGrp, d);
    });

    // 📝 Note icon (left of edit)
    const noteBtn = actGrp.append('g')
      .attr('class', 'kss-act-note')
      .attr('transform', `translate(${CW/2 - 40}, ${-CH/2 + 16})`)
      .attr('cursor', 'pointer');
    noteBtn.append('circle').attr('r', 10)
      .attr('fill', 'rgba(0,0,0,.6)')
      .attr('stroke', 'rgba(120,180,255,.45)').attr('stroke-width', 1);
    noteBtn.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', 10).attr('fill', 'rgba(140,200,255,.9)')
      .attr('font-family', 'system-ui,sans-serif').text('📝');
    noteBtn.on('click', (e: MouseEvent, d: any) => {
      e.stopPropagation();
      const nodeGrp = select((e.currentTarget as Element).parentNode!.parentNode as SVGGElement);
      this.startSvgNodeNote(nodeGrp, d);
    });

    // UPDATE
    const nUpdate = node.merge(nEnter).transition(T)
      .attr('transform', (d: any) => `translate(${d.x + ox},${d.y + oy})`)
      .attr('opacity', 1);
    nUpdate.select('.kss-bg')
      .attr('fill',   (d: any) => this.cardBg(d))
      .attr('stroke', (d: any) => this.cardBorder(d));
    nUpdate.select('.kss-ac').attr('fill', (d: any) => this.tc(d));
    nUpdate.select('.kss-dot')
      .attr('fill',   (d: any) => (d._children && !d.children) ? this.tc(d) : 'none')
      .attr('stroke', (d: any) =>  d._children ? this.tc(d) : 'none');

    // EXIT
    node.exit().transition(T)
      .attr('transform', () => `translate(${srcOldX},${srcOldY})`)
      .attr('opacity', 0).remove();

    // ── Links ──────────────────────────────────────────────────────────────

    const link    = (this.gL as any).selectAll('path.kss-l').data(links, (d: any) => d.target.uid);
    const ip      = { x: srcOldX, y: srcOldY };
    const lEnter  = link.enter().append('path')
      .attr('class', 'kss-l')
      .attr('stroke',         (d: any) => this.tc(d.target))
      .attr('stroke-width',   1.8)
      .attr('stroke-opacity', .48)
      .attr('d', () => this.curve(ip, ip));
    (link.merge(lEnter) as any).transition(T)
      .attr('stroke', (d: any) => this.tc(d.target))
      .attr('d', (d: any) => this.curve(
        { x: d.source.x + ox, y: d.source.y + oy },
        { x: d.target.x + ox, y: d.target.y + oy },
      ));
    link.exit().transition(T).attr('d', () => this.curve(ip, ip)).remove();

    this.root.eachBefore((d: any) => { d.x0 = d.x; d.y0 = d.y; });
    this.lastOx = ox;
    this.lastOy = oy;

    const scrollEl = this.wrapRef.nativeElement.closest('.sst__canvas') as HTMLElement | null;
    if (scrollEl && !evt) {
      scrollEl.scrollTop  = 0;
      scrollEl.scrollLeft = Math.max((scrollEl.scrollWidth - scrollEl.clientWidth) / 2, 0);
    }
  }

  // ── HTML edit (top sentence card) ─────────────────────────────────────────

  private startHtmlEdit(sentenceEl: any, treeData: SsTreeNode, _isRoot: boolean): void {
    const pEl = sentenceEl.node() as HTMLElement;
    const orig = pEl.textContent ?? '';

    sentenceEl.attr('contenteditable', 'true');
    pEl.focus();
    const range = document.createRange();
    range.selectNodeContents(pEl);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    const commit = () => {
      const newText = pEl.textContent?.trim() ?? '';
      sentenceEl.attr('contenteditable', null);
      sentenceEl.on('blur.edit', null).on('keydown.edit', null);
      if (newText && newText !== orig) {
        treeData.name = newText;
        this.saveTreeToDb();
        this.zone.run(() => this.treeDataChange.emit(treeData));
      } else if (!newText) {
        pEl.textContent = orig;
      }
    };

    sentenceEl.on('blur.edit', commit);
    sentenceEl.on('keydown.edit', (evt: KeyboardEvent) => {
      if (evt.key === 'Enter')  { evt.preventDefault(); pEl.blur(); }
      if (evt.key === 'Escape') { pEl.textContent = orig; pEl.blur(); }
    });
  }

  // ── HTML note panel (top sentence card) ──────────────────────────────────

  private startHtmlNote(card: any, treeData: SsTreeNode, depth: number): void {
    card.selectAll('.kss__note-panel').remove();

    const nodeId     = treeData.id ?? treeData.term_id ?? treeData.name;
    const targetId   = `sentence:${nodeId}`;
    const targetType = 'ss_sentence';

    const panelEl = card.append('div').attr('class', 'kss__note-panel');
    const pEl = panelEl.node() as HTMLElement;
    Object.assign(pEl.style, {
      marginTop: '.6rem',
      border: '1px solid rgba(120,180,255,.25)',
      borderRadius: '8px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    });

    // ── Header row ────────────────────────────────────────────────────────
    const headerEl = document.createElement('div');
    Object.assign(headerEl.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '5px 10px',
      background: 'rgba(120,180,255,.08)',
      borderBottom: '1px solid rgba(120,180,255,.15)',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
      fontSize: '11px', color: 'rgba(140,200,255,.8)',
    });
    headerEl.innerHTML = '<span>📝 Notes</span>';
    const closeH = document.createElement('button');
    closeH.textContent = '✕';
    Object.assign(closeH.style, {
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'rgba(255,255,255,.4)', fontSize: '12px', padding: '0',
    });
    closeH.addEventListener('click', () => card.selectAll('.kss__note-panel').remove());
    headerEl.appendChild(closeH);
    pEl.appendChild(headerEl);

    // ── Notes list (scrollable) ───────────────────────────────────────────
    const listEl = document.createElement('div');
    Object.assign(listEl.style, {
      maxHeight: '160px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: '0',
      background: 'rgba(5,8,24,.6)',
    });
    const loadEl = document.createElement('div');
    loadEl.textContent = 'Loading notes…';
    Object.assign(loadEl.style, {
      padding: '8px 10px', fontSize: '11px',
      color: 'rgba(255,255,255,.25)',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
      textAlign: 'center',
    });
    listEl.appendChild(loadEl);
    pEl.appendChild(listEl);

    // ── New-note form ─────────────────────────────────────────────────────
    const formEl = document.createElement('div');
    Object.assign(formEl.style, {
      display: 'flex', flexDirection: 'column', gap: '5px',
      padding: '7px 8px',
      borderTop: '1px solid rgba(120,180,255,.12)',
      background: 'rgba(5,8,30,.85)',
    });
    const taEl = document.createElement('textarea');
    taEl.placeholder = 'Add a note…'; taEl.rows = 2;
    Object.assign(taEl.style, {
      width: '100%', resize: 'none', boxSizing: 'border-box',
      background: 'rgba(255,255,255,.05)', border: '1px solid rgba(120,180,255,.3)',
      borderRadius: '5px', color: '#dce8ff',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
      fontSize: '12px', padding: '5px 8px', outline: 'none',
    });
    const rowEl = document.createElement('div');
    Object.assign(rowEl.style, { display: 'flex', gap: '5px', justifyContent: 'flex-end' });
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save';
    Object.assign(saveBtn.style, {
      background: 'rgba(120,180,255,.2)', border: '1px solid rgba(120,180,255,.4)',
      borderRadius: '5px', color: 'rgba(180,220,255,.9)',
      fontSize: '11px', padding: '3px 10px', cursor: 'pointer',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
    });
    rowEl.appendChild(saveBtn);
    formEl.appendChild(taEl);
    formEl.appendChild(rowEl);
    pEl.appendChild(formEl);

    requestAnimationFrame(() => taEl.focus());

    // ── Fetch & render existing notes ─────────────────────────────────────
    const renderNotes = (notes: any[]) => {
      listEl.innerHTML = '';
      if (!notes.length) {
        const empty = document.createElement('div');
        empty.textContent = 'No notes yet — be the first!';
        Object.assign(empty.style, {
          padding: '8px 10px', fontSize: '11px', textAlign: 'center',
          color: 'rgba(255,255,255,.22)',
          fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
        });
        listEl.appendChild(empty);
        return;
      }
      notes.forEach(n => listEl.appendChild(this.buildNoteItem(n.excerpt, n.created_at)));
    };

    this.zone.run(() => {
      this.svc.getNodeNotes(targetType, targetId, this.lessonMeta?.taskId).subscribe({
        next:  (res) => renderNotes(res.notes ?? []),
        error: ()    => { loadEl.textContent = 'Could not load notes.'; },
      });
    });

    // ── Save new note ─────────────────────────────────────────────────────
    saveBtn.addEventListener('click', () => {
      const text = taEl.value.trim();
      if (!text) return;
      this.submitNote(text, targetType, targetId, depth, treeData.name);
      taEl.value = '';
      listEl.appendChild(this.buildNoteItem(text, new Date().toISOString()));
      listEl.scrollTop = listEl.scrollHeight;
    });
  }

  // ── SVG node edit (foreignObject) — edits BOTH name + label_ar ──────────

  private startSvgNodeEdit(g: any, d: any): void {
    g.select('.kss-name').attr('visibility', 'hidden');
    g.select('.kss-lbl') .attr('visibility', 'hidden');
    g.select('.kss-actions').attr('visibility', 'hidden');
    g.select('.kss-bg').attr('stroke', 'rgba(201,168,76,.9)').attr('stroke-width', 2);

    // Panel is tall enough for two inputs + commit row (overflows card bottom — fine)
    const panelH = 130;
    const fo = g.append('foreignObject')
      .attr('x', -(CW / 2) + 6)
      .attr('y', -(CH / 2) + AH + 4)
      .attr('width',  CW - 12)
      .attr('height', panelH);

    /* ── shared input style helper ─────────────────────────────────────── */
    const applyInputStyle = (el: HTMLInputElement, isFirst: boolean) => {
      Object.assign(el.style, {
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(5,8,24,.95)',
        border:       '1.5px solid rgba(201,168,76,.6)',
        borderBottom: isFirst ? '1px solid rgba(201,168,76,.25)' : '1.5px solid rgba(201,168,76,.6)',
        borderRadius: isFirst ? '6px 6px 0 0' : '0',
        color: '#fff',
        fontFamily: 'var(--km-font-arabic,"Scheherazade New",serif)',
        fontSize: '14px', textAlign: 'center', direction: 'rtl',
        outline: 'none', padding: '5px 8px',
      });
    };

    /* ── build DOM ─────────────────────────────────────────────────────── */
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, { display: 'flex', flexDirection: 'column' });

    // Row label helper
    const makeLabel = (text: string) => {
      const lbl = document.createElement('div');
      lbl.textContent = text;
      Object.assign(lbl.style, {
        fontSize: '9px', color: 'rgba(201,168,76,.55)',
        fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
        padding: '2px 6px 0',
        background: 'rgba(5,8,24,.95)',
        borderLeft: '1.5px solid rgba(201,168,76,.6)',
        borderRight: '1.5px solid rgba(201,168,76,.6)',
        textAlign: 'right', direction: 'rtl',
      });
      return lbl;
    };

    // ── Field 1: Arabic text (name) ─────────────────────────────────────
    const nameLabel = makeLabel('الكلمة / النص');
    const nameInput = document.createElement('input');
    nameInput.type  = 'text';
    nameInput.value = d.data.name ?? '';
    nameInput.placeholder = 'النص العربي…';
    applyInputStyle(nameInput, true);

    // ── Field 2: Grammar tag (label_ar) ────────────────────────────────
    const lblLabel  = makeLabel('الإعراب / الوظيفة');
    const lblInput  = document.createElement('input');
    lblInput.type   = 'text';
    lblInput.value  = d.data.label_ar ?? '';
    lblInput.placeholder = 'e.g. جملة شرطية…';
    applyInputStyle(lblInput, false);
    Object.assign(lblInput.style, {
      borderRadius: '0',
      color: '#FFD700',   // gold — matches the grammar label colour
    });

    // ── Commit / Cancel row ─────────────────────────────────────────────
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, {
      display: 'flex', width: '100%',
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕';
    Object.assign(cancelBtn.style, {
      flex: '1', height: '26px', boxSizing: 'border-box',
      background: 'rgba(255,255,255,.04)',
      border: '1.5px solid rgba(201,168,76,.4)',
      borderTop: 'none', borderRight: 'none',
      borderRadius: '0 0 0 6px',
      color: 'rgba(255,255,255,.4)',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
      fontSize: '12px', cursor: 'pointer', outline: 'none',
    });

    const commitBtn = document.createElement('button');
    commitBtn.textContent = '✓ حفظ';
    Object.assign(commitBtn.style, {
      flex: '2', height: '26px', boxSizing: 'border-box',
      background: 'rgba(201,168,76,.18)',
      border: '1.5px solid rgba(201,168,76,.55)',
      borderTop: 'none',
      borderRadius: '0 0 6px 0',
      color: 'rgba(201,168,76,.9)',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
      fontSize: '11px', cursor: 'pointer', outline: 'none',
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(commitBtn);

    wrapper.appendChild(nameLabel);
    wrapper.appendChild(nameInput);
    wrapper.appendChild(lblLabel);
    wrapper.appendChild(lblInput);
    wrapper.appendChild(btnRow);
    fo.node()!.appendChild(wrapper);

    requestAnimationFrame(() => { nameInput.focus(); nameInput.select(); });

    /* ── restore helpers ───────────────────────────────────────────────── */
    const restore = () => {
      fo.remove();
      g.select('.kss-name').attr('visibility', null);
      g.select('.kss-lbl') .attr('visibility', null);
      g.select('.kss-actions').attr('visibility', null);
      g.select('.kss-bg').attr('stroke', this.cardBorder(d)).attr('stroke-width', 1.5);
    };

    const commit = (cancel = false) => {
      const newName = cancel ? d.data.name    : (nameInput.value.trim() || d.data.name);
      const newLbl  = cancel ? d.data.label_ar : lblInput.value.trim();
      restore();

      if (!cancel) {
        let changed = false;

        // Update name
        if (newName !== d.data.name) {
          d.data.name = newName;
          const fs      = d.depth === 0 ? 17 : 16;
          const baseLen = (s: string) => [...s].filter(c => {
            const cp = c.codePointAt(0)!;
            return !((cp >= 0x064B && cp <= 0x065F) || (cp >= 0x0610 && cp <= 0x061A));
          }).length;
          const maxCh = Math.floor((CW - 20) / (fs * 0.62));
          const words = newName.split(' ');
          let line = '';
          for (const w of words) {
            const test = line ? line + ' ' + w : w;
            if (baseLen(test) > maxCh && line) break;
            line = test;
          }
          const display = line.length < newName.length ? line + '...' : line;
          (g.select('.kss-name') as any).select('tspan').text(display);
          changed = true;
        }

        // Update grammar tag
        const prevLbl = d.data.label_ar ?? '';
        if (newLbl !== prevLbl) {
          d.data.label_ar = newLbl || undefined;
          (g.select('.kss-lbl') as any).text(newLbl);
          changed = true;
        }

        if (changed) {
          this.saveTreeToDb();
          this.zone.run(() => this.treeDataChange.emit(this.treeData!));
        }
      }
    };

    // Tab between fields
    nameInput.addEventListener('keydown', (evt: KeyboardEvent) => {
      evt.stopPropagation();
      if (evt.key === 'Tab')    { evt.preventDefault(); lblInput.focus(); lblInput.select(); }
      if (evt.key === 'Enter')  { evt.preventDefault(); commit(false); }
      if (evt.key === 'Escape') { commit(true); }
    });
    lblInput.addEventListener('keydown', (evt: KeyboardEvent) => {
      evt.stopPropagation();
      if (evt.key === 'Enter')  { evt.preventDefault(); commit(false); }
      if (evt.key === 'Escape') { commit(true); }
    });

    let committing = false;
    commitBtn.addEventListener('mousedown', () => { committing = true; });
    commitBtn.addEventListener('mousedown', (e) => { e.preventDefault(); commit(false); });
    cancelBtn.addEventListener('mousedown', (e) => { e.preventDefault(); commit(true); });
    // Only cancel on blur if neither button was pressed
    lblInput.addEventListener('blur', () => {
      setTimeout(() => { if (!committing) commit(true); committing = false; }, 120);
    });
  }

  // ── SVG node note (foreignObject) ─────────────────────────────────────────

  private startSvgNodeNote(g: any, d: any): void {
    // Remove any open note panel on this node
    g.selectAll('.kss-fo-note').remove();

    const nodeId     = d.data.id ?? d.data.term_id ?? d.data.name;
    const targetId   = `node:${nodeId}`;
    const targetType = 'ss_node';

    const panelH = 240;
    const fo = g.append('foreignObject')
      .attr('class', 'kss-fo-note')
      .attr('x', -(CW/2) + 4)
      .attr('y',  CH/2 + 6)         // below the card
      .attr('width',  CW - 8)
      .attr('height', panelH);

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      background: 'rgba(5,8,30,.97)',
      border: '1.5px solid rgba(120,180,255,.4)',
      borderRadius: '8px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box', width: '100%',
    });

    // ── Header row ──────────────────────────────────────────────────────
    const headerEl = document.createElement('div');
    Object.assign(headerEl.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '5px 8px',
      background: 'rgba(120,180,255,.08)',
      borderBottom: '1px solid rgba(120,180,255,.15)',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
      fontSize: '11px', color: 'rgba(140,200,255,.8)',
    });
    headerEl.innerHTML = '<span>📝 Notes</span>';
    const closeH = document.createElement('button');
    closeH.textContent = '✕';
    Object.assign(closeH.style, {
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'rgba(255,255,255,.4)', fontSize: '12px', padding: '0',
    });
    closeH.addEventListener('click', () => fo.remove());
    headerEl.appendChild(closeH);
    wrapper.appendChild(headerEl);

    // ── Notes list (scrollable) ──────────────────────────────────────────
    const listEl = document.createElement('div');
    Object.assign(listEl.style, {
      maxHeight: '100px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(5,8,24,.6)',
    });
    const loadEl = document.createElement('div');
    loadEl.textContent = 'Loading notes…';
    Object.assign(loadEl.style, {
      padding: '6px 8px', fontSize: '11px',
      color: 'rgba(255,255,255,.25)',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
      textAlign: 'center',
    });
    listEl.appendChild(loadEl);
    wrapper.appendChild(listEl);

    // ── New-note form ────────────────────────────────────────────────────
    const formEl = document.createElement('div');
    Object.assign(formEl.style, {
      display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '6px',
      borderTop: '1px solid rgba(120,180,255,.12)',
      background: 'rgba(5,8,30,.85)',
    });
    const ta = document.createElement('textarea');
    ta.placeholder = 'Add a note…';
    ta.rows = 2;
    Object.assign(ta.style, {
      width: '100%', resize: 'none', boxSizing: 'border-box',
      background: 'rgba(255,255,255,.05)', border: '1px solid rgba(120,180,255,.3)',
      borderRadius: '4px', color: '#dce8ff',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
      fontSize: '11px', padding: '4px 6px', outline: 'none',
    });
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: '4px', justifyContent: 'flex-end' });
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save';
    Object.assign(saveBtn.style, {
      background: 'rgba(120,180,255,.2)', border: '1px solid rgba(120,180,255,.4)',
      borderRadius: '4px', color: 'rgba(180,220,255,.9)',
      fontSize: '11px', padding: '2px 8px', cursor: 'pointer',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
    });
    btnRow.appendChild(saveBtn);
    formEl.appendChild(ta);
    formEl.appendChild(btnRow);
    wrapper.appendChild(formEl);

    fo.node()!.appendChild(wrapper);
    requestAnimationFrame(() => ta.focus());

    // ── Fetch & render existing notes ────────────────────────────────────
    const renderNotes = (notes: any[]) => {
      listEl.innerHTML = '';
      if (!notes.length) {
        const empty = document.createElement('div');
        empty.textContent = 'No notes yet.';
        Object.assign(empty.style, {
          padding: '6px 8px', fontSize: '11px', textAlign: 'center',
          color: 'rgba(255,255,255,.22)',
          fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
        });
        listEl.appendChild(empty);
        return;
      }
      notes.forEach(n => listEl.appendChild(this.buildNoteItem(n.excerpt, n.created_at)));
    };

    this.zone.run(() => {
      this.svc.getNodeNotes(targetType, targetId, this.lessonMeta?.taskId).subscribe({
        next:  (res) => renderNotes(res.notes ?? []),
        error: ()    => { loadEl.textContent = 'Could not load notes.'; },
      });
    });

    // ── Save new note ────────────────────────────────────────────────────
    saveBtn.addEventListener('click', () => {
      const text = ta.value.trim();
      if (!text) return;
      this.submitNote(text, targetType, targetId, d.depth, d.data.name);
      ta.value = '';
      listEl.appendChild(this.buildNoteItem(text, new Date().toISOString()));
      listEl.scrollTop = listEl.scrollHeight;
    });
  }

  // ── Build a single note list item ──────────────────────────────────────────

  private buildNoteItem(excerpt: string, createdAt: string): HTMLElement {
    const item = document.createElement('div');
    Object.assign(item.style, {
      padding: '6px 10px',
      borderBottom: '1px solid rgba(255,255,255,.06)',
      display: 'flex', flexDirection: 'column', gap: '2px',
    });
    const textEl = document.createElement('p');
    textEl.textContent = excerpt;
    Object.assign(textEl.style, {
      margin: '0', fontSize: '11px', color: '#dce8ff',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
      lineHeight: '1.5', wordBreak: 'break-word',
    });
    const dateEl = document.createElement('span');
    try {
      dateEl.textContent = new Date(createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric',
      });
    } catch { dateEl.textContent = ''; }
    Object.assign(dateEl.style, {
      fontSize: '10px', color: 'rgba(255,255,255,.28)',
      fontFamily: 'var(--km-font-body,Poppins,sans-serif)',
    });
    item.appendChild(textEl);
    item.appendChild(dateEl);
    return item;
  }

  // ── Submit note to API ────────────────────────────────────────────────────

  private submitNote(
    text:       string,
    targetType: string,
    targetId:   string,
    nodeDepth:  number,
    nodeName:   string,
  ): void {
    const meta  = this.lessonMeta;
    const tree  = this.treeData;
    const ref   = meta ? `${meta.unitId}:${targetId}` : targetId;

    const payload = {
      body_md:      text,
      target_type:  targetType,
      target_id:    targetId,
      relation:     'about',
      ref,
      container_id: meta?.containerId ?? undefined,
      unit_id:      meta?.unitId      ?? undefined,
      // extra_json fields for fast access
      task_id:      meta?.taskId      ?? undefined,
      step_no:      meta?.stepNo      ?? undefined,
      node_depth:   nodeDepth,
      node_name:    nodeName,
    };

    this.zone.run(() => {
      this.svc.createNodeNote(payload).subscribe({
        next: (res) => {
          if (!res.ok) console.warn('[node-note] save failed', res);
        },
        error: (err) => console.error('[node-note] API error', err),
      });
    });
  }

  // ── Save edited tree_json back to DB ──────────────────────────────────────
  // Uses the lightweight PATCH endpoint that only updates task_json.tree.
  // Falls back to the parent taskId when no childTaskId is present (single-sentence lessons).

  private saveTreeToDb(): void {
    const meta = this.lessonMeta;
    const tree = this.treeData;
    if (!meta || !tree) return;

    // For multi-sentence lessons each sentence has its own child task;
    // for single-sentence lessons the root task is the target.
    const saveTaskId = meta.childTaskId ?? meta.taskId;

    this.zone.run(() => {
      this.svc.patchTaskTree(saveTaskId, tree, this.termColors).subscribe({
        next:  (res) => { if (!res.ok) console.warn('[ss-canvas] patch failed', res); },
        error: (err) => console.error('[ss-canvas] patch error', err),
      });
    });
  }

  // ── HTML note helper — create a button element via D3 ────────────────────

  private makeNoteBtn(container: any, label: string, color: string, bg: string): any {
    return container.append('button')
      .style('background', bg)
      .style('border',     `1px solid ${color}`)
      .style('border-radius', '5px')
      .style('color',      color)
      .style('font-size',  '11px')
      .style('padding',    '3px 10px')
      .style('cursor',     'pointer')
      .style('font-family','var(--km-font-body,Poppins,sans-serif)')
      .text(label);
  }

  // ── Cubic bezier link ─────────────────────────────────────────────────────

  private curve(
    s: { x: number; y: number },
    t: { x: number; y: number },
  ): string {
    const sy = s.y + CH/2, ty = t.y - CH/2, my = (sy + ty) / 2;
    return `M${s.x},${sy} C${s.x},${my} ${t.x},${my} ${t.x},${ty}`;
  }

  // ── Color helpers ─────────────────────────────────────────────────────────

  private tc(d: any): string {
    const c = d.data?.term_id ? this.termColors[d.data.term_id] : null;
    return c ?? 'rgba(201,168,76,.92)';
  }
  private cardBg(d: any): string {
    const c = d.data?.term_id ? this.termColors[d.data.term_id] : null;
    if (c) return this.rgba(c, .12);
    return d.depth === 0 ? 'rgba(200,155,90,.08)' : 'rgba(20,17,15,.92)';
  }
  private cardBorder(d: any): string {
    const c = d.data?.term_id ? this.termColors[d.data.term_id] : null;
    if (c) return this.rgba(c, .42);
    return d.depth === 0 ? 'rgba(200,155,90,.44)' : 'rgba(200,155,90,.18)';
  }
  private rgba(hex: string, a: number): string {
    if (!hex?.startsWith('#')) return `rgba(128,128,128,${a})`;
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
}

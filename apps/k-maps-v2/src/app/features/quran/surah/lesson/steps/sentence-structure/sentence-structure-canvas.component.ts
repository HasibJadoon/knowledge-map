import {
  Component, Input, ElementRef, ViewChild,
  AfterViewInit, OnChanges, OnDestroy,
  ChangeDetectionStrategy, NgZone, inject, SimpleChanges,
} from '@angular/core';
import { hierarchy, tree as d3Tree } from 'd3-hierarchy';
import { select } from 'd3-selection';
import { linkVertical } from 'd3-shape';
import 'd3-transition';

// ── Public types ──────────────────────────────────────────────────────────────

export interface SsTreeNode {
  name: string;
  id?: string;
  term_id?: string;
  label_ar?: string;
  children?: SsTreeNode[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MARGIN_TOP    = 30;
const MARGIN_RIGHT  = 60;
const MARGIN_BOTTOM = 40;
const MARGIN_LEFT   = 60;

// Vertical depth per level (px) — space between parent and children rows
const DEPTH_PX = 120;
// Minimum horizontal gap between sibling nodes
const NODE_SEP = 200;

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'km-sentence-structure-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host style="width:100%;"></div>`,
  styles: [`:host { display:block; width:100%; }`],
})
export class SentenceStructureCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() treeData:   SsTreeNode | null           = null;
  @Input() termColors: Record<string, string>      = {};

  @ViewChild('host') private hostRef!: ElementRef<HTMLDivElement>;

  private zone = inject(NgZone);

  private svg:   any = null;
  private gLink: any = null;
  private gNode: any = null;

  private root:  any  = null;
  private width  = 900;

  // Top-down link: x = horizontal spread, y = vertical depth
  private diagonal = linkVertical<any, any>()
    .x((d: any) => d.x)
    .y((d: any) => d.y);

  private resizeObs: ResizeObserver | null = null;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const host = this.hostRef.nativeElement;
      this.width = host.clientWidth || 900;
      this.mountSvg(host);

      this.resizeObs = new ResizeObserver(([entry]) => {
        const w = Math.floor(entry.contentRect.width);
        if (Math.abs(w - this.width) > 4 && this.root) {
          this.width = w;
          this.update(null, this.root);
        }
      });
      this.resizeObs.observe(host);

      if (this.treeData) this.buildTree();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.svg) return;
    if ('treeData' in changes || 'termColors' in changes) {
      this.zone.runOutsideAngular(() => this.buildTree());
    }
  }

  ngOnDestroy(): void {
    this.resizeObs?.disconnect();
  }

  // ── SVG setup ────────────────────────────────────────────────────────────────

  private mountSvg(host: HTMLDivElement): void {
    host.innerHTML = '';

    this.svg = select(host).append('svg')
      .attr('style', [
        'display:block',
        'font:14px var(--km-font-arabic,"Scheherazade New",serif)',
        'user-select:none',
        'overflow:visible',
      ].join(';'));

    this.gLink = this.svg.append('g')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(201,168,76,0.45)')
      .attr('stroke-width', 1.5);

    this.gNode = this.svg.append('g')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all');
  }

  // ── Build root ───────────────────────────────────────────────────────────────

  private buildTree(): void {
    if (!this.svg || !this.treeData) {
      this.gLink?.selectAll('*').remove();
      this.gNode?.selectAll('*').remove();
      this.root = null;
      return;
    }

    this.gLink.selectAll('*').remove();
    this.gNode.selectAll('*').remove();
    this.root = null;

    this.root = hierarchy(this.treeData);

    // Stash x0/y0 at root position
    this.root.x0 = this.width / 2;
    this.root.y0 = 0;

    // Assign IDs + stash children; collapse everything beyond first level
    let counter = 0;
    this.root.descendants().forEach((d: any) => {
      d.id        = counter++;
      d._children = d.children ?? null;
      if (d.depth > 1) d.children = null;
    });

    this.update(null, this.root);
  }

  // ── Core update (Observable HQ, adapted for top-down) ────────────────────────

  private update(event: MouseEvent | null, source: any): void {
    if (!this.svg || !this.root) return;

    const duration = (event as MouseEvent)?.altKey ? 2500 : 250;
    const nodes    = this.root.descendants().reverse() as any[];
    const links    = this.root.links() as any[];

    // ── Layout ──────────────────────────────────────────────────────────────
    // nodeSize([x-separation, y-separation])
    // x = horizontal gap between siblings, y = vertical depth per level
    d3Tree<SsTreeNode>().nodeSize([NODE_SEP, DEPTH_PX])(this.root);

    // Mirror x-axis for Arabic RTL — first word lands on the right
    this.root.eachBefore((d: any) => { d.x = -d.x; });

    // Centre the tree horizontally — find x extents
    let minX = Infinity, maxX = -Infinity;
    this.root.eachBefore((n: any) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
    });

    const treeWidth  = maxX - minX + MARGIN_LEFT + MARGIN_RIGHT;
    const treeHeight = (this.root.height + 1) * DEPTH_PX + MARGIN_TOP + MARGIN_BOTTOM;
    const offsetX    = -minX + MARGIN_LEFT;   // shift so minX lands at MARGIN_LEFT

    const svgWidth   = Math.max(this.width, treeWidth);

    // Let the host div grow so the parent overflow-x:auto container can scroll
    this.hostRef.nativeElement.style.minWidth = `${svgWidth}px`;

    const transition = this.svg.transition()
      .duration(duration)
      .attr('width',   svgWidth)
      .attr('height',  treeHeight)
      .attr('viewBox', [0, -MARGIN_TOP, svgWidth, treeHeight].join(' '));

    // ── Nodes ────────────────────────────────────────────────────────────────
    const node = this.gNode.selectAll('g')
      .data(nodes, (d: any) => d.id);

    // ENTER — start at source's previous position
    const nodeEnter = node.enter().append('g')
      .attr('transform', () =>
        `translate(${(source.x0 ?? source.x) + offsetX},${source.y0 ?? source.y})`)
      .attr('fill-opacity', 0)
      .attr('stroke-opacity', 0)
      .on('click', (_evt: MouseEvent, d: any) => {
        d.children = d.children ? null : d._children;
        this.update(_evt, d);
      });

    // Circle
    nodeEnter.append('circle')
      .attr('r', 6)
      .attr('fill', (d: any) => this.nodeColor(d))
      .attr('stroke', 'rgba(255,255,255,0.15)')
      .attr('stroke-width', 2);

    // Arabic name — below circle
    nodeEnter.append('text')
      .attr('class', 'ss-name')
      .attr('text-anchor', 'middle')
      .attr('dy', '2em')
      .attr('font-size', (d: any) => d.depth === 0 ? 17 : 15)
      .attr('fill', '#dce8ff')
      .attr('stroke', 'rgba(8,12,24,0.9)')
      .attr('stroke-width', 4)
      .attr('paint-order', 'stroke')
      .attr('stroke-linejoin', 'round')
      .text((d: any) => d.data.name);

    // Grammar label — below name
    nodeEnter.append('text')
      .attr('class', 'ss-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '3.6em')
      .attr('font-size', 11)
      .attr('fill', (d: any) => this.nodeColor(d))
      .attr('opacity', 0.9)
      .attr('stroke', 'rgba(8,12,24,0.85)')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .attr('stroke-linejoin', 'round')
      .text((d: any) => d.data.label_ar ?? '');

    // UPDATE — slide to new positions
    const nodeUpdate = node.merge(nodeEnter).transition(transition)
      .attr('transform', (d: any) => `translate(${d.x + offsetX},${d.y})`)
      .attr('fill-opacity', 1)
      .attr('stroke-opacity', 1);

    nodeUpdate.select('circle')
      .attr('fill', (d: any) => this.nodeColor(d));

    nodeUpdate.select('.ss-label')
      .attr('fill', (d: any) => this.nodeColor(d));

    // EXIT — collapse toward source's new position
    node.exit().transition(transition).remove()
      .attr('transform', () =>
        `translate(${source.x + offsetX},${source.y})`)
      .attr('fill-opacity', 0)
      .attr('stroke-opacity', 0);

    // ── Links ────────────────────────────────────────────────────────────────
    // Offset x by the same amount so links align with nodes
    const diagOffset = (src: any, tgt: any) =>
      this.diagonal({
        source: { x: src.x + offsetX, y: src.y },
        target: { x: tgt.x + offsetX, y: tgt.y },
      });

    const link = this.gLink.selectAll('path')
      .data(links, (d: any) => d.target.id);

    const linkEnter = link.enter().append('path')
      .attr('d', () => {
        const ox = (source.x0 ?? source.x) + offsetX;
        const oy = source.y0 ?? source.y;
        return this.diagonal({ source: { x: ox, y: oy }, target: { x: ox, y: oy } });
      });

    link.merge(linkEnter).transition(transition)
      .attr('d', (d: any) => diagOffset(d.source, d.target));

    link.exit().transition(transition).remove()
      .attr('d', () => {
        const ox = source.x + offsetX;
        const oy = source.y;
        return this.diagonal({ source: { x: ox, y: oy }, target: { x: ox, y: oy } });
      });

    // Stash positions
    this.root.eachBefore((d: any) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  private nodeColor(d: any): string {
    const color = d.data.term_id ? this.termColors[d.data.term_id] : undefined;
    if (color) return color;
    return d._children ? 'rgba(201,168,76,0.85)' : '#777';
  }
}

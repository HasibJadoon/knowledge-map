import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  EventEmitter,
  ViewChild,
  SimpleChanges,
  signal,
  computed,
  effect,
  input,
} from '@angular/core';
import * as d3 from 'd3';
import {
  WvGraphData,
  WvGraphNode,
  WvGraphEdge,
  WvGraphMode,
  WvNodeType,
  WV_NODE_COLORS,
  WV_EDGE_COLORS,
  WV_EDGE_DASH,
  NODE_BASE_RADIUS,
  nodeRadius,
} from '../wv-graph.model';

// ─────────────────────────────────────────────────────────────────────────────
//  WvGraphCanvas — pure D3 SVG renderer
//  Angular owns: data in / events out
//  D3  owns:     simulation, zoom, drag, link/node positioning
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-wv-graph-canvas',
  standalone: true,
  template: `
    <svg #svgEl class="wv-canvas" aria-label="Worldview knowledge graph">
      <defs>
        <!-- Arrow markers per relation -->
        <marker id="wv-arrow-supports"       markerWidth="8" markerHeight="8" refX="16" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="rgba(201,168,76,0.6)"/></marker>
        <marker id="wv-arrow-leads_to"       markerWidth="8" markerHeight="8" refX="16" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="rgba(84,144,200,0.6)"/></marker>
        <marker id="wv-arrow-questions"      markerWidth="8" markerHeight="8" refX="16" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="rgba(140,92,200,0.55)"/></marker>
        <marker id="wv-arrow-contrasts_with" markerWidth="8" markerHeight="8" refX="16" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="rgba(196,90,58,0.55)"/></marker>
        <!-- Glow filter -->
        <filter id="wv-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="wv-glow-strong" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g #graphG class="wv-graph-g"></g>
    </svg>
  `,
  styleUrl: './wv-graph-canvas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WvGraphCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('svgEl') svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('graphG') graphGRef!: ElementRef<SVGGElement>;

  @Input() data: WvGraphData | null = null;
  @Input() selectedId: string | null = null;
  @Input() mode: WvGraphMode = 'force';
  @Input() activeTypes: Set<WvNodeType> | null = null; // null = all visible
  @Input() showLabels = true;

  @Output() nodeClick = new EventEmitter<WvGraphNode>();
  @Output() bgClick   = new EventEmitter<void>();
  @Output() nodeDblClick = new EventEmitter<WvGraphNode>();

  private sim!: d3.Simulation<WvGraphNode, WvGraphEdge>;
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoom!: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private initialized = false;
  private ro?: ResizeObserver;

  // Live selections updated on tick
  private linkSel!: d3.Selection<SVGLineElement, WvGraphEdge, SVGGElement, unknown>;
  private nodeSel!: d3.Selection<SVGGElement, WvGraphNode, SVGGElement, unknown>;
  private labelSel!: d3.Selection<SVGTextElement, WvGraphNode, SVGGElement, unknown>;

  ngAfterViewInit(): void {
    this.initSvg();
    this.initZoom();
    if (this.data) this.build(this.data);
    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(this.svgRef.nativeElement.parentElement!);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;
    if (changes['data'] && this.data) {
      this.build(this.data);
    } else {
      if (changes['selectedId'] || changes['mode']) this.applyFocus();
      if (changes['activeTypes']) this.applyTypeFilter();
      if (changes['showLabels']) this.applyLabelVisibility();
    }
  }

  ngOnDestroy(): void {
    this.sim?.stop();
    this.ro?.disconnect();
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  resetZoom(): void {
    this.svg?.transition().duration(450).call(
      this.zoom.transform,
      d3.zoomIdentity.translate(this.svgW() / 2, this.svgH() / 2)
    );
  }

  centerOnSelected(): void {
    const node = this.data?.nodes.find(n => n.id === this.selectedId);
    if (!node || node.x == null || node.y == null) return;
    const w = this.svgW(), h = this.svgH();
    this.svg.transition().duration(500).call(
      this.zoom.transform,
      d3.zoomIdentity
        .translate(w / 2 - node.x, h / 2 - node.y)
    );
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  private initSvg(): void {
    this.svg = d3.select(this.svgRef.nativeElement);
    this.g   = d3.select(this.graphGRef.nativeElement);

    this.svg.on('click', (event: MouseEvent) => {
      if (event.target === this.svgRef.nativeElement) this.bgClick.emit();
    });

    this.initialized = true;
  }

  private initZoom(): void {
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3.5])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        this.g.attr('transform', event.transform.toString());
      });
    this.svg.call(this.zoom);
    // Start centered
    this.svg.call(
      this.zoom.transform,
      d3.zoomIdentity.translate(this.svgW() / 2, this.svgH() / 2)
    );
  }

  // ── Build graph ─────────────────────────────────────────────────────────────
  private build(data: WvGraphData): void {
    this.g.selectAll('*').remove();
    this.sim?.stop();

    // Deep-clone nodes + compute degree
    const nodes: WvGraphNode[] = data.nodes.map(n => ({ ...n }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const edges: WvGraphEdge[] = data.edges
      .map(e => ({
        ...e,
        source: nodeMap.get(typeof e.source === 'string' ? e.source : e.source.id)!,
        target: nodeMap.get(typeof e.target === 'string' ? e.target : e.target.id)!,
      }))
      .filter(e => e.source && e.target);

    // Compute degree
    for (const n of nodes) n.degree = 0;
    for (const e of edges) {
      (e.source as WvGraphNode).degree! += 1;
      (e.target as WvGraphNode).degree! += 1;
    }

    // ── Simulation ────────────────────────────────────────────────────────────
    this.sim = d3.forceSimulation<WvGraphNode>(nodes)
      .force('link', d3.forceLink<WvGraphNode, WvGraphEdge>(edges)
        .id(d => d.id)
        .distance(d => {
          const str = (d as WvGraphEdge).strength ?? 0.5;
          return 80 + (1 - str) * 80;
        })
        .strength(0.4)
      )
      .force('charge', d3.forceManyBody<WvGraphNode>().strength(-260))
      .force('collide', d3.forceCollide<WvGraphNode>().radius(d => nodeRadius(d) + 14).strength(0.8))
      .force('x', d3.forceX(0).strength(0.04))
      .force('y', d3.forceY(0).strength(0.04))
      .alphaDecay(0.025);

    // ── Render layers ─────────────────────────────────────────────────────────
    // 1. Links
    this.linkSel = this.g.append('g').attr('class', 'links')
      .selectAll<SVGLineElement, WvGraphEdge>('line')
      .data(edges)
      .join('line')
      .attr('class', 'wv-link')
      .attr('stroke', d => WV_EDGE_COLORS[d.relation])
      .attr('stroke-width', d => (d.strength ?? 0.5) * 1.8 + 0.4)
      .attr('stroke-dasharray', d => WV_EDGE_DASH[d.relation] ?? null)
      .attr('marker-end', d =>
        ['supports','leads_to','questions','contrasts_with'].includes(d.relation)
          ? `url(#wv-arrow-${d.relation})`
          : null
      );

    // 2. Node groups
    this.nodeSel = this.g.append('g').attr('class', 'nodes')
      .selectAll<SVGGElement, WvGraphNode>('g')
      .data(nodes, d => d.id)
      .join('g')
      .attr('class', 'wv-node')
      .attr('cursor', 'pointer')
      .call(this.dragBehavior());

    // Outer glow ring
    this.nodeSel.append('circle')
      .attr('class', 'wv-node__glow')
      .attr('r', d => nodeRadius(d) + 5)
      .attr('fill', d => WV_NODE_COLORS[d.type].glow)
      .attr('opacity', 0)
      .attr('filter', 'url(#wv-glow)');

    // Main circle
    this.nodeSel.append('circle')
      .attr('class', 'wv-node__circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => WV_NODE_COLORS[d.type].fill)
      .attr('stroke', d => WV_NODE_COLORS[d.type].stroke)
      .attr('stroke-width', 1.5);

    // Type glyph inside
    this.nodeSel.append('text')
      .attr('class', 'wv-node__glyph')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', d => Math.min(nodeRadius(d) * 0.9, 10))
      .attr('fill', d => WV_NODE_COLORS[d.type].stroke)
      .text(d => typeGlyph(d.type));

    // Click / dblclick
    this.nodeSel
      .on('click', (event: MouseEvent, d: WvGraphNode) => {
        event.stopPropagation();
        this.nodeClick.emit(d);
      })
      .on('dblclick', (event: MouseEvent, d: WvGraphNode) => {
        event.stopPropagation();
        this.nodeDblClick.emit(d);
      });

    // 3. Labels
    this.labelSel = this.g.append('g').attr('class', 'labels')
      .selectAll<SVGTextElement, WvGraphNode>('text')
      .data(nodes, d => d.id)
      .join('text')
      .attr('class', 'wv-label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius(d) + 13)
      .attr('fill', 'rgba(255,255,255,0.72)')
      .attr('font-size', 9)
      .attr('font-family', 'Poppins, sans-serif')
      .attr('pointer-events', 'none')
      .text(d => d.label);

    // ── Tick ─────────────────────────────────────────────────────────────────
    this.sim.on('tick', () => {
      this.linkSel
        .attr('x1', d => (d.source as WvGraphNode).x ?? 0)
        .attr('y1', d => (d.source as WvGraphNode).y ?? 0)
        .attr('x2', d => (d.target as WvGraphNode).x ?? 0)
        .attr('y2', d => (d.target as WvGraphNode).y ?? 0);

      this.nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
      this.labelSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    this.applyFocus();
    this.applyTypeFilter();
    this.applyLabelVisibility();
  }

  // ── Focus mode ──────────────────────────────────────────────────────────────
  private applyFocus(): void {
    if (!this.nodeSel) return;
    const sel = this.selectedId;

    if (!sel || this.mode === 'force') {
      // All full opacity
      this.nodeSel.attr('opacity', 1);
      this.nodeSel.select('.wv-node__glow').attr('opacity', 0);
      this.linkSel?.attr('opacity', 1);
      this.labelSel?.attr('opacity', this.showLabels ? 0.72 : 0);
      return;
    }

    // Build neighbour set
    const neighbours = new Set<string>([sel]);
    this.data?.edges.forEach(e => {
      const s = typeof e.source === 'string' ? e.source : (e.source as WvGraphNode).id;
      const t = typeof e.target === 'string' ? e.target : (e.target as WvGraphNode).id;
      if (s === sel) neighbours.add(t);
      if (t === sel) neighbours.add(s);
    });

    this.nodeSel.attr('opacity', (d: WvGraphNode) =>
      d.id === sel ? 1 : neighbours.has(d.id) ? 0.8 : 0.2
    );

    this.nodeSel.select<SVGCircleElement>('.wv-node__glow')
      .attr('opacity', (d: WvGraphNode) => d.id === sel ? 0.7 : 0);

    this.linkSel?.attr('opacity', (d: WvGraphEdge) => {
      const s = (d.source as WvGraphNode).id;
      const t = (d.target as WvGraphNode).id;
      return s === sel || t === sel ? 0.9 : 0.08;
    });

    this.labelSel?.attr('opacity', (d: WvGraphNode) =>
      d.id === sel ? 1 : neighbours.has(d.id) ? 0.6 : 0.12
    );
  }

  // ── Type filter ──────────────────────────────────────────────────────────────
  private applyTypeFilter(): void {
    if (!this.nodeSel) return;
    const active = this.activeTypes;
    this.nodeSel.attr('display', (d: WvGraphNode) =>
      !active || active.has(d.type) ? null : 'none'
    );
    this.labelSel?.attr('display', (d: WvGraphNode) =>
      !active || active.has(d.type) ? null : 'none'
    );
  }

  // ── Label visibility ─────────────────────────────────────────────────────────
  private applyLabelVisibility(): void {
    this.labelSel?.attr('display', this.showLabels ? null : 'none');
  }

  // ── Drag ────────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dragBehavior(): any {
    return d3.drag<SVGGElement, WvGraphNode>()
      .on('start', (event: d3.D3DragEvent<SVGGElement, WvGraphNode, WvGraphNode>, d: WvGraphNode) => {
        if (!event.active) this.sim.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (event: d3.D3DragEvent<SVGGElement, WvGraphNode, WvGraphNode>, d: WvGraphNode) => {
        d.fx = event.x; d.fy = event.y;
      })
      .on('end', (event: d3.D3DragEvent<SVGGElement, WvGraphNode, WvGraphNode>, d: WvGraphNode) => {
        if (!event.active) this.sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
  }

  // ── Resize ──────────────────────────────────────────────────────────────────
  private onResize(): void {
    if (!this.sim) return;
    this.sim.force('x', d3.forceX(0).strength(0.04));
    this.sim.force('y', d3.forceY(0).strength(0.04));
    this.sim.alpha(0.2).restart();
  }

  private svgW(): number {
    return this.svgRef?.nativeElement?.clientWidth ?? 600;
  }
  private svgH(): number {
    return this.svgRef?.nativeElement?.clientHeight ?? 400;
  }
}

// ── Glyph per type ────────────────────────────────────────────────────────────
function typeGlyph(type: WvNodeType): string {
  return { claim: '◆', principle: '◇', framework: '▣', cause: '▲', evidence: '●', insight: '✦' }[type];
}

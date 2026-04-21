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
} from '../../../../shared/models/worldview/wv-graph.model';

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
  private currentTransform = d3.zoomIdentity;
  private renderedNodes: WvGraphNode[] = [];
  private labelLayouts = new Map<string, WvLabelLayout>();

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
    this.fitToGraph(true);
  }

  centerOnSelected(): void {
    const node = this.renderedNodes.find(n => n.id === this.selectedId);
    if (!node || node.x == null || node.y == null) return;
    const w = this.svgW();
    const h = this.svgH();
    const scale = Math.max(this.currentTransform.k, 1.05);
    this.svg.transition().duration(500).call(
      this.zoom.transform,
      d3.zoomIdentity
        .translate(w / 2, h / 2)
        .scale(scale)
        .translate(-node.x, -node.y)
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
        this.currentTransform = event.transform;
        this.g.attr('transform', event.transform.toString());
      });
    this.svg.call(this.zoom);
    this.currentTransform = d3.zoomIdentity;
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

    this.seedNodePositions(nodes);
    this.renderedNodes = nodes;
    this.labelLayouts = new Map(nodes.map((node) => [node.id, getLabelLayout(node)]));

    // ── Simulation ────────────────────────────────────────────────────────────
    this.sim = d3.forceSimulation<WvGraphNode>(nodes)
      .force('link', d3.forceLink<WvGraphNode, WvGraphEdge>(edges)
        .id(d => d.id)
        .distance(d => {
          const source = d.source as WvGraphNode;
          const target = d.target as WvGraphNode;
          const str = (d as WvGraphEdge).strength ?? 0.5;
          const degreeWeight = ((source.degree ?? 1) + (target.degree ?? 1)) * 5;
          return 145 + (1 - str) * 120 + Math.min(80, degreeWeight);
        })
        .strength(d => 0.14 + ((d as WvGraphEdge).strength ?? 0.5) * 0.18)
      )
      .force('charge', d3.forceManyBody<WvGraphNode>().strength((d) => -(360 + (d.degree ?? 1) * 28)))
      .force(
        'collide',
        d3.forceCollide<WvGraphNode>().radius((d) => this.labelLayouts.get(d.id)?.collisionRadius ?? nodeRadius(d) + 22).strength(0.96),
      )
      .force('radial', d3.forceRadial<WvGraphNode>((d) => this.radialTarget(d), 0, 0).strength(0.055))
      .force('x', d3.forceX(0).strength(0.028))
      .force('y', d3.forceY(0).strength(0.028))
      .velocityDecay(0.34)
      .alphaDecay(0.03);

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
      .attr('y', d => nodeRadius(d) + 16)
      .attr('fill', 'rgba(255,255,255,0.72)')
      .attr('font-size', 10)
      .attr('font-family', 'Poppins, sans-serif')
      .attr('pointer-events', 'none')
      .each((d, index, elements) => {
        const selection = d3.select<SVGTextElement, WvGraphNode>(elements[index]);
        const layout = this.labelLayouts.get(d.id) ?? getLabelLayout(d);
        applyWrappedLabel(selection, layout.lines);
      });

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

    for (let i = 0; i < 180; i += 1) {
      this.sim.tick();
    }

    this.linkSel
      .attr('x1', d => (d.source as WvGraphNode).x ?? 0)
      .attr('y1', d => (d.source as WvGraphNode).y ?? 0)
      .attr('x2', d => (d.target as WvGraphNode).x ?? 0)
      .attr('y2', d => (d.target as WvGraphNode).y ?? 0);
    this.nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    this.labelSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

    this.sim.on('end', () => {
      this.fitToGraph(true);
    });

    this.sim.alpha(0.28).restart();

    this.applyFocus();
    this.applyTypeFilter();
    this.applyLabelVisibility();
    this.fitToGraph(false);
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
    this.linkSel?.attr('display', (d: WvGraphEdge) => {
      const source = d.source as WvGraphNode;
      const target = d.target as WvGraphNode;
      return !active || (active.has(source.type) && active.has(target.type)) ? null : 'none';
    });
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
    this.sim.force('x', d3.forceX(0).strength(0.028));
    this.sim.force('y', d3.forceY(0).strength(0.028));
    this.sim.alpha(0.2).restart();
    this.fitToGraph(false);
  }

  private seedNodePositions(nodes: WvGraphNode[]): void {
    const ordered = [...nodes].sort((left, right) => (right.degree ?? 0) - (left.degree ?? 0));
    const ringStep = Math.max(120, Math.min(this.svgW(), this.svgH()) * 0.14);

    ordered.forEach((node, index) => {
      if (index === 0) {
        node.x = 0;
        node.y = 0;
        return;
      }

      const angle = index * GOLDEN_ANGLE;
      const radius = ringStep * Math.sqrt(index) * 1.12;
      node.x = Math.cos(angle) * radius;
      node.y = Math.sin(angle) * radius * 0.84;
    });
  }

  private radialTarget(node: WvGraphNode): number {
    const degree = node.degree ?? 1;
    const depthWeight = Math.max(0, 6 - Math.min(degree, 6));
    return 60 + depthWeight * 34;
  }

  private fitToGraph(animated: boolean): void {
    if (!this.svg || !this.zoom || !this.renderedNodes.length) return;

    const visibleNodes = this.renderedNodes.filter((node) => !this.activeTypes || this.activeTypes.has(node.type));
    if (!visibleNodes.length) return;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    visibleNodes.forEach((node) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const radius = nodeRadius(node);
      const layout = this.labelLayouts.get(node.id) ?? getLabelLayout(node);
      const halfWidth = Math.max(radius + 8, layout.width / 2);
      const topPad = radius + 12;
      const bottomPad = radius + 20 + layout.height;

      minX = Math.min(minX, x - halfWidth);
      maxX = Math.max(maxX, x + halfWidth);
      minY = Math.min(minY, y - topPad);
      maxY = Math.max(maxY, y + bottomPad);
    });

    const graphWidth = Math.max(1, maxX - minX);
    const graphHeight = Math.max(1, maxY - minY);
    const viewportWidth = this.svgW();
    const viewportHeight = this.svgH();
    const padding = Math.max(52, Math.min(viewportWidth, viewportHeight) * 0.08);
    const scale = clamp(
      Math.min((viewportWidth - padding * 2) / graphWidth, (viewportHeight - padding * 2) / graphHeight),
      0.48,
      1.24,
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const transform = d3.zoomIdentity
      .translate(viewportWidth / 2, viewportHeight / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    if (animated) {
      this.svg.transition().duration(420).call(this.zoom.transform, transform);
    } else {
      this.svg.call(this.zoom.transform, transform);
    }
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

interface WvLabelLayout {
  lines: string[];
  width: number;
  height: number;
  collisionRadius: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const LABEL_WRAP_CHAR_LIMIT = 26;
const LABEL_LINE_HEIGHT = 12;

function getLabelLayout(node: WvGraphNode): WvLabelLayout {
  const lines = wrapLabelLines(node.label, LABEL_WRAP_CHAR_LIMIT);
  const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const width = Math.min(210, Math.max(72, longestLine * 6.5));
  const height = lines.length * LABEL_LINE_HEIGHT;
  const collisionRadius = Math.max(nodeRadius(node) + 24, Math.sqrt((width * 0.58) ** 2 + (height + 22) ** 2));
  return { lines, width, height, collisionRadius };
}

function wrapLabelLines(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 4);
}

function applyWrappedLabel(
  selection: d3.Selection<SVGTextElement, WvGraphNode, d3.BaseType, unknown>,
  lines: string[],
): void {
  selection.text(null);

  lines.forEach((line, index) => {
    selection
      .append('tspan')
      .attr('x', 0)
      .attr('dy', index === 0 ? 0 : `${LABEL_LINE_HEIGHT}px`)
      .text(line);
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

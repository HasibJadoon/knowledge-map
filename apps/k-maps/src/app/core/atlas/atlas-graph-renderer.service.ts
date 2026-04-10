import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import {
  AtlasCluster,
  AtlasEdge,
  AtlasGraphData,
  FocusState,
  SimulationLink,
  SimulationNode,
  HistoricalWaypoint,
  HistoricalEra,
  SceneState,
} from './atlas.models';
import { AtlasLandingFacade } from './atlas-landing.facade';

/**
 * AtlasGraphRenderer — owns all D3 rendering across three scene layers:
 *
 *   CONSTELLATION  Lightweight star-dot + line rendering (no force simulation)
 *   NODE           Full D3 force-directed graph with stabilised layout
 *   HISTORY        Temporal arc ribbon emerging from a focused node
 *
 * The renderer is stateless regarding navigation — it receives the current
 * SceneState and the resolved graph data and re-renders accordingly.
 *
 * Key decisions:
 *   • Cluster dust halos are rendered as <circle> elements, not random DOM spam
 *   • Force simulation runs briefly then freezes — no continuous re-layout
 *   • Labels use progressive disclosure by zoom level and importance
 *   • History arc uses a monotone cubic path, not a straight line grid
 */
@Injectable({ providedIn: 'root' })
export class AtlasGraphRenderer {
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private root!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoomBehavior!: d3.ZoomBehavior<SVGSVGElement, unknown>;

  private simulation!: d3.Simulation<SimulationNode, SimulationLink>;
  private nodes: SimulationNode[] = [];
  private links: SimulationLink[] = [];
  private clusterMap = new Map<string, AtlasCluster>();
  private linksByNode = new Map<string, Set<string>>();

  private currentScale = 1;
  private width = 0;
  private height = 0;

  constructor(private readonly facade: AtlasLandingFacade) {}

  // ─── Initialisation ──────────────────────────────────────────────────────

  init(svgEl: SVGSVGElement, width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.svg = d3.select(svgEl);
    this.svg.attr('width', width).attr('height', height);

    // Defs: radial gradient for Qur'an glow, clip paths
    this.buildDefs();

    this.root = this.svg.append('g').attr('class', 'atlas-root');

    this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 8])
      .on('zoom', (event) => {
        this.currentScale = event.transform.k;
        this.root.attr('transform', event.transform.toString());
        this.onZoomUpdate();
      });

    this.svg.call(this.zoomBehavior);
    this.svg.on('click.deselect', () => this.onBackgroundClick());
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.svg?.attr('width', width).attr('height', height);
  }

  // ─── Data load ───────────────────────────────────────────────────────────

  loadGraph(data: AtlasGraphData): void {
    this.clusterMap = new Map(data.clusters.map((c) => [c.id, c]));
    this.linksByNode = this.buildAdjacency(data.edges);

    this.nodes = data.nodes.map((n) => this.facade.toSimulationNode(n, this.clusterMap));
    this.links = data.edges.map((e) => ({ ...e }));
  }

  // ─── Full render entry ───────────────────────────────────────────────────

  renderScene(state: SceneState, focusLegacy: FocusState): void {
    switch (state.layer) {
      case 'sky':
        this.renderSkyLayer(focusLegacy);
        break;
      case 'constellation':
        this.renderConstellationLayer(focusLegacy);
        break;
      case 'node':
        this.renderNodeLayer(focusLegacy);
        break;
      case 'history':
        // History arc is rendered separately via renderHistoryArc
        this.renderNodeLayer(focusLegacy);
        break;
    }
  }

  // ─── SKY layer ───────────────────────────────────────────────────────────
  // At sky scale: only cluster halos + concept nodes are visible.

  renderSkyLayer(focus: FocusState): void {
    this.ensureSimulation(focus);
    this.updateClusterHalos(focus);
    this.updateEdges(focus);
    this.updateNodes(focus);
    this.updateLabels(focus);
  }

  // ─── CONSTELLATION layer ─────────────────────────────────────────────────
  // Zoomed in on one constellation territory; neighbouring clusters dimmed.

  renderConstellationLayer(focus: FocusState): void {
    this.ensureSimulation(focus);
    this.updateClusterHalos(focus);
    this.updateEdges(focus);
    this.updateNodes(focus);
    this.updateLabels(focus);

    // Auto-pan camera to focused cluster
    if (focus.clusterId) {
      const cluster = this.clusterMap.get(focus.clusterId);
      if (cluster) {
        this.panTo(cluster.world_x, cluster.world_y, 2.2, 700);
      }
    }
  }

  // ─── NODE layer ──────────────────────────────────────────────────────────
  // Deep zoom into a single cluster's concept graph.

  renderNodeLayer(focus: FocusState): void {
    this.ensureSimulation(focus);
    this.updateClusterHalos(focus);
    this.updateEdges(focus);
    this.updateNodes(focus);
    this.updateLabels(focus);

    if (focus.nodeId) {
      const node = this.nodes.find((n) => n.id === focus.nodeId);
      if (node?.x != null && node?.y != null) {
        this.panTo(node.x, node.y, 3.8, 600);
      }
    }
  }

  // ─── HISTORY arc layer ───────────────────────────────────────────────────

  /**
   * Draws a temporal arc extending from a focused node.
   * Waypoints are placed along an arc path in chronological order.
   * Era boundaries are marked with luminosity breaks.
   */
  renderHistoryArc(
    nodeId: string,
    waypoints: HistoricalWaypoint[],
    eras: HistoricalEra[],
    svgWidth: number,
    svgHeight: number,
  ): void {
    // Remove any existing history layer
    this.root.selectAll('.atlas-history').remove();

    const origin = this.nodes.find((n) => n.id === nodeId);
    if (!origin || origin.x == null || origin.y == null) return;

    const historyG = this.root.append('g')
      .attr('class', 'atlas-history')
      .attr('data-node', nodeId);

    if (waypoints.length === 0) return;

    // Build arc points radiating from the node
    const arcRadius = 180;
    const angleSpread = Math.PI * 1.1;
    const startAngle = -Math.PI * 0.05;

    const points: Array<{ x: number; y: number; wp: HistoricalWaypoint }> = waypoints.map((wp, i) => {
      const t = waypoints.length === 1 ? 0.5 : i / (waypoints.length - 1);
      const angle = startAngle + t * angleSpread;
      const r = arcRadius + i * 22 + (i % 3) * 12;
      return {
        x: (origin.x ?? 0) + Math.cos(angle) * r,
        y: (origin.y ?? 0) + Math.sin(angle) * r,
        wp,
      };
    });

    // Draw connecting path (monotone cubic)
    const lineGen = d3.line<typeof points[0]>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveCatmullRom.alpha(0.5));

    const pathData = lineGen([{ x: origin.x ?? 0, y: origin.y ?? 0, wp: waypoints[0] }, ...points]);
    if (!pathData) return;

    historyG.append('path')
      .attr('class', 'atlas-history__arc')
      .attr('d', pathData)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(201,168,76,0.28)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', function () {
        const len = (this as SVGPathElement).getTotalLength?.() ?? 600;
        return `${len} ${len}`;
      })
      .attr('stroke-dashoffset', function () {
        return (this as SVGPathElement).getTotalLength?.() ?? 600;
      })
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Era group shading
    const eraMap = new Map(eras.map((e) => [e.era_id, e]));
    const timeMin = Math.min(...waypoints.map((w) => w.time_start));
    const timeMax = Math.max(...waypoints.map((w) => w.time_start));
    const timeRange = Math.max(1, timeMax - timeMin);

    // Draw waypoint dots
    const waypointGs = historyG.selectAll<SVGGElement, typeof points[0]>('.atlas-history__wp')
      .data(points)
      .enter()
      .append('g')
      .attr('class', 'atlas-history__wp')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('opacity', 0);

    // Era colour lookup
    const getEraColor = (eraId: string): string => {
      return eraMap.get(eraId)?.color ?? 'rgba(180,200,240,0.7)';
    };

    waypointGs.append('circle')
      .attr('r', 4.5)
      .attr('fill', (d) => getEraColor(d.wp.era_id))
      .attr('stroke', 'rgba(255,255,255,0.4)')
      .attr('stroke-width', 0.8);

    waypointGs.append('text')
      .attr('class', 'atlas-history__label')
      .attr('x', 8)
      .attr('y', 4)
      .attr('font-size', 9)
      .attr('fill', 'rgba(220,230,255,0.85)')
      .text((d) => d.wp.label);

    waypointGs.append('text')
      .attr('class', 'atlas-history__year')
      .attr('x', 8)
      .attr('y', 15)
      .attr('font-size', 7.5)
      .attr('fill', 'rgba(150,170,220,0.55)')
      .text((d) => `${d.wp.time_start > 0 ? d.wp.time_start + ' CE' : Math.abs(d.wp.time_start) + ' BCE'}`);

    // Staggered entrance
    waypointGs
      .transition()
      .delay((_, i) => 200 + i * 90)
      .duration(380)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);

    // Pan to show history arc
    this.panTo(
      (origin.x ?? 0) + arcRadius * 0.5,
      (origin.y ?? 0),
      Math.max(this.currentScale, 3.4),
      700,
    );
  }

  removeHistoryArc(): void {
    this.root.selectAll('.atlas-history').remove();
  }

  // ─── Zoom controls ───────────────────────────────────────────────────────

  zoomIn(): void {
    this.svg.transition().duration(260).call(this.zoomBehavior.scaleBy, 1.5);
  }

  zoomOut(): void {
    this.svg.transition().duration(260).call(this.zoomBehavior.scaleBy, 0.67);
  }

  resetZoom(): void {
    this.svg.transition().duration(480).ease(d3.easeCubicInOut).call(
      this.zoomBehavior.transform,
      d3.zoomIdentity.translate(this.width / 2, this.height / 2).scale(0.72),
    );
  }

  panTo(x: number, y: number, k: number, duration = 600): void {
    this.svg.transition().duration(duration).ease(d3.easeCubicInOut).call(
      this.zoomBehavior.transform,
      d3.zoomIdentity
        .translate(this.width / 2, this.height / 2)
        .scale(k)
        .translate(-x, -y),
    );
  }

  // ─── Force simulation ────────────────────────────────────────────────────

  private ensureSimulation(focus: FocusState): void {
    if (this.simulation) return;
    this.buildSimulation(focus);
  }

  private buildSimulation(focus: FocusState): void {
    this.simulation = d3.forceSimulation<SimulationNode>(this.nodes)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(this.links)
        .id((d) => d.id)
        .distance((l) => this.facade.linkDistance(l, (n) => this.resolveNode(n)))
        .strength((l) => this.facade.linkStrength(l, (n) => this.resolveNode(n)))
      )
      .force('charge', d3.forceManyBody<SimulationNode>()
        .strength((n) => this.facade.chargeStrength(n))
        .distanceMax(320)
      )
      .force('x', d3.forceX<SimulationNode>((n) => n.hintX).strength((n) => this.facade.anchorStrength(n)))
      .force('y', d3.forceY<SimulationNode>((n) => n.hintY).strength((n) => this.facade.anchorStrength(n)))
      .force('collision', d3.forceCollide<SimulationNode>((n) => this.facade.nodeRadius(n) + 6))
      .alphaDecay(0.028)
      .velocityDecay(0.44)
      .on('tick', () => this.onTick(focus))
      .on('end', () => this.onSimulationEnd());

    // Freeze after warmup
    setTimeout(() => {
      if (this.simulation) this.simulation.stop();
    }, 4000);
  }

  private onTick(focus: FocusState): void {
    this.updateEdgePositions();
    this.updateNodePositions();
    this.updateLabelPositions();
  }

  private onSimulationEnd(): void {
    // Snapshot settled positions into homeX/homeY for future resets
    for (const node of this.nodes) {
      node.homeX = node.x ?? node.homeX;
      node.homeY = node.y ?? node.homeY;
    }
  }

  private resolveNode(n: string | SimulationNode): SimulationNode | undefined {
    if (typeof n === 'string') return this.nodes.find((x) => x.id === n);
    return n;
  }

  // ─── D3 join helpers ─────────────────────────────────────────────────────

  private buildDefs(): void {
    const defs = this.svg.append('defs');

    // Qur'an radial glow gradient
    const quranGlow = defs.append('radialGradient')
      .attr('id', 'quran-glow')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
    quranGlow.append('stop').attr('offset', '0%').attr('stop-color', '#c9a84c').attr('stop-opacity', 0.55);
    quranGlow.append('stop').attr('offset', '60%').attr('stop-color', '#8a6a20').attr('stop-opacity', 0.14);
    quranGlow.append('stop').attr('offset', '100%').attr('stop-color', '#000000').attr('stop-opacity', 0);

    // Star glow (generic)
    const starGlow = defs.append('radialGradient')
      .attr('id', 'star-glow')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
    starGlow.append('stop').attr('offset', '0%').attr('stop-color', '#ffffff').attr('stop-opacity', 0.22);
    starGlow.append('stop').attr('offset', '100%').attr('stop-color', '#000000').attr('stop-opacity', 0);

    // Blur filter for soft halos
    const blur = defs.append('filter').attr('id', 'halo-blur').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    blur.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 18);
  }

  private updateClusterHalos(focus: FocusState): void {
    const g = this.root.selectAll<SVGGElement, AtlasCluster>('.atlas-territory')
      .data(Array.from(this.clusterMap.values()), (d) => d.id);

    const enter = g.enter().append('g').attr('class', 'atlas-territory');

    // Halo circle (blurred)
    enter.append('circle')
      .attr('class', 'atlas-territory__halo')
      .attr('filter', 'url(#halo-blur)');

    // Territory border
    enter.append('circle').attr('class', 'atlas-territory__border');

    // Label
    enter.append('text').attr('class', 'atlas-territory__label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central');

    const merged = enter.merge(g as any);

    merged.attr('transform', (d) => `translate(${d.world_x},${d.world_y})`)
      .attr('opacity', (d) => this.facade.clusterOpacity(d, focus, this.currentScale));

    merged.select('.atlas-territory__halo')
      .attr('r', (d) => d.radius * 1.6)
      .attr('fill', (d) => d.color)
      .attr('opacity', 0.06);

    merged.select('.atlas-territory__border')
      .attr('r', (d) => d.radius)
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.22);

    merged.select('.atlas-territory__label')
      .attr('y', (d) => -d.radius - 14)
      .attr('font-size', 11)
      .attr('fill', (d) => d.color)
      .attr('opacity', (d) =>
        focus.kind === 'world' ? 0.68 : focus.clusterId === d.id ? 0.92 : 0.12,
      )
      .text((d) => d.label);

    g.exit().remove();
  }

  private updateEdges(focus: FocusState): void {
    const g = this.root.selectAll<SVGLineElement, SimulationLink>('.atlas-edge')
      .data(this.links, (d) => d.id);

    g.enter()
      .append('line')
      .attr('class', (d) => `atlas-edge atlas-edge--${this.facade.edgeSlug(d.type)}`)
      .merge(g as any)
      .attr('stroke', (d) => this.facade.edgeStroke(d, this.clusterMap, (n) => this.resolveNode(n)))
      .attr('stroke-width', (d) => this.facade.edgeWidth(d, this.currentScale))
      .attr('opacity', (d) => this.facade.edgeOpacity(d, focus, this.currentScale, this.linksByNode, (n) => this.resolveNode(n)));

    g.exit().remove();
  }

  private updateNodes(focus: FocusState): void {
    const g = this.root.selectAll<SVGCircleElement, SimulationNode>('.atlas-node')
      .data(this.nodes, (d) => d.id);

    const enter = g.enter()
      .append('circle')
      .attr('class', (d) => this.facade.nodeClass(d))
      .attr('data-id', (d) => d.id)
      .on('click', (event, d) => {
        event.stopPropagation();
        this.onNodeClick(d);
      })
      .on('mouseenter', (_, d) => this.onNodeHover(d, true))
      .on('mouseleave', (_, d) => this.onNodeHover(d, false));

    enter.merge(g as any)
      .attr('r', (d) => this.facade.nodeRadius(d))
      .attr('fill', (d) => this.facade.nodeFill(d, this.clusterMap))
      .attr('stroke', (d) => this.facade.nodeStroke(d, this.clusterMap))
      .attr('stroke-width', (d) => (this.facade.isFocusedNode(d, focus) ? 1.8 : 0.8))
      .attr('opacity', (d) => this.facade.nodeOpacity(d, focus, this.currentScale, this.linksByNode));

    g.exit().remove();
  }

  private updateLabels(focus: FocusState): void {
    const g = this.root.selectAll<SVGTextElement, SimulationNode>('.atlas-label')
      .data(this.nodes, (d) => d.id);

    g.enter()
      .append('text')
      .attr('class', 'atlas-label')
      .attr('pointer-events', 'none')
      .attr('font-size', (d) => d.kind === 'concept' ? 10.5 : 8.5)
      .attr('fill', 'rgba(220,230,255,0.88)')
      .attr('text-anchor', 'middle')
      .merge(g as any)
      .text((d) => this.facade.shortLabel(d))
      .attr('opacity', (d) => this.facade.labelOpacity(d, focus, this.currentScale, this.linksByNode));

    g.exit().remove();
  }

  // ─── Tick position updates ───────────────────────────────────────────────

  private updateEdgePositions(): void {
    this.root.selectAll<SVGLineElement, SimulationLink>('.atlas-edge')
      .attr('x1', (d) => (this.resolveNode(d.source)?.x ?? 0))
      .attr('y1', (d) => (this.resolveNode(d.source)?.y ?? 0))
      .attr('x2', (d) => (this.resolveNode(d.target)?.x ?? 0))
      .attr('y2', (d) => (this.resolveNode(d.target)?.y ?? 0));
  }

  private updateNodePositions(): void {
    this.root.selectAll<SVGCircleElement, SimulationNode>('.atlas-node')
      .attr('cx', (d) => d.x ?? 0)
      .attr('cy', (d) => d.y ?? 0);
  }

  private updateLabelPositions(): void {
    this.root.selectAll<SVGTextElement, SimulationNode>('.atlas-label')
      .attr('x', (d) => d.x ?? 0)
      .attr('y', (d) => (d.y ?? 0) - this.facade.nodeRadius(d) - 5);
  }

  // ─── Zoom-level reactive update ──────────────────────────────────────────

  private onZoomUpdate(): void {
    // Re-apply opacity/size only — no full re-render
    const focus = this.getFocusFromDOM();
    this.root.selectAll<SVGCircleElement, SimulationNode>('.atlas-node')
      .attr('opacity', (d) => this.facade.nodeOpacity(d, focus, this.currentScale, this.linksByNode))
      .attr('stroke-width', (d) => (this.facade.isFocusedNode(d, focus) ? 1.8 / this.currentScale : 0.8 / this.currentScale));
    this.root.selectAll<SVGTextElement, SimulationNode>('.atlas-label')
      .attr('opacity', (d) => this.facade.labelOpacity(d, focus, this.currentScale, this.linksByNode))
      .attr('font-size', (d) => (d.kind === 'concept' ? 10.5 : 8.5) / Math.max(this.currentScale * 0.7, 1));
    this.root.selectAll<SVGLineElement, SimulationLink>('.atlas-edge')
      .attr('stroke-width', (d) => this.facade.edgeWidth(d, this.currentScale));
  }

  // ─── Interaction callbacks ────────────────────────────────────────────────
  // These are dispatched as DOM custom events so the component can handle them.

  private nodeClickHandlers: Array<(node: SimulationNode) => void> = [];
  private bgClickHandlers: Array<() => void> = [];

  onNodeClickHandler(fn: (node: SimulationNode) => void): void {
    this.nodeClickHandlers.push(fn);
  }

  onBackgroundClickHandler(fn: () => void): void {
    this.bgClickHandlers.push(fn);
  }

  private onNodeClick(node: SimulationNode): void {
    this.nodeClickHandlers.forEach((fn) => fn(node));
  }

  private onBackgroundClick(): void {
    this.bgClickHandlers.forEach((fn) => fn());
  }

  private onNodeHover(node: SimulationNode, entering: boolean): void {
    this.root.selectAll<SVGCircleElement, SimulationNode>('.atlas-node')
      .filter((d) => d.id === node.id)
      .attr('stroke-width', entering ? 2.2 : (d) => (this.getFocusFromDOM().nodeId === d.id ? 1.8 : 0.8));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private buildAdjacency(edges: AtlasEdge[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }

  /**
   * Reads the current focus state from the DOM attribute rather than holding it as
   * component state — keeps the renderer decoupled from Angular signals.
   */
  private getFocusFromDOM(): FocusState {
    const attr = this.svg?.node()?.getAttribute('data-focus');
    if (!attr) return { kind: 'world' };
    try {
      return JSON.parse(attr) as FocusState;
    } catch {
      return { kind: 'world' };
    }
  }

  setFocusAttr(focus: FocusState): void {
    this.svg?.node()?.setAttribute('data-focus', JSON.stringify(focus));
  }
}

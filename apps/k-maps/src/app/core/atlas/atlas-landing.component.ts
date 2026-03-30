import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import * as d3 from 'd3';
import { firstValueFrom } from 'rxjs';

type NodeKind = 'concept' | 'claim' | 'evidence';
type FocusKind = 'world' | 'cluster' | 'concept' | 'claim' | 'evidence';

interface AtlasMeta {
  title: string;
  description: string;
  layout_mode: string;
  zoom_mode: string;
  default_view: string;
}

interface AtlasCluster {
  id: string;
  label: string;
  label_ar?: string;
  order: number;
  color: string;
  world_x: number;
  world_y: number;
  radius: number;
}

interface AtlasNode {
  id: string;
  kind: NodeKind;
  cluster_id: string;
  label: string;
  label_ar?: string;
  size: number;
  zoom_level: number;
  importance: number;
  fx_hint?: number;
  fy_hint?: number;
  time_start?: number;
  time_end?: number;
  evidence_type?: string;
}

interface AtlasEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
}

interface AtlasZoomView {
  id: string;
  label: string;
  x: number;
  y: number;
  k: number;
  cluster_id?: string;
  node_id?: string;
  show_kinds: Array<NodeKind | 'cluster'>;
  label_min_importance: number;
}

interface AtlasGraphData {
  schema_version: number;
  graph_id: string;
  meta: AtlasMeta;
  clusters: AtlasCluster[];
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  zoom_views: AtlasZoomView[];
}

interface FocusState {
  kind: FocusKind;
  clusterId?: string;
  nodeId?: string;
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  kind: NodeKind;
  label: string;
  label_ar?: string;
  cluster_id: string;
  size: number;
  importance: number;
  zoom_level: number;
  evidence_type?: string;
  time_start?: number;
  time_end?: number;
  hintX: number;
  hintY: number;
  homeX: number;
  homeY: number;
  phase: number;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  id: string;
  source: string | SimulationNode;
  target: string | SimulationNode;
  type: string;
  strength: number;
}

@Component({
  selector: 'km-atlas-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atlas-landing.component.html',
  styleUrl: './atlas-landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasLandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) private readonly hostRef!: ElementRef<HTMLElement>;
  @ViewChild('svgRoot', { static: true }) private readonly svgRef!: ElementRef<SVGSVGElement>;

  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);

  private readonly focus = signal<FocusState>({ kind: 'world' });

  private graphData: AtlasGraphData | null = null;
  private clusterMap = new Map<string, AtlasCluster>();
  private nodeMap = new Map<string, SimulationNode>();
  private edgeMap = new Map<string, AtlasEdge>();
  private zoomViews = new Map<string, AtlasZoomView>();
  private linksByNode = new Map<string, Set<string>>();

  private resizeObserver?: ResizeObserver;
  private simulation?: d3.Simulation<SimulationNode, SimulationLink>;
  private zoomBehavior?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private currentTransform = d3.zoomIdentity;

  private svg?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private scene?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private atmosphereLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private territoryLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private linkLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private nodeLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private labelLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private territorySelection?: d3.Selection<SVGGElement, AtlasCluster, SVGGElement, unknown>;
  private linkSelection?: d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown>;
  private nodeSelection?: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>;
  private labelSelection?: d3.Selection<SVGTextElement, SimulationNode, SVGGElement, unknown>;

  async ngAfterViewInit(): Promise<void> {
    this.graphData = await firstValueFrom(
      this.http.get<AtlasGraphData>('assets/data/worldview-graph.json'),
    );

    this.initialiseLookups(this.graphData);
    this.initialiseSvg();
    this.initialiseResizeObserver();
    this.initialiseGraph(this.graphData);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.simulation?.stop();
  }

  private initialiseLookups(data: AtlasGraphData): void {
    this.clusterMap = new Map(data.clusters.map((cluster) => [cluster.id, cluster]));
    this.zoomViews = new Map(data.zoom_views.map((view) => [view.id, view]));
    this.edgeMap = new Map(data.edges.map((edge) => [edge.id, edge]));
  }

  private initialiseSvg(): void {
    this.svg = d3.select(this.svgRef.nativeElement);
    this.svg.selectAll('*').remove();
    this.svg.attr('role', 'img').attr('aria-label', 'K-Maps worldview graph canvas');

    this.scene = this.svg.append('g').attr('class', 'atlas-canvas__scene');
    this.atmosphereLayer = this.scene.append('g').attr('class', 'atlas-canvas__atmosphere');
    this.territoryLayer = this.scene.append('g').attr('class', 'atlas-canvas__territories');
    this.linkLayer = this.scene.append('g').attr('class', 'atlas-canvas__links');
    this.nodeLayer = this.scene.append('g').attr('class', 'atlas-canvas__nodes');
    this.labelLayer = this.scene.append('g').attr('class', 'atlas-canvas__labels');

    this.zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.45, 5.5])
      .on('zoom', (event) => {
        this.currentTransform = event.transform;
        this.scene?.attr('transform', event.transform.toString());
        this.renderGraph();
      });

    this.svg
      .call(this.zoomBehavior)
      .on('dblclick.zoom', null)
      .on('click', (event) => {
        if (event.target === this.svgRef.nativeElement) {
          this.ngZone.run(() => this.setFocus({ kind: 'world' }));
        }
      });
  }

  private initialiseResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateViewport();
      this.applyFocusZoom(false);
      this.renderGraph();
    });
    this.resizeObserver.observe(this.hostRef.nativeElement);
  }

  private initialiseGraph(data: AtlasGraphData): void {
    this.updateViewport();
    this.renderAtmosphere();

    const nodes = data.nodes.map((node) => this.toSimulationNode(node));
    const links = data.edges.map((edge) => ({ ...edge })) as SimulationLink[];
    this.nodeMap = new Map(nodes.map((node) => [node.id, node]));
    this.linksByNode = this.createAdjacencyMap(data.edges);

    this.renderTerritories(data.clusters);
    this.renderLinks(links);
    this.renderNodes(nodes);
    this.renderLabels(nodes);

    this.simulation = d3
      .forceSimulation(nodes)
      .alpha(0.8)
      .alphaDecay(0.035)
      .velocityDecay(0.34)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(links)
          .id((node) => node.id)
          .distance((link) => this.linkDistance(link))
          .strength((link) => this.linkStrength(link)),
      )
      .force(
        'charge',
        d3.forceManyBody<SimulationNode>().strength((node) => this.chargeStrength(node)),
      )
      .force(
        'collide',
        d3.forceCollide<SimulationNode>().radius((node) => this.nodeRadius(node) + 16),
      )
      .force(
        'x',
        d3.forceX<SimulationNode>((node) => node.homeX).strength((node) => this.anchorStrength(node)),
      )
      .force(
        'y',
        d3.forceY<SimulationNode>((node) => node.homeY).strength((node) => this.anchorStrength(node)),
      )
      .on('tick', () => this.renderGraph());

    this.setFocus({ kind: 'world' }, false);
    this.simulation.alpha(1).restart();
  }

  private createAdjacencyMap(edges: AtlasEdge[]): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, new Set<string>());
      }
      if (!adjacency.has(edge.target)) {
        adjacency.set(edge.target, new Set<string>());
      }
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
    }
    return adjacency;
  }

  private toSimulationNode(node: AtlasNode): SimulationNode {
    const cluster = this.clusterMap.get(node.cluster_id);
    const hintX = node.fx_hint ?? cluster?.world_x ?? 0;
    const hintY = node.fy_hint ?? cluster?.world_y ?? 0;
    const timeMid = ((node.time_start ?? 0) + (node.time_end ?? node.time_start ?? 0)) / 2;
    const eraFactor = d3.scaleLinear().domain([-2600, 2100]).range([0.75, 1.25]).clamp(true)(timeMid);
    const clusterX = cluster?.world_x ?? 0;
    const clusterY = cluster?.world_y ?? 0;
    const dx = hintX - clusterX;
    const dy = hintY - clusterY;

    return {
      id: node.id,
      kind: node.kind,
      label: node.label,
      label_ar: node.label_ar,
      cluster_id: node.cluster_id,
      size: node.size,
      importance: node.importance,
      zoom_level: node.zoom_level,
      evidence_type: node.evidence_type,
      time_start: node.time_start,
      time_end: node.time_end,
      hintX,
      hintY,
      homeX: clusterX + dx * eraFactor,
      homeY: clusterY + dy * eraFactor,
      x: hintX,
      y: hintY,
      vx: 0,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
    };
  }

  private renderAtmosphere(): void {
    if (!this.atmosphereLayer) {
      return;
    }

    const stars = d3.range(140).map((index) => ({
      id: index,
      x: Math.sin(index * 12.44) * 760,
      y: Math.cos(index * 7.38) * 520,
      r: 0.6 + (index % 3) * 0.45,
      opacity: 0.08 + (index % 5) * 0.025,
    }));

    this.atmosphereLayer
      .append('g')
      .attr('class', 'atlas-canvas__halo-field')
      .selectAll('circle')
      .data([
        { x: -380, y: -240, r: 420, className: 'is-blue' },
        { x: 210, y: -190, r: 340, className: 'is-gold' },
        { x: 120, y: 280, r: 380, className: 'is-cyan' },
      ])
      .join('circle')
      .attr('class', (d) => `atlas-canvas__halo ${d.className}`)
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.r);

    this.atmosphereLayer
      .append('g')
      .attr('class', 'atlas-canvas__star-field')
      .selectAll('circle')
      .data(stars)
      .join('circle')
      .attr('class', 'atlas-canvas__star')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.r)
      .attr('opacity', (d) => d.opacity);
  }

  private renderTerritories(clusters: AtlasCluster[]): void {
    if (!this.territoryLayer) {
      return;
    }

    this.territorySelection = this.territoryLayer
      .selectAll<SVGGElement, AtlasCluster>('g')
      .data(clusters, (cluster) => cluster.id)
      .join((enter) => {
        const group = enter.append('g').attr('class', 'atlas-canvas__territory');
        group
          .append('circle')
          .attr('class', 'atlas-canvas__territory-ring')
          .attr('fill', 'none');
        group.append('circle').attr('class', 'atlas-canvas__territory-core');
        group.append('text').attr('class', 'atlas-canvas__territory-label');
        return group;
      })
      .attr('data-cluster-id', (cluster) => cluster.id)
      .on('click', (_, cluster) => {
        this.ngZone.run(() =>
          this.setFocus({ kind: 'cluster', clusterId: cluster.id }),
        );
      });

    this.territorySelection
      .select<SVGCircleElement>('circle.atlas-canvas__territory-ring')
      .attr('cx', (cluster) => cluster.world_x)
      .attr('cy', (cluster) => cluster.world_y)
      .attr('r', (cluster) => cluster.radius)
      .attr('stroke', (cluster) => cluster.color);

    this.territorySelection
      .select<SVGCircleElement>('circle.atlas-canvas__territory-core')
      .attr('cx', (cluster) => cluster.world_x)
      .attr('cy', (cluster) => cluster.world_y)
      .attr('r', (cluster) => cluster.radius * 0.9)
      .attr('fill', (cluster) => cluster.color);

    this.territorySelection
      .select<SVGTextElement>('text.atlas-canvas__territory-label')
      .attr('x', (cluster) => cluster.world_x)
      .attr('y', (cluster) => cluster.world_y - cluster.radius * 0.78)
      .text((cluster) => cluster.label);
  }

  private renderLinks(links: SimulationLink[]): void {
    if (!this.linkLayer) {
      return;
    }

    this.linkSelection = this.linkLayer
      .selectAll<SVGLineElement, SimulationLink>('line')
      .data(links, (link) => link.id)
      .join('line')
      .attr('class', (link) => `atlas-canvas__link atlas-canvas__link--${this.edgeSlug(link.type)}`);
  }

  private renderNodes(nodes: SimulationNode[]): void {
    if (!this.nodeLayer) {
      return;
    }

    this.nodeSelection = this.nodeLayer
      .selectAll<SVGGElement, SimulationNode>('g')
      .data(nodes, (node) => node.id)
      .join((enter) => {
        const group = enter
          .append('g')
          .attr('class', (node) => `atlas-canvas__node atlas-canvas__node--${node.kind}`);

        group.append('circle').attr('class', 'atlas-canvas__node-glow');
        group.append('circle').attr('class', 'atlas-canvas__node-core');
        return group;
      })
      .attr('data-node-id', (node) => node.id)
      .on('click', (_, node) => {
        this.ngZone.run(() => this.setFocus(this.focusForNode(node)));
      });

    this.nodeSelection
      .select<SVGCircleElement>('circle.atlas-canvas__node-glow')
      .attr('r', (node) => this.nodeRadius(node) * 2.15)
      .attr('fill', (node) => this.clusterMap.get(node.cluster_id)?.color ?? '#ffffff');

    this.nodeSelection
      .select<SVGCircleElement>('circle.atlas-canvas__node-core')
      .attr('r', (node) => this.nodeRadius(node))
      .attr('fill', (node) => this.nodeFill(node))
      .attr('stroke', (node) => this.nodeStroke(node));
  }

  private renderLabels(nodes: SimulationNode[]): void {
    if (!this.labelLayer) {
      return;
    }

    this.labelSelection = this.labelLayer
      .selectAll<SVGTextElement, SimulationNode>('text')
      .data(nodes, (node) => node.id)
      .join('text')
      .attr('class', (node) => `atlas-canvas__label atlas-canvas__label--${node.kind}`)
      .text((node) => node.label)
      .on('click', (_, node) => {
        this.ngZone.run(() => this.setFocus(this.focusForNode(node)));
      });
  }

  private renderGraph(): void {
    if (!this.graphData || !this.nodeSelection || !this.linkSelection || !this.labelSelection) {
      return;
    }

    const focus = this.focus();
    const scale = this.currentTransform.k || 1;

    this.linkSelection
      .attr('x1', (link) => this.resolveNode(link.source)?.x ?? 0)
      .attr('y1', (link) => this.resolveNode(link.source)?.y ?? 0)
      .attr('x2', (link) => this.resolveNode(link.target)?.x ?? 0)
      .attr('y2', (link) => this.resolveNode(link.target)?.y ?? 0)
      .attr('stroke', (link) => this.edgeStroke(link))
      .attr('stroke-width', (link) => this.edgeWidth(link, scale))
      .attr('stroke-opacity', (link) => this.edgeOpacity(link, focus, scale));

    this.nodeSelection
      .attr('transform', (node) => `translate(${node.x ?? node.homeX}, ${node.y ?? node.homeY})`)
      .attr('opacity', (node) => this.nodeOpacity(node, focus, scale))
      .attr('class', (node) => `${this.nodeClass(node)}${this.isFocusedNode(node, focus) ? ' is-focused' : ''}`);

    this.labelSelection
      .attr('x', (node) => node.x ?? node.homeX)
      .attr('y', (node) => (node.y ?? node.homeY) - this.nodeRadius(node) - 14)
      .attr('opacity', (node) => this.labelOpacity(node, focus, scale))
      .attr('text-anchor', 'middle');

    this.territorySelection
      ?.attr('opacity', (cluster) => this.clusterOpacity(cluster, focus, scale))
      .attr('class', (cluster) => this.territoryClass(cluster, focus));

  }

  private setFocus(focus: FocusState, animate = true): void {
    this.focus.set(focus);
    this.applyFocusZoom(animate);
    this.renderGraph();
  }

  private applyFocusZoom(animate = true): void {
    if (!this.graphData || !this.zoomBehavior || !this.svg) {
      return;
    }

    const target = this.buildZoomTransform(this.focus());
    const selection = animate ? this.svg.transition().duration(1400).ease(d3.easeCubicInOut) : this.svg;
    selection.call(this.zoomBehavior.transform, target);
  }

  private buildZoomTransform(focus: FocusState): d3.ZoomTransform {
    const { width, height } = this.viewport();
    const defaultWorld = this.zoomViews.get('view_world');

    if (focus.kind === 'world') {
      const k = defaultWorld?.k ?? 0.58;
      return d3.zoomIdentity.translate(width / 2, height / 2).scale(k).translate(-(defaultWorld?.x ?? 0), -(defaultWorld?.y ?? 0));
    }

    if (focus.kind === 'cluster' && focus.clusterId) {
      const zoomView = Array.from(this.zoomViews.values()).find((view) => view.cluster_id === focus.clusterId);
      const cluster = this.clusterMap.get(focus.clusterId);
      if (zoomView) {
        return d3.zoomIdentity.translate(width / 2, height / 2).scale(zoomView.k).translate(-zoomView.x, -zoomView.y);
      }
      if (cluster) {
        const scale = this.fitScale(cluster.radius * 2.45);
        return d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-cluster.world_x, -cluster.world_y);
      }
    }

    if (focus.nodeId) {
      const zoomView = Array.from(this.zoomViews.values()).find((view) => view.node_id === focus.nodeId);
      const node = this.nodeMap.get(focus.nodeId);
      if (zoomView) {
        return d3.zoomIdentity.translate(width / 2, height / 2).scale(zoomView.k).translate(-zoomView.x, -zoomView.y);
      }
      if (node) {
        const radius = focus.kind === 'concept' ? 250 : focus.kind === 'claim' ? 170 : 125;
        const scale = this.fitScale(radius);
        return d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-(node.x ?? node.homeX), -(node.y ?? node.homeY));
      }
    }

    return d3.zoomIdentity.translate(width / 2, height / 2).scale(0.58);
  }

  private fitScale(radius: number): number {
    const { width, height } = this.viewport();
    return d3.scaleLinear().domain([180, 760]).range([2.7, 0.72]).clamp(true)(radius) * Math.min(width / 1440, 1.08);
  }

  private viewport(): { width: number; height: number } {
    const host = this.hostRef.nativeElement;
    return {
      width: Math.max(host.clientWidth, 1280),
      height: Math.max(host.clientHeight, 720),
    };
  }

  private updateViewport(): void {
    const { width, height } = this.viewport();
    this.svg?.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);
  }

  private focusForNode(node: SimulationNode): FocusState {
    return {
      kind: node.kind,
      clusterId: node.cluster_id,
      nodeId: node.id,
    };
  }

  private resolveNode(node: string | SimulationNode): SimulationNode | undefined {
    return typeof node === 'string' ? this.nodeMap.get(node) : node;
  }

  private linkDistance(link: SimulationLink): number {
    const source = this.resolveNode(link.source);
    const target = this.resolveNode(link.target);
    if (!source || !target) {
      return 140;
    }
    if (source.kind === 'concept' && target.kind === 'claim') {
      return 120;
    }
    if (source.kind === 'claim' && target.kind === 'evidence') {
      return 86;
    }
    if (source.kind === 'concept' && target.kind === 'concept') {
      return 188;
    }
    return 150;
  }

  private linkStrength(link: SimulationLink): number {
    const source = this.resolveNode(link.source);
    const target = this.resolveNode(link.target);
    if (!source || !target) {
      return 0.18;
    }
    const kindBonus =
      source.kind === 'claim' || target.kind === 'claim'
        ? 0.18
        : source.kind === 'evidence' || target.kind === 'evidence'
          ? 0.08
          : 0;
    return Math.min(0.78, 0.14 + link.strength * 0.46 + kindBonus);
  }

  private chargeStrength(node: SimulationNode): number {
    switch (node.kind) {
      case 'concept':
        return -340;
      case 'claim':
        return -210;
      default:
        return -98;
    }
  }

  private anchorStrength(node: SimulationNode): number {
    switch (node.kind) {
      case 'concept':
        return 0.15;
      case 'claim':
        return 0.18;
      default:
        return 0.22;
    }
  }

  private nodeRadius(node: SimulationNode): number {
    switch (node.kind) {
      case 'concept':
        return node.size * 0.48;
      case 'claim':
        return node.size * 0.42;
      default:
        return node.size * 0.36;
    }
  }

  private nodeFill(node: SimulationNode): string {
    const clusterColor = d3.color(this.clusterMap.get(node.cluster_id)?.color ?? '#ffffff');
    if (!clusterColor) {
      return '#ffffff';
    }
    const rgb = clusterColor.rgb();
    if (node.kind === 'concept') {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`;
    }
    if (node.kind === 'claim') {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`;
    }
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.09)`;
  }

  private nodeStroke(node: SimulationNode): string {
    const clusterColor = d3.color(this.clusterMap.get(node.cluster_id)?.color ?? '#ffffff');
    if (!clusterColor) {
      return 'rgba(255,255,255,0.6)';
    }
    const rgb = clusterColor.rgb();
    const opacity = node.kind === 'concept' ? 0.86 : node.kind === 'claim' ? 0.58 : 0.38;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  }

  private edgeStroke(link: SimulationLink): string {
    const source = this.resolveNode(link.source);
    const sourceColor = d3.color(
      source ? this.clusterMap.get(source.cluster_id)?.color ?? '#ffffff' : '#ffffff',
    )?.rgb();
    if (!sourceColor) {
      return 'rgba(255,255,255,0.18)';
    }

    if (link.type === 'contrasts' || link.type === 'questions') {
      return `rgba(244, 124, 104, 0.42)`;
    }
    if (link.type === 'scriptural_anchor' || link.type === 'ritual_anchor') {
      return `rgba(218, 197, 121, 0.44)`;
    }
    return `rgba(${sourceColor.r}, ${sourceColor.g}, ${sourceColor.b}, 0.28)`;
  }

  private edgeWidth(link: SimulationLink, scale: number): number {
    const base = link.type === 'contrasts' ? 1.3 : 1;
    return base / Math.max(scale * 0.65, 1);
  }

  private edgeOpacity(link: SimulationLink, focus: FocusState, scale: number): number {
    const source = this.resolveNode(link.source);
    const target = this.resolveNode(link.target);
    if (!source || !target) {
      return 0.1;
    }

    const revealFloor = scale < 0.9 ? 0.04 : scale < 1.6 ? 0.08 : 0.14;
    if (focus.kind === 'world') {
      return source.kind === 'concept' && target.kind === 'concept'
        ? revealFloor + 0.06
        : scale > 1.5
          ? revealFloor
          : 0.01;
    }

    if (focus.kind === 'cluster') {
      const inCluster = source.cluster_id === focus.clusterId && target.cluster_id === focus.clusterId;
      return inCluster ? 0.28 : 0.02;
    }

    const focusId = focus.nodeId;
    const connectsFocus = source.id === focusId || target.id === focusId;
    const adjacent = focusId
      ? this.linksByNode.get(focusId)?.has(source.id) || this.linksByNode.get(focusId)?.has(target.id)
      : false;

    if (focus.kind === 'concept') {
      return connectsFocus || adjacent ? 0.34 : 0.015;
    }
    if (focus.kind === 'claim') {
      return connectsFocus || adjacent ? 0.42 : 0.012;
    }
    return connectsFocus ? 0.46 : 0.008;
  }

  private nodeOpacity(node: SimulationNode, focus: FocusState, scale: number): number {
    const visibleByZoom =
      node.kind === 'concept'
        ? 1
        : node.kind === 'claim'
          ? scale > 1.15
            ? 1
            : 0.04
          : scale > 1.95
            ? 1
            : 0.02;

    if (focus.kind === 'world') {
      if (node.kind === 'concept') {
        return 0.9;
      }
      return visibleByZoom * 0.7;
    }

    if (focus.kind === 'cluster') {
      return node.cluster_id === focus.clusterId ? visibleByZoom : 0.05;
    }

    if (node.id === focus.nodeId) {
      return 1;
    }

    const linkedToFocus = focus.nodeId ? this.linksByNode.get(focus.nodeId)?.has(node.id) : false;
    if (focus.kind === 'concept') {
      return linkedToFocus || node.cluster_id === focus.clusterId ? visibleByZoom * 0.86 : 0.04;
    }
    if (focus.kind === 'claim') {
      return linkedToFocus || node.id === focus.nodeId ? visibleByZoom * 0.94 : 0.03;
    }
    return linkedToFocus ? visibleByZoom * 0.9 : 0.02;
  }

  private labelOpacity(node: SimulationNode, focus: FocusState, scale: number): number {
    const threshold =
      node.kind === 'concept' ? 0.72 : node.kind === 'claim' ? 1.34 : 2.22;
    const importantEnough = node.importance >= (scale < 1 ? 8 : scale < 2 ? 5 : 1);
    if (scale < threshold || !importantEnough) {
      return 0;
    }

    if (focus.kind === 'world') {
      return node.kind === 'concept' ? 0.88 : 0;
    }

    if (focus.kind === 'cluster') {
      return node.cluster_id === focus.clusterId ? 0.82 : 0;
    }

    if (node.id === focus.nodeId) {
      return 1;
    }

    const adjacent = focus.nodeId ? this.linksByNode.get(focus.nodeId)?.has(node.id) : false;
    if (adjacent) {
      return 0.86;
    }

    return focus.kind === 'concept' && node.cluster_id === focus.clusterId ? 0.34 : 0;
  }

  private clusterOpacity(cluster: AtlasCluster, focus: FocusState, scale: number): number {
    if (focus.kind === 'world') {
      return scale < 0.9 ? 0.88 : 0.62;
    }
    if (focus.clusterId === cluster.id) {
      return 0.96;
    }
    return 0.09;
  }

  private territoryClass(cluster: AtlasCluster, focus: FocusState): string {
    const selected = focus.clusterId === cluster.id ? ' is-focused' : '';
    return `atlas-canvas__territory${selected}`;
  }

  private nodeClass(node: SimulationNode): string {
    return `atlas-canvas__node atlas-canvas__node--${node.kind}`;
  }

  private isFocusedNode(node: SimulationNode, focus: FocusState): boolean {
    return focus.nodeId === node.id;
  }

  private edgeSlug(edgeType: string): string {
    return edgeType.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  }
}

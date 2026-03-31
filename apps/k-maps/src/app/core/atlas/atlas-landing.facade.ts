import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import * as d3 from 'd3';
import { firstValueFrom } from 'rxjs';
import {
  SUPPLEMENTAL_CLUSTERS,
  SUPPLEMENTAL_EDGES,
  SUPPLEMENTAL_NODES,
  SUPPLEMENTAL_VIEWS,
} from './atlas.data';
import {
  AtlasCluster,
  AtlasEdge,
  AtlasGraphData,
  AtlasGraphLookups,
  AtlasNode,
  FocusState,
  SimulationLink,
  SimulationNode,
} from './atlas.models';

@Injectable({ providedIn: 'root' })
export class AtlasLandingFacade {
  private readonly http = inject(HttpClient);

  async loadGraphData(): Promise<AtlasGraphData> {
    const rawData = await firstValueFrom(
      this.http.get<AtlasGraphData>('assets/data/worldview-graph.json'),
    );

    return {
      ...rawData,
      clusters: [...rawData.clusters, ...SUPPLEMENTAL_CLUSTERS],
      nodes: [...rawData.nodes, ...SUPPLEMENTAL_NODES],
      edges: [...rawData.edges, ...SUPPLEMENTAL_EDGES],
      zoom_views: [...rawData.zoom_views, ...SUPPLEMENTAL_VIEWS],
    };
  }

  createLookups(data: AtlasGraphData): AtlasGraphLookups {
    return {
      clusterMap: new Map(data.clusters.map((cluster) => [cluster.id, cluster])),
      zoomViews: new Map(data.zoom_views.map((view) => [view.id, view])),
      linksByNode: this.createAdjacencyMap(data.edges),
    };
  }

  buildAutoTourSequence(data: AtlasGraphData): FocusState[] {
    const orderedClusters = [...data.clusters].sort((a, b) => a.order - b.order);
    const nodesByCluster = d3.group(data.nodes, (node) => node.cluster_id);
    const sequence: FocusState[] = [{ kind: 'world' }];

    for (const cluster of orderedClusters) {
      const clusterNodes = nodesByCluster.get(cluster.id) ?? [];
      const topConcept = clusterNodes
        .filter((node) => node.kind === 'concept')
        .sort((a, b) => b.importance - a.importance)[0];
      const topClaim = clusterNodes
        .filter((node) => node.kind === 'claim')
        .sort((a, b) => b.importance - a.importance)[0];

      sequence.push({ kind: 'cluster', clusterId: cluster.id });
      if (topConcept) {
        sequence.push({ kind: 'concept', clusterId: cluster.id, nodeId: topConcept.id });
      }
      if (topClaim) {
        sequence.push({ kind: 'claim', clusterId: cluster.id, nodeId: topClaim.id });
      }
    }

    sequence.push({ kind: 'world' });
    return sequence;
  }

  toSimulationNode(node: AtlasNode, clusterMap: Map<string, AtlasCluster>): SimulationNode {
    const cluster = clusterMap.get(node.cluster_id);
    const baseX = (cluster?.world_x ?? 0) + (node.fx_hint ?? 0);
    const baseY = (cluster?.world_y ?? 0) + (node.fy_hint ?? 0);

    let ringOffset = 0;
    if (node.kind === 'claim') {
      ringOffset = 28;
    } else if (node.kind === 'evidence') {
      ringOffset = 54;
    }

    return {
      ...node,
      hintX: baseX,
      hintY: baseY,
      homeX: baseX + Math.cos(node.importance * 0.66) * ringOffset,
      homeY: baseY + Math.sin(node.importance * 0.83) * ringOffset,
      phase: (node.time_start ?? 0) / 120,
      x: baseX,
      y: baseY,
      vx: 0,
      vy: 0,
    };
  }

  focusForNode(node: SimulationNode): FocusState {
    return {
      kind: node.kind,
      clusterId: node.cluster_id,
      nodeId: node.id,
    };
  }

  shortLabel(node: SimulationNode): string {
    if (node.kind === 'concept') {
      return node.label.length > 20 ? `${node.label.slice(0, 20).trim()}…` : node.label;
    }

    const compact = node.label
      .replace(/^The\s+/i, '')
      .replace(/^Modern\s+/i, '')
      .replace(/^Historical\s+/i, '');

    if (compact.length <= 26) {
      return compact;
    }

    const words = compact.split(' ');
    const short = words.slice(0, 3).join(' ');
    return short.length < compact.length ? `${short}…` : short;
  }

  linkDistance(link: SimulationLink, resolveNode: (node: string | SimulationNode) => SimulationNode | undefined): number {
    const source = resolveNode(link.source);
    const target = resolveNode(link.target);
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

  linkStrength(link: SimulationLink, resolveNode: (node: string | SimulationNode) => SimulationNode | undefined): number {
    const source = resolveNode(link.source);
    const target = resolveNode(link.target);
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

  chargeStrength(node: SimulationNode): number {
    switch (node.kind) {
      case 'concept':
        return -340;
      case 'claim':
        return -210;
      default:
        return -98;
    }
  }

  anchorStrength(node: SimulationNode): number {
    switch (node.kind) {
      case 'concept':
        return 0.15;
      case 'claim':
        return 0.18;
      default:
        return 0.22;
    }
  }

  nodeRadius(node: SimulationNode): number {
    switch (node.kind) {
      case 'concept':
        return node.size * 0.48;
      case 'claim':
        return node.size * 0.42;
      default:
        return node.size * 0.36;
    }
  }

  nodeFill(node: SimulationNode, clusterMap: Map<string, AtlasCluster>): string {
    const clusterColor = d3.color(clusterMap.get(node.cluster_id)?.color ?? '#ffffff');
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

  nodeStroke(node: SimulationNode, clusterMap: Map<string, AtlasCluster>): string {
    const clusterColor = d3.color(clusterMap.get(node.cluster_id)?.color ?? '#ffffff');
    if (!clusterColor) {
      return 'rgba(255,255,255,0.6)';
    }
    const rgb = clusterColor.rgb();
    const opacity = node.kind === 'concept' ? 0.86 : node.kind === 'claim' ? 0.58 : 0.38;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  }

  edgeStroke(
    link: SimulationLink,
    clusterMap: Map<string, AtlasCluster>,
    resolveNode: (node: string | SimulationNode) => SimulationNode | undefined,
  ): string {
    const source = resolveNode(link.source);
    const sourceColor = d3.color(
      source ? clusterMap.get(source.cluster_id)?.color ?? '#ffffff' : '#ffffff',
    )?.rgb();
    if (!sourceColor) {
      return 'rgba(255,255,255,0.18)';
    }

    if (link.type === 'contrasts' || link.type === 'questions') {
      return 'rgba(244, 124, 104, 0.42)';
    }
    if (link.type === 'scriptural_anchor' || link.type === 'ritual_anchor') {
      return 'rgba(218, 197, 121, 0.44)';
    }
    return `rgba(${sourceColor.r}, ${sourceColor.g}, ${sourceColor.b}, 0.28)`;
  }

  edgeWidth(link: SimulationLink, scale: number): number {
    const base = link.type === 'contrasts' ? 1.3 : 1;
    return base / Math.max(scale * 0.65, 1);
  }

  edgeOpacity(
    link: SimulationLink,
    focus: FocusState,
    scale: number,
    linksByNode: Map<string, Set<string>>,
    resolveNode: (node: string | SimulationNode) => SimulationNode | undefined,
  ): number {
    const source = resolveNode(link.source);
    const target = resolveNode(link.target);
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
      ? linksByNode.get(focusId)?.has(source.id) || linksByNode.get(focusId)?.has(target.id)
      : false;

    if (focus.kind === 'concept') {
      return connectsFocus || adjacent ? 0.34 : 0.015;
    }
    if (focus.kind === 'claim') {
      return connectsFocus || adjacent ? 0.42 : 0.012;
    }
    return connectsFocus ? 0.46 : 0.008;
  }

  nodeOpacity(
    node: SimulationNode,
    focus: FocusState,
    scale: number,
    linksByNode: Map<string, Set<string>>,
  ): number {
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
        return 0.94;
      }
      if (node.kind === 'claim') {
        return 0.16;
      }
      return 0.06;
    }

    if (focus.kind === 'cluster') {
      return node.cluster_id === focus.clusterId ? visibleByZoom : 0.05;
    }

    if (node.id === focus.nodeId) {
      return 1;
    }

    const linkedToFocus = focus.nodeId ? linksByNode.get(focus.nodeId)?.has(node.id) : false;
    if (focus.kind === 'concept') {
      return linkedToFocus || node.cluster_id === focus.clusterId ? visibleByZoom * 0.86 : 0.04;
    }
    if (focus.kind === 'claim') {
      return linkedToFocus || node.id === focus.nodeId ? visibleByZoom * 0.94 : 0.03;
    }
    return linkedToFocus ? visibleByZoom * 0.9 : 0.02;
  }

  labelOpacity(node: SimulationNode, focus: FocusState, scale: number, linksByNode: Map<string, Set<string>>): number {
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

    const adjacent = focus.nodeId ? linksByNode.get(focus.nodeId)?.has(node.id) : false;
    if (adjacent) {
      return 0.86;
    }

    return focus.kind === 'concept' && node.cluster_id === focus.clusterId ? 0.34 : 0;
  }

  clusterOpacity(cluster: AtlasCluster, focus: FocusState, scale: number): number {
    if (focus.kind === 'world') {
      return scale < 0.9 ? 0.88 : 0.62;
    }
    if (focus.clusterId === cluster.id) {
      return 0.96;
    }
    return 0.09;
  }

  territoryClass(cluster: AtlasCluster, focus: FocusState): string {
    const selected = focus.clusterId === cluster.id ? ' is-focused' : '';
    return `atlas-canvas__territory${selected}`;
  }

  nodeClass(node: SimulationNode): string {
    return `atlas-canvas__node atlas-canvas__node--${node.kind}`;
  }

  isFocusedNode(node: SimulationNode, focus: FocusState): boolean {
    return focus.nodeId === node.id;
  }

  edgeSlug(edgeType: string): string {
    return edgeType.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
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
}

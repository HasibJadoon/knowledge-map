import * as d3 from 'd3';

export type NodeKind = 'concept' | 'claim' | 'evidence';
export type FocusKind = 'world' | 'cluster' | 'concept' | 'claim' | 'evidence';
export type ZoomTriple = [number, number, number];

export interface AtlasMeta {
  title: string;
  description: string;
  layout_mode: string;
  zoom_mode: string;
  default_view: string;
}

export interface AtlasCluster {
  id: string;
  label: string;
  label_ar?: string;
  order: number;
  color: string;
  world_x: number;
  world_y: number;
  radius: number;
}

export interface AtlasNode {
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

export interface AtlasEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
}

export interface AtlasZoomView {
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

export interface AtlasGraphData {
  schema_version: number;
  graph_id: string;
  meta: AtlasMeta;
  clusters: AtlasCluster[];
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  zoom_views: AtlasZoomView[];
}

export interface FocusState {
  kind: FocusKind;
  clusterId?: string;
  nodeId?: string;
}

export interface SimulationNode extends d3.SimulationNodeDatum {
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

export interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  id: string;
  source: string | SimulationNode;
  target: string | SimulationNode;
  type: string;
  strength: number;
}

export interface EdgeWord {
  text: string;
  offset: number;
  size: number;
  alpha: number;
  delay: number;
  tilt: number;
}

export interface AtlasGraphLookups {
  clusterMap: Map<string, AtlasCluster>;
  zoomViews: Map<string, AtlasZoomView>;
  linksByNode: Map<string, Set<string>>;
}

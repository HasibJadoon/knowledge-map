import * as d3 from 'd3';

export type NodeKind = 'concept' | 'claim' | 'evidence';
export type FocusKind =
  | 'world'
  | 'cluster'
  | 'concept'
  | 'claim'
  | 'evidence'
  | 'divine'
  | 'revelation_ring'
  | 'book_ring'
  | 'prophet_ring'
  | 'opposition'
  | 'worldview_ring';
export type ZoomTriple = [number, number, number];
export type AtlasSemanticNodeType =
  | 'divine_center'
  | 'revelation_core'
  | 'attribute'
  | 'book'
  | 'prophet'
  | 'concept'
  | 'claim'
  | 'evidence'
  | 'opposition_core'
  | 'corruption_vector'
  | 'worldview_cluster'
  | 'covenant_theme'
  | 'moral_theme'
  | 'eschatology_theme';
export type AtlasSemanticPolarity = 'guidance' | 'warning' | 'corruption' | 'restoration';
export type SacredRingId =
  | 'divine'
  | 'revelation-core'
  | 'attributes'
  | 'books'
  | 'prophets'
  | 'meanings'
  | 'human-drama'
  | 'opposition'
  | 'worldview';

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
  semanticId?: string;
  ringId?: SacredRingId;
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

export interface AtlasConstellationBody {
  id: string;
  label: string;
  short_label?: string;
  x: number;
  y: number;
  r: number;
  glow: number;
  opacity: number;
  color: string;
  kind?: 'primary' | 'satellite' | 'prophet' | 'event' | 'scholar' | 'book' | 'attribute';
  label_size?: number;
  label_opacity?: number;
}

export interface AtlasConstellationRay {
  source: string;
  target: string;
  opacity?: number;
}

export interface AtlasConstellationLayer {
  id: string;
  label: string;
  label_x: number;
  label_y: number;
  color: string;
  opacity?: number;
  bodies: AtlasConstellationBody[];
  rays?: AtlasConstellationRay[];
}

export interface SacredAtlasRing {
  id: SacredRingId;
  label: string;
  radius: number;
  color: string;
  opacity: number;
  halo?: number;
  labelAngle?: number;
  labelOffset?: number;
}

export interface SacredAtlasNode {
  id: string;
  label: string;
  label_ar?: string;
  type: AtlasSemanticNodeType;
  symbolic_role: string;
  theological_weight: number;
  visual_tier: number;
  luminosity: number;
  ring: SacredRingId;
  orbit_priority: number;
  angle: number;
  radius_offset?: number;
  meaning_summary: string;
  polarity: AtlasSemanticPolarity;
  relation_to_center: string;
  relation_to_quran: string;
  relation_to_human_response: string;
  color: string;
  glow: number;
  linked_cluster_id?: string;
}

export interface SacredAtlasLink {
  id: string;
  source: string;
  target: string;
  kind: 'emanates' | 'reveals' | 'guides' | 'echoes' | 'warns' | 'distorts' | 'restores';
  strength: number;
  polarity: AtlasSemanticPolarity;
}

export interface SacredAtlasScene {
  id: string;
  title: string;
  subtitle: string;
  origin: { x: number; y: number };
  divine_center_id: string;
  revelation_core_id: string;
  opposition_core_id: string;
  rings: SacredAtlasRing[];
  nodes: SacredAtlasNode[];
  links: SacredAtlasLink[];
}

export interface SacredAtlasProjection extends SacredAtlasNode {
  x: number;
  y: number;
  radius: number;
  label_x: number;
  label_y: number;
  label_anchor: 'start' | 'middle' | 'end';
}

export interface AtlasFocusCard {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  polarity: AtlasSemanticPolarity;
  relationToCenter: string;
  relationToQuran: string;
  relationToHumanResponse: string;
}

export interface AtlasGraphLookups {
  clusterMap: Map<string, AtlasCluster>;
  zoomViews: Map<string, AtlasZoomView>;
  linksByNode: Map<string, Set<string>>;
}

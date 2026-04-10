import * as d3 from 'd3';

// ─── Scene layers ────────────────────────────────────────────────────────────

/** The four navigation layers. Sky is the outermost; history the innermost. */
export type SceneLayer = 'sky' | 'constellation' | 'node' | 'history';

/** Legacy focus kinds preserved for backwards-compat with graph-renderer helpers. */
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

// ─── Node taxonomy ──────────────────────────────────────────────────────────

export type NodeKind = 'concept' | 'claim' | 'evidence';

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

/** Extended node role used in the new scene system. */
export type NodeRole =
  | 'sacred_core'
  | 'constellation_anchor'
  | 'secondary_star'
  | 'concept'
  | 'claim'
  | 'evidence'
  | 'history_marker'
  | 'timeline_bridge';

// ─── Sacred rings ────────────────────────────────────────────────────────────

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

// ─── Visual tiers ────────────────────────────────────────────────────────────

/** 1 = dominant (Qur'an), 5 = most detail (history). */
export type VisualTier = 1 | 2 | 3 | 4 | 5;

// ─── Era / history metadata ─────────────────────────────────────────────────

export interface HistoricalEra {
  era_id: string;
  era_label: string;
  era_order: number;
  time_start: number;   // year (negative = BCE)
  time_end: number;
  color?: string;
}

export interface HistoricalWaypoint {
  id: string;
  node_id: string;
  era_id: string;
  label: string;
  label_ar?: string;
  time_start: number;
  time_end?: number;
  historical_role: string;
  source_type: string;
  display_group: string;
  detail?: string;
}

// ─── Constellation model ─────────────────────────────────────────────────────

export interface ConstellationStar {
  id: string;
  label: string;
  label_ar?: string;
  x: number;
  y: number;
  r: number;
  luminosity: number;
  role: 'anchor' | 'secondary' | 'prophet' | 'book' | 'attribute' | 'event';
  morph_node_id?: string;
  history_seed?: boolean;
}

export interface ConstellationLine {
  source: string;
  target: string;
  weight?: number;
}

export interface ConstellationLayer {
  id: string;
  label: string;
  label_ar?: string;
  quran_centrality: number;
  sacred_weight: number;
  worldview_weight: number;
  history_weight: number;
  visual_tier: VisualTier;
  color: string;
  glow: number;
  sky_x: number;
  sky_y: number;
  stars: ConstellationStar[];
  lines: ConstellationLine[];
  linked_cluster_id?: string;
  camera_anchor_star_id?: string;
}

// ─── Graph data model ────────────────────────────────────────────────────────

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
  sacred_weight?: number;
  quran_centrality?: number;
  focus_priority?: number;
  label_priority?: number;
  depth_layer?: number;
  constellation_group_id?: string;
  morph_anchor_id?: string;
  camera_target?: boolean;
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

// ─── Focus / scene state ─────────────────────────────────────────────────────

export interface FocusState {
  kind: FocusKind;
  clusterId?: string;
  nodeId?: string;
  semanticId?: string;
  ringId?: SacredRingId;
}

/**
 * Primary scene state for the 4-layer navigation model.
 * This drives atlas-scene-controller.service and replaces FocusState in the orchestrator.
 */
export interface SceneState {
  layer: SceneLayer;
  constellationId?: string;
  clusterId?: string;
  nodeId?: string;
  eraId?: string;
  cameraTarget?: { x: number; y: number; k: number };
  transitionDir?: 'in' | 'out';
}

// ─── Simulation (D3) ─────────────────────────────────────────────────────────

export type ZoomTriple = [number, number, number];

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
  sacred_weight?: number;
  quran_centrality?: number;
  focus_priority?: number;
  label_priority?: number;
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

// ─── Sacred scene model ──────────────────────────────────────────────────────

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

// ─── Legacy constellation types (preserved for atlas.data.ts compat) ────────

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

// ─── Focus card ──────────────────────────────────────────────────────────────

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

// ─── Lookups ─────────────────────────────────────────────────────────────────

export interface AtlasGraphLookups {
  clusterMap: Map<string, AtlasCluster>;
  zoomViews: Map<string, AtlasZoomView>;
  linksByNode: Map<string, Set<string>>;
}

// ─── Edge word cloud ─────────────────────────────────────────────────────────

export interface EdgeWord {
  text: string;
  offset: number;
  size: number;
  alpha: number;
  delay: number;
  tilt: number;
}

import { Injectable } from '@angular/core';
import {
  AtlasGraphData,
  AtlasNode,
  AtlasConstellationLayer,
  ConstellationLayer,
  ConstellationStar,
  ConstellationLine,
  HistoricalWaypoint,
  HistoricalEra,
  SceneState,
  FocusState,
  FocusKind,
  VisualTier,
} from './atlas.models';
import { ATLAS_CONSTELLATION_LAYERS } from './atlas.data';

// ─── Semantic metadata per legacy constellation id ───────────────────────────
// Enriches the legacy AtlasConstellationLayer with the new hierarchy fields
// without touching the 4700-line atlas.data.ts file.

interface ConstellationMeta {
  quran_centrality: number;
  sacred_weight: number;
  worldview_weight: number;
  history_weight: number;
  visual_tier: VisualTier;
  glow: number;
  sky_x: number;
  sky_y: number;
  linked_cluster_id?: string;
}

// Keys match the actual `id` fields from ATLAS_CONSTELLATION_LAYERS in atlas.data.ts:
// scriptures, prophets, prophetic_attributes, quranic_events,
// hadith_companions, biblical_events, enlightenment, scholars_books
//
// linked_cluster_id maps to clusters in worldview-graph.json:
// cl_revelation, cl_biblical, cl_jewish, cl_law,
// cl_power, cl_society, cl_modernity, cl_enlightenment, cl_ancient_egypt

const CONSTELLATION_META: Record<string, ConstellationMeta> = {
  // ── Tier 1: Qur'an dominant — scriptures constellation holds the Qur'an as primary body ──
  'scriptures': {
    quran_centrality:  1,
    sacred_weight:     1.0,
    worldview_weight:  0.3,
    history_weight:    0.9,
    visual_tier:       1,
    glow:              1.0,
    sky_x:             0.50,
    sky_y:             0.30,
    linked_cluster_id: 'cl_revelation',
  },

  // ── Tier 2: Revelation-linked constellations ──
  'prophets': {
    quran_centrality:  2,
    sacred_weight:     0.92,
    worldview_weight:  0.22,
    history_weight:    0.95,
    visual_tier:       2,
    glow:              0.78,
    sky_x:             0.36,
    sky_y:             0.26,
    linked_cluster_id: 'cl_biblical',   // prophetic critique nodes live here
  },
  'quranic_events': {
    quran_centrality:  3,
    sacred_weight:     0.88,
    worldview_weight:  0.20,
    history_weight:    0.98,
    visual_tier:       2,
    glow:              0.72,
    sky_x:             0.64,
    sky_y:             0.24,
    linked_cluster_id: 'cl_revelation',
  },
  'prophetic_attributes': {
    quran_centrality:  4,
    sacred_weight:     0.84,
    worldview_weight:  0.18,
    history_weight:    0.60,
    visual_tier:       2,
    glow:              0.65,
    sky_x:             0.50,
    sky_y:             0.46,
    linked_cluster_id: 'cl_revelation',
  },
  'hadith_companions': {
    quran_centrality:  5,
    sacred_weight:     0.80,
    worldview_weight:  0.25,
    history_weight:    0.88,
    visual_tier:       2,
    glow:              0.60,
    sky_x:             0.28,
    sky_y:             0.44,
    linked_cluster_id: 'cl_law',        // fiqh / juristic tradition
  },

  // ── Tier 3: Worldview territories ──
  'biblical_events': {
    quran_centrality:  6,
    sacred_weight:     0.55,
    worldview_weight:  0.80,
    history_weight:    0.90,
    visual_tier:       3,
    glow:              0.44,
    sky_x:             0.72,
    sky_y:             0.44,
    linked_cluster_id: 'cl_jewish',
  },
  'scholars_books': {
    quran_centrality:  7,
    sacred_weight:     0.48,
    worldview_weight:  0.85,
    history_weight:    0.80,
    visual_tier:       3,
    glow:              0.40,
    sky_x:             0.22,
    sky_y:             0.60,
    linked_cluster_id: 'cl_law',
  },
  'enlightenment': {
    quran_centrality:  8,
    sacred_weight:     0.22,
    worldview_weight:  0.95,
    history_weight:    0.75,
    visual_tier:       3,
    glow:              0.34,
    sky_x:             0.74,
    sky_y:             0.62,
    linked_cluster_id: 'cl_enlightenment',
  },
};

/** Fallback metadata for any constellation not in the map. */
const DEFAULT_META: ConstellationMeta = {
  quran_centrality: 10, sacred_weight: 0.3, worldview_weight: 0.6, history_weight: 0.4,
  visual_tier: 3, glow: 0.35, sky_x: 0.5, sky_y: 0.5,
};

/**
 * AtlasDataAdapter — transforms raw graph data into view-ready shapes
 * for each of the four scene layers.
 *
 * Responsibilities:
 *   • sky view       → sorted ConstellationLayer[] with Qur'an first
 *   • constellation  → the specific ConstellationLayer + linked cluster nodes
 *   • node view      → filtered SimulationNode[] for the active cluster
 *   • history view   → HistoricalWaypoint[] + HistoricalEra[] for a node
 *   • FocusState     → bridging adapter for graph-renderer legacy API
 *
 * This service is pure transform logic — no signals, no subscriptions,
 * no side effects.  All state lives in AtlasSceneController.
 */
@Injectable({ providedIn: 'root' })
export class AtlasDataAdapter {

  // ─── Legacy → new type bridge ────────────────────────────────────────────

  /**
   * Maps a legacy AtlasConstellationLayer to the new ConstellationLayer shape,
   * merging in semantic metadata from CONSTELLATION_META.
   */
  private bridge(legacy: AtlasConstellationLayer): ConstellationLayer {
    const meta = CONSTELLATION_META[legacy.id] ?? DEFAULT_META;

    const stars: ConstellationStar[] = (legacy.bodies ?? []).map((b) => ({
      id: b.id,
      label: b.label,
      x: b.x,
      y: b.y,
      r: b.r,
      luminosity: b.glow ?? 0.5,
      role: (b.kind ?? 'secondary') as ConstellationStar['role'],
    }));

    const lines: ConstellationLine[] = (legacy.rays ?? []).map((r) => ({
      source: r.source,
      target: r.target,
      weight: r.opacity ?? 0.5,
    }));

    return {
      id: legacy.id,
      label: legacy.label,
      ...meta,
      color: legacy.color,
      stars,
      lines,
    };
  }

  /** Memoised mapped layers. */
  private _mappedLayers: ConstellationLayer[] | null = null;
  private getMappedLayers(): ConstellationLayer[] {
    if (!this._mappedLayers) {
      this._mappedLayers = ATLAS_CONSTELLATION_LAYERS.map((l) => this.bridge(l));
    }
    return this._mappedLayers;
  }

  // ─── Sky layer ───────────────────────────────────────────────────────────

  /**
   * Returns all constellation layers sorted so that Qur'an (quran_centrality=1)
   * is always first, then by ascending centrality value.
   */
  getSkyConstellations(): ConstellationLayer[] {
    return [...this.getMappedLayers()].sort((a, b) => a.quran_centrality - b.quran_centrality);
  }

  /**
   * Returns the visual tier assigned to a constellation:
   *   1 = Qur'an (dominant), 2 = revelation-linked, 3 = worldview territories
   */
  getConstellationVisualTier(id: string): number {
    return (CONSTELLATION_META[id] ?? DEFAULT_META).visual_tier;
  }

  // ─── Constellation layer ─────────────────────────────────────────────────

  /** Returns the ConstellationLayer for the given id, or undefined. */
  getConstellation(id: string): ConstellationLayer | undefined {
    return this.getMappedLayers().find((c) => c.id === id);
  }

  /**
   * Returns all nodes that belong to the cluster linked from a constellation,
   * sorted by importance descending so the Qur'an-anchored concepts appear first.
   */
  getConstellationNodes(
    constellationId: string,
    graphData: AtlasGraphData,
  ): AtlasNode[] {
    const constellation = this.getConstellation(constellationId);
    if (!constellation?.linked_cluster_id) return [];

    const clusterId = constellation.linked_cluster_id;
    return graphData.nodes
      .filter((n) => n.cluster_id === clusterId)
      .sort((a, b) => {
        // Sacred-weight nodes rise to the top
        const wa = (a.sacred_weight ?? 0) * 2 + a.importance;
        const wb = (b.sacred_weight ?? 0) * 2 + b.importance;
        return wb - wa;
      });
  }

  // ─── Node layer ──────────────────────────────────────────────────────────

  /**
   * Returns nodes for the active cluster, suitable for D3 simulation.
   * Nodes with quran_centrality are given a hintX/hintY bias toward centre.
   */
  getClusterNodes(clusterId: string, graphData: AtlasGraphData): AtlasNode[] {
    return graphData.nodes
      .filter((n) => n.cluster_id === clusterId)
      .sort((a, b) => b.importance - a.importance);
  }

  /** Returns edges where both endpoints are in the given cluster. */
  getClusterEdges(clusterId: string, graphData: AtlasGraphData) {
    const ids = new Set(
      graphData.nodes.filter((n) => n.cluster_id === clusterId).map((n) => n.id),
    );
    return graphData.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }

  // ─── History layer ───────────────────────────────────────────────────────

  /**
   * Derives HistoricalWaypoint[] from nodes that carry time_start metadata,
   * grouped under the given parent node id.
   *
   * In the current schema, historical waypoints are embedded as atlas nodes
   * with `evidence_type = 'historical'` linked to a concept/claim.
   * We extract them here and project them onto the timeline arc.
   */
  getHistoricalWaypoints(
    nodeId: string,
    graphData: AtlasGraphData,
  ): HistoricalWaypoint[] {
    // Direct: nodes that have `evidence_type='historical'` and a time_start,
    // that are linked to the given nodeId via an edge.
    const linkedIds = new Set<string>();
    for (const e of graphData.edges) {
      if (e.source === nodeId) linkedIds.add(e.target);
      if (e.target === nodeId) linkedIds.add(e.source);
    }

    return graphData.nodes
      .filter(
        (n) =>
          linkedIds.has(n.id) &&
          n.time_start != null &&
          (n.evidence_type === 'historical' || n.kind === 'evidence'),
      )
      .sort((a, b) => (a.time_start ?? 0) - (b.time_start ?? 0))
      .map((n) => this.nodeToWaypoint(n, nodeId));
  }

  /**
   * Derives HistoricalEra[] from the range of waypoint timestamps.
   * Uses the broad Islamic-history era groupings by default.
   */
  getHistoricalEras(waypoints: HistoricalWaypoint[]): HistoricalEra[] {
    const eraIds = new Set(waypoints.map((w) => w.era_id));
    return PRESET_ERAS.filter((e) => eraIds.has(e.era_id));
  }

  /**
   * Whether a node has any historical evidence to display.
   */
  nodeHasHistory(nodeId: string, graphData: AtlasGraphData): boolean {
    return this.getHistoricalWaypoints(nodeId, graphData).length > 0;
  }

  // ─── Legacy FocusState bridge ────────────────────────────────────────────

  /**
   * Maps the new SceneState to the legacy FocusState used by the graph renderer
   * and facade visibility helpers.  This keeps backwards compatibility without
   * rewriting the entire rendering pipeline in one pass.
   */
  toLegacyFocusState(state: SceneState): FocusState {
    switch (state.layer) {
      case 'sky':
        return { kind: 'world' };
      case 'constellation':
        return {
          kind: 'cluster' as FocusKind,
          clusterId: state.clusterId,
        };
      case 'node':
        return {
          kind: (state.nodeId ? 'concept' : 'cluster') as FocusKind,
          clusterId: state.clusterId,
          nodeId: state.nodeId,
        };
      case 'history':
        return {
          kind: 'evidence' as FocusKind,
          clusterId: state.clusterId,
          nodeId: state.nodeId,
        };
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private nodeToWaypoint(node: AtlasNode, parentNodeId: string): HistoricalWaypoint {
    const era = this.resolveEra(node.time_start ?? 0);
    return {
      id: node.id,
      node_id: parentNodeId,
      era_id: era.era_id,
      label: node.label,
      label_ar: node.label_ar,
      time_start: node.time_start ?? 0,
      time_end: node.time_end,
      historical_role: node.evidence_type ?? 'evidence',
      source_type: 'text',
      display_group: era.era_label,
      detail: undefined,
    };
  }

  private resolveEra(year: number): HistoricalEra {
    for (const era of PRESET_ERAS) {
      if (year >= era.time_start && year <= era.time_end) return era;
    }
    // Default to earliest
    return PRESET_ERAS[0];
  }
}

// ─── Preset era definitions ──────────────────────────────────────────────────

const PRESET_ERAS: HistoricalEra[] = [
  {
    era_id: 'pre_revelation',
    era_label: 'Pre-Revelation',
    era_order: 1,
    time_start: -3000,
    time_end: 609,
    color: '#7a8fa8',
  },
  {
    era_id: 'prophetic',
    era_label: 'Prophetic Era',
    era_order: 2,
    time_start: 610,
    time_end: 632,
    color: '#c9a84c',
  },
  {
    era_id: 'early_caliphate',
    era_label: 'Early Caliphate',
    era_order: 3,
    time_start: 632,
    time_end: 750,
    color: '#9ab87a',
  },
  {
    era_id: 'classical',
    era_label: 'Classical Period',
    era_order: 4,
    time_start: 750,
    time_end: 1258,
    color: '#7aadcc',
  },
  {
    era_id: 'post_mongol',
    era_label: 'Post-Mongol',
    era_order: 5,
    time_start: 1258,
    time_end: 1800,
    color: '#b09060',
  },
  {
    era_id: 'modern',
    era_label: 'Modern',
    era_order: 6,
    time_start: 1800,
    time_end: 2100,
    color: '#8888cc',
  },
];

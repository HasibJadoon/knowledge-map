import { Injectable, signal, computed } from '@angular/core';
import {
  SceneLayer,
  SceneState,
  ConstellationLayer,
  AtlasGraphData,
  AtlasCluster,
  SimulationNode,
  HistoricalWaypoint,
  HistoricalEra,
} from './atlas.models';

/**
 * AtlasSceneController owns scene-mode transitions for the 4-layer navigation model:
 *
 *   SKY → CONSTELLATION → NODE → HISTORY
 *
 * It is the single source of truth for which layer is active, what is focused,
 * and what the camera should target next.  Components and renderers react to
 * the signals it exposes — they do not mutate state directly.
 */
@Injectable({ providedIn: 'root' })
export class AtlasSceneController {
  // ─── Primary scene signal ────────────────────────────────────────────────

  readonly state = signal<SceneState>({ layer: 'sky' });

  // ─── Derived selectors ───────────────────────────────────────────────────

  readonly layer = computed(() => this.state().layer);
  readonly activeConstellationId = computed(() => this.state().constellationId);
  readonly activeClusterId = computed(() => this.state().clusterId);
  readonly activeNodeId = computed(() => this.state().nodeId);
  readonly activeEraId = computed(() => this.state().eraId);
  readonly isInSky = computed(() => this.state().layer === 'sky');
  readonly isInConstellation = computed(() => this.state().layer === 'constellation');
  readonly isInNode = computed(() => this.state().layer === 'node');
  readonly isInHistory = computed(() => this.state().layer === 'history');

  // ─── Registered data (set once by the orchestrator) ─────────────────────

  private constellations: ConstellationLayer[] = [];
  private graphData: AtlasGraphData | null = null;
  private waypoints: HistoricalWaypoint[] = [];
  private eras: HistoricalEra[] = [];

  /** History waypoints for the currently active node, sorted by time. */
  readonly activeWaypoints = computed<HistoricalWaypoint[]>(() => {
    const nodeId = this.state().nodeId;
    if (!nodeId) return [];
    return this.waypoints
      .filter((w) => w.node_id === nodeId)
      .sort((a, b) => a.time_start - b.time_start);
  });

  /** Eras that contain at least one waypoint for the active node. */
  readonly activeEras = computed<HistoricalEra[]>(() => {
    const used = new Set(this.activeWaypoints().map((w) => w.era_id));
    return this.eras
      .filter((e) => used.has(e.era_id))
      .sort((a, b) => a.era_order - b.era_order);
  });

  // ─── Registration ────────────────────────────────────────────────────────

  registerConstellations(layers: ConstellationLayer[]): void {
    this.constellations = layers;
  }

  registerGraphData(data: AtlasGraphData): void {
    this.graphData = data;
  }

  registerHistory(waypoints: HistoricalWaypoint[], eras: HistoricalEra[]): void {
    this.waypoints = waypoints;
    this.eras = eras;
  }

  // ─── Transition API ──────────────────────────────────────────────────────

  /**
   * Enter the sky (world-view) layer.
   * Typically used for a back-navigation from constellation.
   */
  goToSky(): void {
    this.state.set({ layer: 'sky', transitionDir: 'out' });
  }

  /**
   * Zoom into a specific constellation from sky view.
   */
  goToConstellation(constellationId: string): void {
    const constellation = this.constellations.find((c) => c.id === constellationId);
    if (!constellation) return;

    const anchorStar = constellation.camera_anchor_star_id
      ? constellation.stars.find((s) => s.id === constellation.camera_anchor_star_id)
      : constellation.stars.find((s) => s.role === 'anchor');

    this.state.set({
      layer: 'constellation',
      constellationId,
      clusterId: constellation.linked_cluster_id,
      cameraTarget: anchorStar
        ? { x: anchorStar.x, y: anchorStar.y, k: 2.4 }
        : undefined,
      transitionDir: 'in',
    });
  }

  /**
   * Dive into the D3 node graph for the cluster linked to the current constellation.
   */
  goToNode(nodeId: string, clusterId: string): void {
    const cluster = this.graphData?.clusters.find((c) => c.id === clusterId);
    this.state.set({
      layer: 'node',
      constellationId: this.state().constellationId,
      clusterId,
      nodeId,
      cameraTarget: cluster
        ? { x: cluster.world_x, y: cluster.world_y, k: 3.2 }
        : undefined,
      transitionDir: 'in',
    });
  }

  /**
   * Expand a node's historical arc.
   * Only valid if waypoints exist for the node.
   */
  goToHistory(nodeId: string): void {
    const hasHistory = this.waypoints.some((w) => w.node_id === nodeId);
    if (!hasHistory) return;

    this.state.set({
      layer: 'history',
      constellationId: this.state().constellationId,
      clusterId: this.state().clusterId,
      nodeId,
      transitionDir: 'in',
    });
  }

  /** Navigate to a specific era within history mode. */
  goToEra(eraId: string): void {
    this.state.update((s) => ({ ...s, eraId, transitionDir: 'in' }));
  }

  /**
   * Step back one layer.
   * history → node → constellation → sky
   */
  stepBack(): void {
    const current = this.state();
    switch (current.layer) {
      case 'history':
        this.state.set({
          layer: 'node',
          constellationId: current.constellationId,
          clusterId: current.clusterId,
          nodeId: current.nodeId,
          transitionDir: 'out',
        });
        break;
      case 'node':
        this.state.set({
          layer: 'constellation',
          constellationId: current.constellationId,
          clusterId: current.clusterId,
          transitionDir: 'out',
        });
        break;
      case 'constellation':
        this.goToSky();
        break;
      default:
        break;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Returns the ConstellationLayer for the given id, if registered. */
  getConstellation(id: string): ConstellationLayer | undefined {
    return this.constellations.find((c) => c.id === id);
  }

  /** Returns all constellations sorted by quran_centrality (Qur'an first). */
  getConstellationsSorted(): ConstellationLayer[] {
    return [...this.constellations].sort((a, b) => a.quran_centrality - b.quran_centrality);
  }

  /** The active cluster definition, if graph data is available. */
  getActiveCluster(): AtlasCluster | undefined {
    const id = this.state().clusterId;
    if (!id || !this.graphData) return undefined;
    return this.graphData.clusters.find((c) => c.id === id);
  }

  /** Nodes that belong to the active cluster, sorted by importance desc. */
  getActiveClusterNodes(): SimulationNode[] {
    const clusterId = this.state().clusterId;
    if (!clusterId || !this.graphData) return [];
    return this.graphData.nodes
      .filter((n) => n.cluster_id === clusterId)
      .sort((a, b) => b.importance - a.importance)
      .map((n) => ({
        ...n,
        hintX: 0,
        hintY: 0,
        homeX: 0,
        homeY: 0,
        phase: (n.time_start ?? 0) / 120,
      })) as SimulationNode[];
  }

  /** Whether the given node has historical waypoints registered. */
  nodeHasHistory(nodeId: string): boolean {
    return this.waypoints.some((w) => w.node_id === nodeId);
  }

  // ─── Auto-tour ───────────────────────────────────────────────────────────

  /**
   * Automatically cycles through every registered constellation in order of
   * quran_centrality (Qur'an first), zooming in and back to sky between each.
   *
   * @param dwellMs   How long to stay on each constellation (default 2800 ms)
   * @param returnMs  How long to pause at sky between constellations (default 900 ms)
   * @returns A cancel function — call it to stop the tour immediately.
   */
  startAutoTour(dwellMs = 2800, returnMs = 900): () => void {
    let cancelled = false;
    const sequence = this.getConstellationsSorted();
    let index = 0;

    const step = (): void => {
      if (cancelled || sequence.length === 0) return;

      const constellation = sequence[index % sequence.length];
      this.goToConstellation(constellation.id);

      // After dwell, return to sky, then advance
      const dwellTimer = window.setTimeout(() => {
        if (cancelled) return;
        this.goToSky();

        const returnTimer = window.setTimeout(() => {
          if (cancelled) return;
          index++;
          // Loop back once all constellations visited
          if (index < sequence.length) {
            step();
          } else {
            // One full cycle done — remain at sky
            this.goToSky();
          }
        }, returnMs);

        this._tourTimers.push(returnTimer);
      }, dwellMs);

      this._tourTimers.push(dwellTimer);
    };

    step();

    return () => {
      cancelled = true;
      this._tourTimers.forEach((id) => window.clearTimeout(id));
      this._tourTimers = [];
      this.goToSky();
    };
  }

  private _tourTimers: number[] = [];

  /** Cancel any running auto-tour without resetting scene state. */
  stopAutoTour(): void {
    this._tourTimers.forEach((id) => window.clearTimeout(id));
    this._tourTimers = [];
  }

  /** Human-readable breadcrumb for the current state. */
  getBreadcrumb(): string[] {
    const s = this.state();
    const crumbs: string[] = ['Sky'];
    if (s.constellationId) {
      const c = this.getConstellation(s.constellationId);
      if (c) crumbs.push(c.label);
    }
    if (s.nodeId && this.graphData) {
      const n = this.graphData.nodes.find((x) => x.id === s.nodeId);
      if (n) crumbs.push(n.label);
    }
    if (s.layer === 'history') crumbs.push('History');
    return crumbs;
  }
}

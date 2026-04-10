import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AtlasLandingFacade } from './atlas-landing.facade';
import { AtlasSceneController } from './atlas-scene-controller.service';
import { AtlasStarfieldRenderer } from './atlas-starfield-renderer.service';
import { AtlasGraphRenderer } from './atlas-graph-renderer.service';
import { AtlasMotionService } from './atlas-motion.service';
import { AtlasDataAdapter } from './atlas-data-adapter.service';
import { SACRED_ATLAS_SCENE } from './atlas.data';
import {
  AtlasFocusCard,
  AtlasGraphData,
  ConstellationLayer,
  FocusState,
  SceneLayer,
  SceneState,
  SimulationNode,
  SacredAtlasScene,
} from './atlas.models';

/** Module shortcut definition */
interface ModuleShortcut {
  id: string;
  label: string;
  route: string;
  glyph: string;
}

const MODULE_SHORTCUTS: ModuleShortcut[] = [
  { id: 'hub',       label: 'Hub',       route: '/hub',       glyph: '⬡' },
  { id: 'quran',     label: 'Qur\'an',   route: '/quran',     glyph: '◎' },
  { id: 'arabic',    label: 'Arabic',    route: '/arabic',    glyph: 'ع' },
  { id: 'worldview', label: 'Worldview', route: '/worldview', glyph: '◈' },
  { id: 'planner',   label: 'Planner',   route: '/planner',   glyph: '◧' },
  { id: 'srs',       label: 'Review',    route: '/srs',       glyph: '◰' },
];

@Component({
  selector: 'km-atlas-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atlas-landing.component.html',
  styleUrl: './atlas-landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasLandingComponent implements AfterViewInit, OnDestroy {

  // ─── ViewChild refs ──────────────────────────────────────────────────────

  @ViewChild('host',           { static: true }) private hostRef!:           ElementRef<HTMLElement>;
  @ViewChild('starHost',       { static: true }) private starHostRef!:       ElementRef<HTMLElement>;
  @ViewChild('svgRoot',        { static: true }) private svgRef!:            ElementRef<SVGSVGElement>;
  @ViewChild('titleEl',        { static: true }) private titleRef!:          ElementRef<HTMLElement>;
  @ViewChild('subtitleEl',     { static: true }) private subtitleRef!:       ElementRef<HTMLElement>;
  @ViewChild('modeLabelEl',    { static: true }) private modeLabelRef!:      ElementRef<HTMLElement>;
  @ViewChild('focusCardEl',    { static: false }) private focusCardRef?:     ElementRef<HTMLElement>;

  // ─── Services ────────────────────────────────────────────────────────────

  private readonly facade      = inject(AtlasLandingFacade);
  private readonly scene       = inject(AtlasSceneController);
  private readonly starfield   = inject(AtlasStarfieldRenderer);
  private readonly graph       = inject(AtlasGraphRenderer);
  private readonly motion      = inject(AtlasMotionService);
  private readonly adapter     = inject(AtlasDataAdapter);
  private readonly ngZone      = inject(NgZone);
  private readonly router      = inject(Router);

  // ─── Template state (signals) ────────────────────────────────────────────

  readonly moduleShortcuts = MODULE_SHORTCUTS;
  readonly sacredScene: SacredAtlasScene = SACRED_ATLAS_SCENE;

  readonly currentLayer   = computed(() => this.scene.layer());
  readonly breadcrumb     = computed(() => this.scene.getBreadcrumb());
  readonly modeLabel      = computed(() => AtlasMotionService.layerLabel(this.scene.layer()));
  readonly canGoBack      = computed(() => this.scene.layer() !== 'sky');
  readonly historyWaypoints = computed(() => this.scene.activeWaypoints());
  readonly historyEras      = computed(() => this.scene.activeEras());

  readonly focusCard = signal<AtlasFocusCard | null>(null);
  readonly activeConstellationId = this.scene.activeConstellationId;

  // ─── Internal state ──────────────────────────────────────────────────────

  private graphData: AtlasGraphData | null = null;
  private resizeObserver?: ResizeObserver;
  private quranBreathTween?: gsap.core.Tween;
  private cancelAutoTour?: () => void;
  private initialised = false;

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  constructor() {
    // React to scene state changes to drive graph and motion
    effect(() => {
      const state = this.scene.state();
      if (!this.initialised) return;
      this.onSceneChange(state);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    this.ngZone.runOutsideAngular(() => {
      this.starfield.init(this.starHostRef.nativeElement);
    });

    this.graphData = await this.facade.loadGraphData();
    const lookups = this.facade.createLookups(this.graphData);

    // Register data with scene controller
    this.scene.registerGraphData(this.graphData);
    this.scene.registerConstellations(this.adapter.getSkyConstellations());

    // Initialise D3 graph renderer
    const host = this.hostRef.nativeElement;
    this.ngZone.runOutsideAngular(() => {
      this.graph.init(this.svgRef.nativeElement, host.clientWidth, host.clientHeight);
      this.graph.loadGraph(this.graphData!);
      this.graph.resetZoom();
    });

    // Wire node click → scene transition
    this.graph.onNodeClickHandler((node) => this.ngZone.run(() => this.onNodeClick(node)));
    this.graph.onBackgroundClickHandler(() => this.ngZone.run(() => this.onBackgroundClick()));

    // Resize observer
    this.resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      this.ngZone.runOutsideAngular(() => {
        this.starfield.resize(width, height);
        this.graph.resize(width, height);
      });
    });
    this.resizeObserver.observe(host);

    // Entry animation — auto-tour begins once it completes
    const entryTl = this.motion.entrySequence(
      this.starHostRef.nativeElement,
      this.titleRef.nativeElement,
      this.subtitleRef.nativeElement,
      this.modeLabelRef.nativeElement,
    );

    entryTl.eventCallback('onComplete', () => {
      this.ngZone.run(() => this.beginAutoTour());
    });

    // Module shortcuts fade-in
    const shortcuts = host.querySelectorAll<HTMLElement>('.atlas__shortcut');
    if (shortcuts.length) this.motion.revealModuleShortcuts(shortcuts);

    // Initial sky render
    const legacyFocus = this.adapter.toLegacyFocusState(this.scene.state());
    this.graph.renderScene(this.scene.state(), legacyFocus);

    this.initialised = true;
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.quranBreathTween?.kill();
    this.cancelAutoTour?.();
    this.starfield.dispose();
  }

  // ─── Scene change handler ────────────────────────────────────────────────

  private onSceneChange(state: SceneState): void {
    const legacyFocus = this.adapter.toLegacyFocusState(state);
    this.graph.setFocusAttr(legacyFocus);
    this.graph.renderScene(state, legacyFocus);

    // Update mode label with animation
    this.motion.transitionModeLabel(
      this.modeLabelRef.nativeElement,
      AtlasMotionService.layerLabel(state.layer),
    );

    // Layer-specific transitions
    switch (state.layer) {
      case 'sky':
        this.focusCard.set(null);
        break;

      case 'constellation':
        this.motion.skyToConstellation(
          this.svgRef.nativeElement,
          this.modeLabelRef.nativeElement,
        );
        break;

      case 'node': {
        const nodeEl = state.nodeId
          ? this.svgRef.nativeElement.querySelector<SVGCircleElement>(`[data-id="${state.nodeId}"]`)
          : null;
        this.motion.constellationToNode(null, nodeEl ? [nodeEl] : []);
        if (state.nodeId) {
          this.showFocusCard(state.nodeId);
        }
        break;
      }

      case 'history': {
        if (state.nodeId && this.graphData) {
          const waypoints = this.adapter.getHistoricalWaypoints(state.nodeId, this.graphData);
          const eras = this.adapter.getHistoricalEras(waypoints);
          this.scene.registerHistory(waypoints, eras);

          const nodeEl = this.svgRef.nativeElement.querySelector<SVGCircleElement>(`[data-id="${state.nodeId}"]`);
          this.motion.nodeToHistory(nodeEl ?? null, null);

          this.graph.renderHistoryArc(
            state.nodeId,
            waypoints,
            eras,
            this.hostRef.nativeElement.clientWidth,
            this.hostRef.nativeElement.clientHeight,
          );
        }
        break;
      }
    }
  }

  // ─── Auto-tour ───────────────────────────────────────────────────────────

  /**
   * Starts the auto-tour: Qur'an-first slow zoom through every constellation.
   * Any user interaction cancels it immediately.
   */
  private beginAutoTour(): void {
    // Wait a beat so the sky render settles before moving
    const warmup = window.setTimeout(() => {
      this.cancelAutoTour = this.scene.startAutoTour(3200, 1000);
    }, 600);
    // If destroyed before warmup fires, clear it too
    const origCancel = this.cancelAutoTour;
    this.cancelAutoTour = () => {
      window.clearTimeout(warmup);
      origCancel?.();
    };
  }

  /** Cancel the auto-tour on any explicit user interaction. */
  private stopTour(): void {
    this.cancelAutoTour?.();
    this.cancelAutoTour = undefined;
  }

  // ─── User interactions ───────────────────────────────────────────────────

  /** Called when D3 node is clicked. */
  private onNodeClick(node: SimulationNode): void {
    this.stopTour();
    const layer = this.scene.layer();

    if (layer === 'sky' || layer === 'constellation') {
      this.scene.goToNode(node.id, node.cluster_id);
    } else if (layer === 'node') {
      const hasHistory = this.graphData
        ? this.adapter.nodeHasHistory(node.id, this.graphData)
        : false;
      if (hasHistory) {
        this.scene.goToHistory(node.id);
      } else {
        this.scene.goToNode(node.id, node.cluster_id);
      }
    }

    const nodeEl = this.svgRef.nativeElement.querySelector<SVGCircleElement>(`[data-id="${node.id}"]`);
    if (nodeEl) this.motion.pulseNode(nodeEl);
  }

  private onBackgroundClick(): void {
    this.stopTour();
    if (this.scene.layer() !== 'sky') {
      this.focusCard.set(null);
    }
  }

  /** Click a constellation in the sky layer */
  onConstellationClick(constellationId: string): void {
    this.stopTour();
    this.scene.goToConstellation(constellationId);
  }

  /** Back navigation — step out one layer. */
  stepBack(): void {
    this.stopTour();
    const layer = this.scene.layer();
    if (layer === 'history') {
      this.graph.removeHistoryArc();
    }
    this.motion.stepBack(this.modeLabelRef.nativeElement, () => {
      this.scene.stepBack();
    });
  }

  zoomIn():    void { this.stopTour(); this.graph.zoomIn(); }
  zoomOut():   void { this.stopTour(); this.graph.zoomOut(); }
  resetView(): void { this.stopTour(); this.graph.resetZoom(); }

  // ─── Navigation exit ─────────────────────────────────────────────────────

  navigateTo(route: string): void {
    this.stopTour();
    this.motion.exitToApp(this.hostRef.nativeElement, () => {
      this.router.navigate([route]);
    });
  }

  // ─── Focus card ──────────────────────────────────────────────────────────

  private showFocusCard(nodeId: string): void {
    const node = this.graphData?.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const sacred = this.sacredScene.nodes.find((sn) => sn.linked_cluster_id === node.cluster_id);
    this.focusCard.set({
      id: nodeId,
      title: node.label,
      subtitle: node.label_ar ?? '',
      summary: sacred?.meaning_summary ?? '',
      polarity: sacred?.polarity ?? 'guidance',
      relationToCenter: sacred?.relation_to_center ?? '',
      relationToQuran: sacred?.relation_to_quran ?? '',
      relationToHumanResponse: sacred?.relation_to_human_response ?? '',
    });

    // Animate card in (deferred one frame so the DOM element exists)
    setTimeout(() => {
      const cardEl = this.focusCardRef?.nativeElement;
      if (cardEl) this.motion.revealCard(cardEl);
    });
  }

  dismissFocusCard(): void {
    const cardEl = this.focusCardRef?.nativeElement;
    if (cardEl) {
      this.motion.dismissCard(cardEl, () => this.focusCard.set(null));
    } else {
      this.focusCard.set(null);
    }
  }

  // ─── Getters for template ────────────────────────────────────────────────

  get constellations(): ConstellationLayer[] {
    return this.adapter.getSkyConstellations();
  }

  get isHistoryMode(): boolean {
    return this.scene.isInHistory();
  }
}

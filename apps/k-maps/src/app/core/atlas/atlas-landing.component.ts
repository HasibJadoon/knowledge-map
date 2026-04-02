import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  Renderer2,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import * as d3 from 'd3';
import gsap from 'gsap';
import * as THREE from 'three';
import { AtlasLandingFacade } from './atlas-landing.facade';
import {
  ATLAS_CONSTELLATION_LAYERS,
  EDGE_WORD_CLOUD,
  FIRE_FRAGMENT_SHADER,
  FIRE_VERTEX_SHADER,
  SACRED_ATLAS_SCENE,
} from './atlas.data';
import {
  AtlasFocusCard,
  AtlasCluster,
  AtlasConstellationLayer,
  AtlasGraphData,
  AtlasZoomView,
  FocusState,
  SacredAtlasProjection,
  SacredAtlasScene,
  SimulationLink,
  SimulationNode,
  ZoomTriple,
} from './atlas.models';

interface FlameInstance {
  host: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
  texture: THREE.Texture;
  seed: number;
}

interface StarfieldLayer {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  rotationVelocity: number;
  drift: number;
  texture: THREE.CanvasTexture;
}

interface StarfieldInstance {
  host: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  layers: StarfieldLayer[];
}

interface ClusterDust {
  id: string;
  x: number;
  y: number;
  r: number;
  opacity: number;
  fill: string;
}

interface LabelPlacement {
  x: number;
  y: number;
  anchor: 'start' | 'middle';
}

interface SacredAtlasLinkProjection {
  id: string;
  kind: SacredAtlasScene['links'][number]['kind'];
  polarity: SacredAtlasScene['links'][number]['polarity'];
  strength: number;
  sourceNode: SacredAtlasProjection;
  targetNode: SacredAtlasProjection;
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
  private static readonly BASE_FLAME_SCALE = 8.6;
  private static readonly AUTO_TOUR_ENABLED = true;

  @ViewChild('host', { static: true }) private readonly hostRef!: ElementRef<HTMLElement>;
  @ViewChild('starHost', { static: true }) private readonly starHostRef!: ElementRef<HTMLElement>;
  @ViewChild('fireHost', { static: true }) private readonly fireHostRef!: ElementRef<HTMLElement>;
  @ViewChild('svgRoot', { static: true }) private readonly svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('homePlaneButton', { static: true })
  private readonly homePlaneButtonRef!: ElementRef<HTMLButtonElement>;

  private readonly facade = inject(AtlasLandingFacade);
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly renderer = inject(Renderer2);

  private readonly sacredScene: SacredAtlasScene = SACRED_ATLAS_SCENE;
  private readonly focus = signal<FocusState>({ kind: 'world' });
  readonly focusCard = signal<AtlasFocusCard | null>(null);
  readonly edgeWords = EDGE_WORD_CLOUD;
  readonly edgeWordSides = ['top', 'right', 'bottom', 'left'] as const;
  readonly sacredPillars = [
    { id: 'divine_allah', label: 'Allah', subtitle: 'Absolute center' },
    { id: 'revelation_quran', label: 'Qur’an', subtitle: 'Revelation core' },
    { id: 'book_torah', label: 'Torah', subtitle: 'Earlier book' },
    { id: 'prophet_muhammad', label: 'Muhammad', subtitle: 'Prophetic witness' },
    { id: 'opposition_iblis', label: 'Iblis', subtitle: 'Broken anti-center' },
  ];

  private graphData: AtlasGraphData | null = null;
  private clusterMap = new Map<string, AtlasCluster>();
  private nodeMap = new Map<string, SimulationNode>();
  private zoomViews = new Map<string, AtlasZoomView>();
  private linksByNode = new Map<string, Set<string>>();
  private sacredNodeMap = new Map<string, SacredAtlasProjection>();

  private resizeObserver?: ResizeObserver;
  private simulation?: d3.Simulation<SimulationNode, SimulationLink>;
  private zoomBehavior?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private currentTransform = d3.zoomIdentity;
  private animationContext: gsap.Context | null = null;
  private autoTourSequence: FocusState[] = [];
  private autoTourIndex = 0;
  private autoTourTimer: number | null = null;
  private autoTourPauseUntil = 0;
  private planeLaunchTimeline: gsap.core.Timeline | null = null;
  private isLaunchingHome = false;
  private flameInstances: FlameInstance[] = [];
  private starfield?: StarfieldInstance;
  private flameFrameId: number | null = null;
  private graphRenderFrameId: number | null = null;
  private readonly fireTextureLoader = new THREE.TextureLoader();

  private svg?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private scene?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private atmosphereLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private sacredLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private territoryLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private linkLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private nodeLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private labelLayer?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private territorySelection?: d3.Selection<SVGGElement, AtlasCluster, SVGGElement, unknown>;
  private linkSelection?: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>;
  private nodeSelection?: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>;
  private labelSelection?: d3.Selection<SVGTextElement, SimulationNode, SVGGElement, unknown>;

  async ngAfterViewInit(): Promise<void> {
    this.graphData = await this.facade.loadGraphData();
    const lookups = this.facade.createLookups(this.graphData);
    this.clusterMap = lookups.clusterMap;
    this.zoomViews = lookups.zoomViews;
    this.linksByNode = lookups.linksByNode;
    this.initialiseSvg();
    this.initialiseResizeObserver();
    this.initialiseGraph(this.graphData);
    this.initStarfield();
    this.startBackgroundLoop();
    this.updateFocusCard(this.focus());
  }

  ngOnDestroy(): void {
    this.animationContext?.revert();
    this.planeLaunchTimeline?.kill();
    if (this.autoTourTimer) {
      window.clearTimeout(this.autoTourTimer);
    }
    if (this.graphRenderFrameId !== null) {
      window.cancelAnimationFrame(this.graphRenderFrameId);
      this.graphRenderFrameId = null;
    }
    this.resizeObserver?.disconnect();
    this.simulation?.stop();
    this.destroyStarfield();
    this.destroyFlames();
  }

  focusSacredPillar(semanticId: string): void {
    const node = this.sacredNodeMap.get(semanticId);
    if (!node) {
      return;
    }
    this.pauseAutoTour();
    this.focusSacredNode(node);
  }

  protected launchHome(): void {
    if (this.isLaunchingHome) {
      return;
    }

    this.isLaunchingHome = true;
    this.pauseAutoTour(20000);
    this.svg?.interrupt();

    const button = this.homePlaneButtonRef.nativeElement;
    const plane = button.querySelector('.atlas__home-plane-ship');
    const wing = button.querySelector('.atlas__plane-wing');
    const fold = button.querySelector('.atlas__plane-fold');
    const trail = button.querySelector('.atlas__plane-trail');
    const glow = button.querySelector('.atlas__home-plane-glow');
    const shadow = button.querySelector('.atlas__home-plane-shadow');

    this.renderer.addClass(button, 'is-launching');

    this.planeLaunchTimeline?.kill();
    this.planeLaunchTimeline = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: () => {
        void this.router.navigateByUrl('/home');
      },
    });

    this.planeLaunchTimeline
      .set(trail, { strokeDasharray: 140, strokeDashoffset: 140, opacity: 0.16 })
      .to(button, { scale: 0.96, duration: 0.18 }, 0)
      .to(glow, { opacity: 0.92, scale: 1.16, duration: 0.28 }, 0)
      .to(shadow, { opacity: 0.16, scaleX: 0.74, duration: 0.3, ease: 'power1.out' }, 0)
      .to(wing, { rotation: -18, transformOrigin: '12% 86%', duration: 0.22 }, 0.02)
      .to(fold, { rotation: 20, transformOrigin: '18% 18%', duration: 0.22 }, 0.04)
      .to(trail, { strokeDashoffset: 0, opacity: 0.68, duration: 0.4, ease: 'power1.out' }, 0.08)
      .to(
        plane,
        {
          x: 176,
          y: -146,
          scale: 0.32,
          rotation: -18,
          opacity: 0,
          duration: 0.92,
          ease: 'power3.in',
        },
        0.16,
      )
      .to(button, { opacity: 0, duration: 0.28 }, 0.76);
  }

  protected zoomIn(): void {
    this.scaleZoomBy(1.18);
  }

  protected zoomOut(): void {
    this.scaleZoomBy(1 / 1.18);
  }

  protected resetZoom(): void {
    this.pauseAutoTour();
    this.setFocus({ kind: 'world' });
  }

  private initialiseSvg(): void {
    this.svg = d3.select(this.svgRef.nativeElement);
    this.svg.selectAll('*').remove();
    this.svg.attr('role', 'img').attr('aria-label', 'K-Maps worldview graph canvas');
    this.appendSvgDefs();

    this.scene = this.svg.append('g').attr('class', 'atlas-canvas__scene');
    this.atmosphereLayer = this.scene.append('g').attr('class', 'atlas-canvas__atmosphere');
    this.sacredLayer = this.scene.append('g').attr('class', 'atlas-canvas__sacred');
    this.territoryLayer = this.scene.append('g').attr('class', 'atlas-canvas__territories');
    this.linkLayer = this.scene.append('g').attr('class', 'atlas-canvas__links');
    this.nodeLayer = this.scene.append('g').attr('class', 'atlas-canvas__nodes');
    this.labelLayer = this.scene.append('g').attr('class', 'atlas-canvas__labels');

    this.zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.36, 4.2])
      .interpolate(d3.interpolateZoom)
      .wheelDelta((event) => {
        const base = event.deltaMode === 1 ? 0.011 : 0.00042;
        return -event.deltaY * (event.ctrlKey ? base * 0.4 : base);
      })
      .on('start', (event) => {
        if (event.sourceEvent) {
          this.pauseAutoTour();
        }
      })
      .on('zoom', (event) => {
        this.applySceneTransform(event.transform);
      });

    this.svg
      .call(this.zoomBehavior)
      .on('dblclick.zoom', null)
      .on('pointerdown', () => this.pauseAutoTour())
      .on('click', (event) => {
        if (event.target === this.svgRef.nativeElement) {
          this.pauseAutoTour();
          this.ngZone.run(() => this.setFocus({ kind: 'world' }));
        }
      });
  }

  private initialiseResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateViewport();
      this.resizeStarfield();
      this.resizeFlames();
      this.applyFocusZoom(false);
      this.scheduleGraphRender();
      this.renderSacredFocusState();
    });
    this.resizeObserver.observe(this.hostRef.nativeElement);
  }

  private appendSvgDefs(): void {
    if (!this.svg) {
      return;
    }

    const defs = this.svg.append('defs');

    const divineCoreGradient = defs.append('radialGradient').attr('id', 'atlas-divine-core');
    divineCoreGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ffffff');
    divineCoreGradient.append('stop').attr('offset', '22%').attr('stop-color', '#fffdf3');
    divineCoreGradient.append('stop').attr('offset', '52%').attr('stop-color', '#ffe9a8');
    divineCoreGradient.append('stop').attr('offset', '100%').attr('stop-color', '#ffc760');

    const revelationCoreGradient = defs.append('radialGradient').attr('id', 'atlas-revelation-core');
    revelationCoreGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ffffff');
    revelationCoreGradient.append('stop').attr('offset', '32%').attr('stop-color', '#fffbe9');
    revelationCoreGradient.append('stop').attr('offset', '100%').attr('stop-color', '#ffe1a8');

    const bookCoreGradient = defs.append('radialGradient').attr('id', 'atlas-book-core');
    bookCoreGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ffffff');
    bookCoreGradient.append('stop').attr('offset', '22%').attr('stop-color', '#eef7ff');
    bookCoreGradient.append('stop').attr('offset', '58%').attr('stop-color', '#b7dbff');
    bookCoreGradient.append('stop').attr('offset', '100%').attr('stop-color', '#79b8ff');

    const softGlow = defs.append('filter').attr('id', 'atlas-soft-glow').attr('x', '-80%').attr('y', '-80%').attr('width', '260%').attr('height', '260%');
    softGlow.append('feGaussianBlur').attr('stdDeviation', 18).attr('result', 'blur');
    const softGlowMerge = softGlow.append('feMerge');
    softGlowMerge.append('feMergeNode').attr('in', 'blur');
    softGlowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const textGlow = defs.append('filter').attr('id', 'atlas-label-glow').attr('x', '-80%').attr('y', '-80%').attr('width', '260%').attr('height', '260%');
    textGlow.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'blur');
    textGlow.append('feColorMatrix')
      .attr('in', 'blur')
      .attr('type', 'matrix')
      .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.55 0')
      .attr('result', 'glow');
    const textGlowMerge = textGlow.append('feMerge');
    textGlowMerge.append('feMergeNode').attr('in', 'glow');
    textGlowMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  private initialiseGraph(data: AtlasGraphData): void {
    this.updateViewport();
    this.renderAtmosphere();

    const nodes = data.nodes.map((node) => this.facade.toSimulationNode(node, this.clusterMap));
    const links = data.edges.map((edge) => ({ ...edge })) as SimulationLink[];
    this.nodeMap = new Map(nodes.map((node) => [node.id, node]));

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
          .distance((link) => this.facade.linkDistance(link, (node) => this.resolveNode(node)))
          .strength((link) => this.facade.linkStrength(link, (node) => this.resolveNode(node))),
      )
      .force(
        'charge',
        d3.forceManyBody<SimulationNode>().strength((node) => this.facade.chargeStrength(node)),
      )
      .force(
        'collide',
        d3.forceCollide<SimulationNode>().radius((node) => this.facade.nodeRadius(node) + 16),
      )
      .force(
        'x',
        d3.forceX<SimulationNode>((node) => node.homeX).strength((node) => this.facade.anchorStrength(node)),
      )
      .force(
        'y',
        d3.forceY<SimulationNode>((node) => node.homeY).strength((node) => this.facade.anchorStrength(node)),
      )
      .on('tick', () => this.scheduleGraphRender());

    this.setFocus({ kind: 'world' }, false);
    this.simulation.alpha(1).restart();
    this.autoTourSequence = this.buildGuidedFocusSequence(data);
    this.startAmbientAnimation();
    this.scheduleAutoTour(1800);
  }

  private initStarfield(): void {
    this.destroyStarfield();
    this.starfield = this.createStarfield(this.starHostRef.nativeElement);
    this.resizeStarfield();
  }

  private startBackgroundLoop(): void {
    if (this.flameFrameId !== null) {
      window.cancelAnimationFrame(this.flameFrameId);
      this.flameFrameId = null;
    }

    this.ngZone.runOutsideAngular(() => this.renderStarfield(0));
  }

  private createStarfield(host: HTMLElement): StarfieldInstance {
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'atlas__star-canvas';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(54, 1, 1, 6000);
    camera.position.z = 1250;

    const layers: StarfieldLayer[] = [
      this.createStarLayer(2400, 0.94, '#f4f7ff', 0.72, 4200, 2400, 3200, 0.000012, 1.6),
      this.createStarLayer(1280, 1.42, '#d9e7ff', 0.46, 3400, 2100, 2200, -0.000024, 2.2),
      this.createStarLayer(520, 2.4, '#ffd8a1', 0.28, 2700, 1700, 1500, 0.000038, 3.1),
      this.createStarLayer(160, 3.5, '#fff1c8', 0.18, 2100, 1200, 1100, -0.00005, 4.4),
    ];

    layers.forEach((layer) => scene.add(layer.points));

    return {
      host,
      renderer,
      scene,
      camera,
      layers,
    };
  }

  private createStarLayer(
    count: number,
    size: number,
    color: string,
    opacity: number,
    width: number,
    height: number,
    depth: number,
    rotationVelocity: number,
    drift: number,
  ): StarfieldLayer {
    const positions = new Float32Array(count * 3);
    const texture = this.createStarTexture(color);

    for (let index = 0; index < count; index += 1) {
      const inBand = Math.random() < 0.34;
      const x = (Math.random() - 0.5) * width;
      const y = inBand
        ? x * 0.08 + (Math.random() - 0.5) * height * 0.18
        : (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * depth;
      const offset = index * 3;
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size,
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
      alphaTest: 0.02,
    });

    return {
      points: new THREE.Points(geometry, material),
      rotationVelocity,
      drift,
      texture,
    };
  }

  private createStarTexture(color: string): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    if (!context) {
      const fallback = new THREE.CanvasTexture(canvas);
      fallback.colorSpace = THREE.SRGBColorSpace;
      return fallback;
    }

    const rgb = new THREE.Color(color);
    const red = Math.round(rgb.r * 255);
    const green = Math.round(rgb.g * 255);
    const blue = Math.round(rgb.b * 255);
    const center = size / 2;

    const glow = context.createRadialGradient(center, center, 0, center, center, center);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.08, 'rgba(255,255,255,0.98)');
    glow.addColorStop(0.2, `rgba(${red}, ${green}, ${blue}, 0.72)`);
    glow.addColorStop(0.44, `rgba(${red}, ${green}, ${blue}, 0.18)`);
    glow.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);

    context.fillStyle = glow;
    context.fillRect(0, 0, size, size);

    context.strokeStyle = `rgba(${red}, ${green}, ${blue}, 0.08)`;
    context.lineWidth = 1.25;
    context.beginPath();
    context.moveTo(center, center - 14);
    context.lineTo(center, center + 14);
    context.moveTo(center - 14, center);
    context.lineTo(center + 14, center);
    context.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  }

  private renderStarfield(elapsed: number): void {
    if (!this.starfield) {
      return;
    }

    this.starfield.layers.forEach((layer) => {
      layer.points.rotation.z = 0;
      layer.points.rotation.x = 0;
      layer.points.position.x = 0;
      layer.points.position.y = 0;
    });

    this.starfield.renderer.render(this.starfield.scene, this.starfield.camera);
  }

  private resizeStarfield(): void {
    if (!this.starfield) {
      return;
    }

    const width = Math.max(this.starfield.host.clientWidth, 640);
    const height = Math.max(this.starfield.host.clientHeight, 480);
    this.starfield.renderer.setSize(width, height, false);
    this.starfield.camera.aspect = width / height;
    this.starfield.camera.updateProjectionMatrix();
  }

  private destroyStarfield(): void {
    if (!this.starfield) {
      return;
    }

    this.starfield.layers.forEach((layer) => {
      layer.points.geometry.dispose();
      layer.points.material.dispose();
      layer.texture.dispose();
    });
    this.starfield.renderer.dispose();
    this.starfield.renderer.forceContextLoss();
    this.starfield.host.innerHTML = '';
    this.starfield = undefined;
  }

  private createFlameInstance(host: HTMLElement): FlameInstance {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'atlas__fire-canvas';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, -4, 5);
    camera.lookAt(0, 0, 0);

    const texture = this.fireTextureLoader.load('assets/images/fire.png');
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        fireTex: { value: texture },
        color: { value: new THREE.Color(0xeeeeee) },
        time: { value: 0 },
        seed: { value: Math.random() * 19.19 },
        invModelMatrix: { value: new THREE.Matrix4() },
        scale: { value: new THREE.Vector3(1, 1, 1) },
        noiseScale: { value: new THREE.Vector4(1, 2, 1, 0.3) },
        magnitude: { value: 2.5 },
        lacunarity: { value: 3.0 },
        gain: { value: 0.6 },
      },
      vertexShader: FIRE_VERTEX_SHADER,
      fragmentShader: FIRE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.scale.set(
      AtlasLandingComponent.BASE_FLAME_SCALE,
      AtlasLandingComponent.BASE_FLAME_SCALE,
      AtlasLandingComponent.BASE_FLAME_SCALE,
    );
    mesh.position.set(0, -0.2, 0);
    scene.add(mesh);

    return {
      host,
      renderer,
      scene,
      camera,
      mesh,
      material,
      texture,
      seed: Math.random() * Math.PI * 2,
    };
  }

  private renderFlames(elapsed: number): void {
    this.flameInstances.forEach((instance) => {
      const phase = elapsed * 0.045 + instance.seed;

      instance.mesh.position.x = Math.sin(phase * 0.32) * 0.012;
      instance.mesh.position.y = -0.2 + Math.cos(phase * 0.46) * 0.01;
      instance.mesh.rotation.z = Math.sin(phase * 0.2) * 0.0025;
      instance.mesh.updateMatrixWorld();

      instance.material.uniforms['time'].value = elapsed * 0.18;
      instance.material.uniforms['invModelMatrix'].value.copy(instance.mesh.matrixWorld).invert();
      instance.material.uniforms['scale'].value.copy(instance.mesh.scale);

      instance.renderer.render(instance.scene, instance.camera);
    });
  }

  private resizeFlames(): void {
    this.flameInstances.forEach((instance) => {
      const width = Math.max(instance.host.clientWidth, 360);
      const height = Math.max(instance.host.clientHeight, 360);
      const aspect = width / height;
      const horizontalScale =
        AtlasLandingComponent.BASE_FLAME_SCALE * Math.max(1.2, aspect * 1.08);

      instance.renderer.setSize(width, height, false);
      instance.camera.aspect = width / height;
      instance.camera.updateProjectionMatrix();
      instance.mesh.scale.set(
        horizontalScale,
        AtlasLandingComponent.BASE_FLAME_SCALE,
        AtlasLandingComponent.BASE_FLAME_SCALE,
      );
    });
  }

  private destroyFlames(): void {
    if (this.flameFrameId !== null) {
      window.cancelAnimationFrame(this.flameFrameId);
      this.flameFrameId = null;
    }

    this.flameInstances.forEach((instance) => {
      instance.mesh.geometry.dispose();
      instance.material.dispose();
      instance.texture.dispose();
      instance.renderer.dispose();
      instance.renderer.forceContextLoss();
      instance.host.innerHTML = '';
    });

    this.flameInstances = [];
  }

  private scheduleGraphRender(): void {
    if (this.graphRenderFrameId !== null) {
      return;
    }

    this.graphRenderFrameId = window.requestAnimationFrame(() => {
      this.graphRenderFrameId = null;
      this.renderGraph();
    });
  }

  private buildGuidedFocusSequence(data: AtlasGraphData): FocusState[] {
    const guidedTargets: FocusState[] = [
      {
        kind: 'divine',
        semanticId: this.sacredScene.divine_center_id,
        ringId: 'divine',
      },
      {
        kind: 'revelation_ring',
        semanticId: this.sacredScene.revelation_core_id,
        ringId: 'revelation-core',
      },
      {
        kind: 'book_ring',
        semanticId: 'book_torah',
        ringId: 'books',
      },
      {
        kind: 'book_ring',
        semanticId: 'book_gospel',
        ringId: 'books',
      },
      {
        kind: 'prophet_ring',
        semanticId: 'prophet_muhammad',
        ringId: 'prophets',
      },
      {
        kind: 'prophet_ring',
        semanticId: 'prophet_musa',
        ringId: 'prophets',
      },
      {
        kind: 'worldview_ring',
        semanticId: 'worldview_knowledge',
        ringId: 'worldview',
        clusterId: 'cl_knowledge',
      },
      ...this.facade.buildAutoTourSequence(data),
    ];

    return guidedTargets.flatMap((focus) => [focus, { kind: 'world' }]);
  }

  private scheduleAutoTour(delayMs = 2800): void {
    if (!AtlasLandingComponent.AUTO_TOUR_ENABLED) {
      return;
    }

    if (this.autoTourTimer) {
      window.clearTimeout(this.autoTourTimer);
    }

    this.autoTourTimer = window.setTimeout(() => {
      const waitMs = this.autoTourPauseUntil - Date.now();
      if (waitMs > 0) {
        this.scheduleAutoTour(waitMs + 120);
        return;
      }
      this.runAutoTourStep();
    }, delayMs);
  }

  private runAutoTourStep(): void {
    if (!AtlasLandingComponent.AUTO_TOUR_ENABLED) {
      return;
    }

    if (!this.autoTourSequence.length) {
      return;
    }

    const focus = this.autoTourSequence[this.autoTourIndex % this.autoTourSequence.length];
    this.autoTourIndex += 1;
    const duration = this.autoTourDuration(focus);

    this.setFocus(focus, true, duration, () => {
      this.scheduleAutoTour(this.autoTourHoldDuration(focus));
    });
  }

  private pauseAutoTour(delayMs = 9000): void {
    if (!AtlasLandingComponent.AUTO_TOUR_ENABLED) {
      return;
    }

    this.autoTourPauseUntil = Date.now() + delayMs;
    if (this.autoTourTimer) {
      window.clearTimeout(this.autoTourTimer);
      this.autoTourTimer = null;
    }
    this.svg?.interrupt();
    this.scheduleAutoTour(delayMs);
  }

  private autoTourDuration(focus: FocusState): number {
    const startView = this.transformTriple(this.currentTransform);
    const endView = this.transformTriple(this.buildZoomTransform(focus));
    const interpolate = d3.interpolateZoom(startView, endView);
    const durationFactor =
      focus.kind === 'divine'
        ? 1.08
        : focus.kind === 'revelation_ring'
          ? 1.02
          : focus.kind === 'world'
            ? 0.92
            : 0.97;

    return Math.max(1100, Math.min(3200, interpolate.duration * durationFactor));
  }

  private autoTourHoldDuration(focus: FocusState): number {
    return focus.kind === 'world'
      ? 780
      : focus.kind === 'divine'
        ? 1460
        : focus.kind === 'revelation_ring'
          ? 1280
          : focus.kind === 'cluster' || focus.kind === 'worldview_ring'
            ? 1120
            : 980;
  }

  private renderAtmosphere(): void {
    if (!this.atmosphereLayer) {
      return;
    }

    const stars = d3.range(420).map((index) => {
      const bright = Math.random();
      return {
        id: index,
        x: (Math.random() - 0.5) * 2800,
        y: (Math.random() - 0.5) * 1900,
        r: bright > 0.992 ? 2.4 : bright > 0.94 ? 1.44 : 0.32 + bright * 0.58,
        opacity: bright > 0.992 ? 0.96 : bright > 0.94 ? 0.56 : 0.08 + bright * 0.22,
      };
    });

    const dustBands = d3.range(24).map((index) => ({
      id: index,
      x: -1340 + index * 124 + (Math.random() - 0.5) * 110,
      y: -360 + index * 30 + (Math.random() - 0.5) * 74,
      rx: 180 + (index % 4) * 56,
      ry: 20 + (index % 3) * 10,
      opacity: 0.014 + (index % 5) * 0.008,
    }));

    this.atmosphereLayer
      .append('g')
      .attr('class', 'atlas-canvas__halo-field')
      .selectAll('circle')
      .data([
        { x: -520, y: -320, r: 440, className: 'is-blue' },
        { x: 10, y: -170, r: 520, className: 'is-solar' },
        { x: 560, y: -80, r: 380, className: 'is-gold' },
        { x: 140, y: 330, r: 340, className: 'is-cyan' },
      ])
      .join('circle')
      .attr('class', (d) => `atlas-canvas__halo ${d.className}`)
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.r);

    this.atmosphereLayer
      .append('g')
      .attr('class', 'atlas-canvas__dust-field')
      .selectAll('ellipse')
      .data(dustBands)
      .join('ellipse')
      .attr('class', 'atlas-canvas__dust')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('rx', (d) => d.rx)
      .attr('ry', (d) => d.ry)
      .attr('transform', (d) => `rotate(${(d.id % 13) * 9 - 52} ${d.x} ${d.y})`)
      .attr('opacity', (d) => d.opacity);

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

    this.renderConstellationLayers(ATLAS_CONSTELLATION_LAYERS);
    this.renderSacredScene(this.sacredScene);
  }

  private renderSacredScene(sceneData: SacredAtlasScene): void {
    if (!this.sacredLayer) {
      return;
    }

    this.sacredLayer.selectAll('*').remove();
    const root = this.sacredLayer.append('g').attr('class', 'atlas-canvas__sacred-root');
    const projectedNodes = this.projectSacredNodes(sceneData);
    const divineCenter = projectedNodes.find((node) => node.type === 'divine_center');
    const revelationCore = projectedNodes.find((node) => node.type === 'revelation_core');
    this.sacredNodeMap = new Map(projectedNodes.map((node) => [node.id, node]));
    const ringMap = new Map(sceneData.rings.map((ring) => [ring.id, ring]));
    const projectedLinks = sceneData.links
      .map((link) => ({
        id: link.id,
        kind: link.kind,
        polarity: link.polarity,
        strength: link.strength,
        sourceNode: this.sacredNodeMap.get(link.source),
        targetNode: this.sacredNodeMap.get(link.target),
      }))
      .filter(
        (
          link,
        ): link is SacredAtlasLinkProjection => Boolean(link.sourceNode && link.targetNode),
      );

    root
      .append('g')
      .attr('class', 'atlas-canvas__sacred-ring-field')
      .selectAll('circle')
      .data(sceneData.rings.filter((ring) => ring.radius > 0))
      .join('circle')
      .attr('class', (ring) => `atlas-canvas__sacred-ring atlas-canvas__sacred-ring--${ring.id}`)
      .attr('cx', sceneData.origin.x)
      .attr('cy', sceneData.origin.y)
      .attr('r', (ring) => ring.radius)
      .attr('stroke', (ring) => ring.color)
      .attr('opacity', (ring) => ring.opacity);

    root
      .append('g')
      .attr('class', 'atlas-canvas__sacred-ring-halos')
      .selectAll('circle')
      .data(sceneData.rings.filter((ring) => (ring.halo ?? 0) > 0))
      .join('circle')
      .attr('class', (ring) => `atlas-canvas__sacred-ring-halo atlas-canvas__sacred-ring-halo--${ring.id}`)
      .attr('cx', sceneData.origin.x)
      .attr('cy', sceneData.origin.y)
      .attr('r', (ring) => ring.radius + Math.min((ring.halo ?? 0) * 0.22, 42))
      .attr('fill', (ring) => ring.color)
      .attr('opacity', (ring) => Math.min(0.026, ring.opacity * 0.055));

    root
      .append('g')
      .attr('class', 'atlas-canvas__sacred-ring-labels')
      .selectAll('text')
      .data(sceneData.rings)
      .join('text')
      .attr('class', 'atlas-canvas__sacred-ring-label')
      .attr('x', (ring) => sceneData.origin.x + Math.cos(ring.labelAngle ?? -Math.PI / 2) * (ring.radius + (ring.labelOffset ?? 24)))
      .attr('y', (ring) => sceneData.origin.y + Math.sin(ring.labelAngle ?? -Math.PI / 2) * (ring.radius + (ring.labelOffset ?? 24)))
      .attr('fill', (ring) => ring.color)
      .attr('text-anchor', 'middle')
      .text((ring) => ring.label);

    const solarHalos = [
      ...(divineCenter
        ? [
            { x: divineCenter.x, y: divineCenter.y, r: divineCenter.radius + 44, opacity: 0.18, fill: '#fff3c4', className: 'divine' },
            { x: divineCenter.x, y: divineCenter.y, r: divineCenter.radius + 118, opacity: 0.11, fill: '#ffd99a', className: 'divine' },
            { x: divineCenter.x, y: divineCenter.y, r: divineCenter.radius + 232, opacity: 0.06, fill: '#ffc66e', className: 'divine' },
            { x: divineCenter.x, y: divineCenter.y, r: divineCenter.radius + 344, opacity: 0.028, fill: '#ffb45e', className: 'divine' },
          ]
        : []),
      ...(revelationCore
        ? [
            { x: revelationCore.x, y: revelationCore.y, r: revelationCore.radius + 28, opacity: 0.12, fill: revelationCore.color, className: 'revelation' },
            { x: revelationCore.x, y: revelationCore.y, r: revelationCore.radius + 64, opacity: 0.05, fill: revelationCore.color, className: 'revelation' },
          ]
        : []),
    ];

    if (solarHalos.length) {
      root
        .append('g')
        .attr('class', 'atlas-canvas__sacred-solar-halos')
        .selectAll('circle')
        .data(solarHalos)
        .join('circle')
        .attr('class', (halo) => `atlas-canvas__sacred-solar-halo atlas-canvas__sacred-solar-halo--${halo.className}`)
        .attr('cx', (halo) => halo.x)
        .attr('cy', (halo) => halo.y)
        .attr('r', (halo) => halo.r)
        .attr('fill', (halo) => halo.fill)
        .attr('opacity', (halo) => halo.opacity);
    }

    root
      .append('g')
      .attr('class', 'atlas-canvas__sacred-links')
      .selectAll('path')
      .data(projectedLinks)
      .join('path')
      .attr('class', (link) => `atlas-canvas__sacred-link atlas-canvas__sacred-link--${link.kind} atlas-canvas__sacred-link--${link.polarity}`)
      .attr('d', (link) => this.sacredLinkPath(link));

    const nodeGroups = root
      .append('g')
      .attr('class', 'atlas-canvas__sacred-nodes')
      .selectAll<SVGGElement, SacredAtlasProjection>('g')
      .data(projectedNodes, (node) => node.id)
      .join((enter) => {
        const group = enter
          .append('g')
          .attr('class', (node) => `atlas-canvas__sacred-node atlas-canvas__sacred-node--${node.type} atlas-canvas__sacred-node--${node.polarity}`);

        group.append('circle').attr('class', 'atlas-canvas__sacred-node-halo');
        group.append('circle').attr('class', 'atlas-canvas__sacred-node-orbit');
        group.append('path').attr('class', 'atlas-canvas__sacred-node-symbol');
        group.append('circle').attr('class', 'atlas-canvas__sacred-node-core');
        group.append('text').attr('class', 'atlas-canvas__sacred-node-label').attr('filter', 'url(#atlas-label-glow)');
        return group;
      })
      .attr('data-semantic-id', (node) => node.id)
      .on('mouseenter', (_, node) => {
        this.focusCard.set(this.cardForSacredNode(node));
      })
      .on('mouseleave', () => this.updateFocusCard(this.focus()))
      .on('click', (_, node) => {
        this.pauseAutoTour();
        this.ngZone.run(() => this.focusSacredNode(node));
      });

    nodeGroups
      .select<SVGCircleElement>('circle.atlas-canvas__sacred-node-halo')
      .attr('r', (node) => {
        if (node.type === 'divine_center') {
          return node.radius + Math.min(node.glow * 1.6, 372);
        }
        if (node.type === 'revelation_core') {
          return node.radius + Math.min(node.glow * 1.06, 176);
        }
        if (node.type === 'book') {
          return node.radius + Math.min(node.glow * 0.82, 124);
        }
        return node.radius + Math.min(node.glow * 0.34, 56);
      })
      .attr('fill', (node) => node.color)
      .attr('opacity', (node) =>
        node.type === 'divine_center'
          ? Math.min(0.4, 0.22 + node.luminosity * 0.016)
          : node.type === 'revelation_core'
            ? Math.min(0.26, 0.1 + node.luminosity * 0.011)
          : node.type === 'book'
            ? Math.min(0.18, 0.06 + node.luminosity * 0.008)
          : Math.min(0.07, 0.012 + node.luminosity * 0.004),
      );

    nodeGroups
      .select<SVGCircleElement>('circle.atlas-canvas__sacred-node-orbit')
      .attr('cx', (node) => node.x)
      .attr('cy', (node) => node.y)
      .attr('r', (node) => Math.max(node.radius + 8, node.radius + node.visual_tier * 1.8))
      .attr('stroke', (node) => node.color);

    nodeGroups
      .select<SVGPathElement>('path.atlas-canvas__sacred-node-symbol')
      .attr('transform', (node) => `translate(${node.x} ${node.y})`)
      .attr('d', (node) => this.sacredNodeSymbolPath(node))
      .attr('fill', (node) => this.sacredNodeSymbolFill(node))
      .attr('stroke', '#fff7e0');

    nodeGroups
      .select<SVGCircleElement>('circle.atlas-canvas__sacred-node-core')
      .attr('cx', (node) => node.x)
      .attr('cy', (node) => node.y)
      .attr('r', (node) =>
        node.type === 'divine_center'
          ? 0
          : node.type === 'revelation_core'
            ? Math.max(4.8, node.radius * 0.22)
            : node.type === 'book'
              ? Math.max(3.2, node.radius * 0.24)
              : Math.max(1.8, node.radius * 0.18),
      )
      .attr('fill', (node) =>
        node.type === 'divine_center'
          ? '#ffffff'
          : node.type === 'revelation_core'
            ? '#fffdf2'
            : node.type === 'book'
              ? '#fff7e2'
              : '#fffef7',
      );

    nodeGroups
      .select<SVGTextElement>('text.atlas-canvas__sacred-node-label')
      .attr('x', (node) => node.label_x)
      .attr('y', (node) => node.label_y)
      .attr('text-anchor', (node) => node.label_anchor)
      .attr('fill', (node) => node.color)
      .text((node) => (node.type === 'divine_center' ? '' : node.label));

    this.renderSacredFocusState();
  }

  private projectSacredNodes(sceneData: SacredAtlasScene): SacredAtlasProjection[] {
    const ringMap = new Map(sceneData.rings.map((ring) => [ring.id, ring]));

    return sceneData.nodes.map((node) => {
      const ring = ringMap.get(node.ring);
      const orbitRadius = (ring?.radius ?? 0) + (node.radius_offset ?? 0);
      const x = sceneData.origin.x + Math.cos(node.angle) * orbitRadius;
      const y = sceneData.origin.y + Math.sin(node.angle) * orbitRadius;
      const radius = this.sacredNodeRadius(node);
      const labelDistance = radius + (node.type === 'divine_center' ? 40 : node.type === 'revelation_core' ? 42 : 18);
      let label_x = x;
      let label_y = y - labelDistance;
      let label_anchor: 'start' | 'middle' | 'end' = 'middle';

      if (node.type !== 'divine_center' && node.type !== 'revelation_core' && node.type !== 'opposition_core') {
        const horizontal = Math.cos(node.angle);
        const vertical = Math.sin(node.angle);
        if (Math.abs(horizontal) > 0.44) {
          label_x = x + horizontal * labelDistance;
          label_y = y + 4;
          label_anchor = horizontal > 0 ? 'start' : 'end';
        } else {
          label_y = y + vertical * labelDistance + (vertical > 0 ? 8 : -8);
        }
      }

      if (node.type === 'opposition_core') {
        label_y = y + labelDistance + 4;
      }

      return {
        ...node,
        x,
        y,
        radius,
        label_x,
        label_y,
        label_anchor,
      };
    });
  }

  private sacredNodeRadius(node: SacredAtlasScene['nodes'][number]): number {
    switch (node.type) {
      case 'divine_center':
        return 34;
      case 'revelation_core':
        return 36;
      case 'opposition_core':
        return 13;
      case 'prophet':
        return 9 + node.theological_weight * 0.28;
      case 'book':
        return 12 + node.theological_weight * 0.34;
      case 'attribute':
        return 7 + node.theological_weight * 0.2;
      case 'worldview_cluster':
        return 7 + node.theological_weight * 0.14;
      case 'corruption_vector':
        return 6 + node.theological_weight * 0.12;
      default:
        return 7 + node.theological_weight * 0.16;
    }
  }

  private sacredNodeSymbolPath(node: SacredAtlasProjection): string {
    const radius = this.finiteNumber(node.radius);
    if (radius <= 0) {
      return '';
    }

    switch (node.type) {
      case 'divine_center':
        return '';
      case 'revelation_core':
        return this.discPath(radius * 0.98);
      case 'book':
        return this.discPath(radius * 0.92);
      case 'prophet':
        return this.sparklePath(radius * 0.96, Math.PI / 4, 0.88);
      case 'attribute':
        return this.discPath(radius * 0.8);
      case 'opposition_core':
        return this.discPath(radius * 0.84);
      case 'corruption_vector':
        return this.discPath(radius * 0.72);
      case 'worldview_cluster':
        return this.discPath(radius * 0.84);
      default:
        return this.discPath(radius * 0.82);
    }
  }

  private sacredNodeSymbolFill(node: SacredAtlasProjection): string {
    switch (node.type) {
      case 'divine_center':
        return 'url(#atlas-divine-core)';
      case 'revelation_core':
        return 'url(#atlas-revelation-core)';
      case 'book':
        return 'url(#atlas-book-core)';
      default:
        return node.color;
    }
  }

  private sacredLinkPath(link: SacredAtlasLinkProjection): string {
    const sx = this.finiteNumber(link.sourceNode.x);
    const sy = this.finiteNumber(link.sourceNode.y);
    const tx = this.finiteNumber(link.targetNode.x);
    const ty = this.finiteNumber(link.targetNode.y);
    if (![sx, sy, tx, ty].every(Number.isFinite)) {
      return '';
    }

    const dx = tx - sx;
    const dy = ty - sy;
    const distance = Math.hypot(dx, dy) || 1;
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const bendSign = link.polarity === 'corruption' ? -1 : 1;
    const bend = Math.min(180, 18 + link.strength * 68) * bendSign;
    const cx = (sx + tx) / 2 + normalX * bend;
    const cy = (sy + ty) / 2 + normalY * bend;

    return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
  }

  private focusSacredNode(node: SacredAtlasProjection): void {
    const kind =
      node.type === 'divine_center'
        ? 'divine'
        : node.type === 'book'
          ? 'book_ring'
          : node.type === 'prophet'
            ? 'prophet_ring'
            : node.type === 'opposition_core' || node.type === 'corruption_vector'
              ? 'opposition'
              : node.type === 'worldview_cluster'
                ? 'worldview_ring'
                : 'revelation_ring';

    this.setFocus(
      {
        kind,
        semanticId: node.id,
        ringId: node.ring,
        clusterId: node.linked_cluster_id,
      },
      true,
      kind === 'divine' ? 2200 : kind === 'revelation_ring' ? 1960 : 1760,
    );
  }

  private renderSacredFocusState(): void {
    if (!this.sacredLayer) {
      return;
    }

    const focus = this.focus();
    const focusId = focus.semanticId;
    const activeNeighbors = new Set(
      this.sacredScene.links.flatMap((link) =>
        link.source === focusId || link.target === focusId ? [link.source, link.target] : [],
      ),
    );

    this.sacredLayer
      .selectAll<SVGCircleElement, SacredAtlasScene['rings'][number]>('.atlas-canvas__sacred-ring')
      .attr('opacity', (ring) => {
        if (!focus.ringId) {
          return ring.id === 'divine'
            ? 0.08
            : ring.id === 'revelation-core'
              ? 0.06
              : ring.id === 'attributes' || ring.id === 'books' || ring.id === 'prophets'
                ? 0.032
                : 0.016;
        }
        if (ring.id === focus.ringId) {
          return Math.min(0.28, ring.opacity * 0.44 + 0.04);
        }
        if (ring.id === 'divine' || ring.id === 'revelation-core') {
          return Math.max(ring.opacity * 0.1, 0.035);
        }
        return Math.max(ring.opacity * 0.04, 0.008);
      });

    this.sacredLayer
      .selectAll<SVGGElement, SacredAtlasProjection>('.atlas-canvas__sacred-node')
      .attr('opacity', (node) => {
        if (!focusId) {
          return node.type === 'divine_center'
            ? 0.92
            : node.type === 'revelation_core'
              ? 1
              : node.type === 'book'
                ? 0.72
                : node.type === 'prophet'
                  ? 0.56
                : node.type === 'attribute'
                  ? 0.34
                  : 0.22;
        }
        if (node.id === focusId) {
          return 1;
        }
        if (activeNeighbors.has(node.id)) {
          return 0.72;
        }
        if (focus.ringId && node.ring === focus.ringId) {
          return 0.48;
        }
        if (node.type === 'divine_center' || node.type === 'revelation_core') {
          return 0.4;
        }
        return 0.08;
      })
      .attr('class', (node) => {
        const focused = node.id === focusId ? ' is-focused' : '';
        return `atlas-canvas__sacred-node atlas-canvas__sacred-node--${node.type} atlas-canvas__sacred-node--${node.polarity}${focused}`;
      });

    this.sacredLayer
      .selectAll<SVGPathElement, SacredAtlasLinkProjection>('.atlas-canvas__sacred-link')
      .attr('opacity', (link) => {
        if (!focusId) {
          return link.sourceNode.type === 'divine_center' || link.targetNode.type === 'divine_center'
            ? 0.045
            : link.sourceNode.type === 'revelation_core' || link.targetNode.type === 'revelation_core'
              ? 0.032
              : 0.012;
        }
        if (link.sourceNode.id === focusId || link.targetNode.id === focusId) {
          return 0.36;
        }
        if (focus.ringId && (link.sourceNode.ring === focus.ringId || link.targetNode.ring === focus.ringId)) {
          return 0.12;
        }
        return 0.015;
      });

    this.sacredLayer
      .selectAll<SVGTextElement, SacredAtlasProjection>('.atlas-canvas__sacred-node-label')
      .attr('opacity', (node) => {
        if (node.type === 'divine_center') {
          return 0;
        }
        if (!focusId) {
          return node.type === 'revelation_core'
            ? 1
            : node.type === 'book'
              ? 0.72
              : node.type === 'prophet'
                ? 0.42
              : 0.08;
        }
        if (node.id === focusId) {
          return 1;
        }
        if (activeNeighbors.has(node.id) || (focus.ringId && node.ring === focus.ringId)) {
          return 0.52;
        }
        return 0.06;
      });
  }

  private renderConstellationLayers(layers: AtlasConstellationLayer[]): void {
    if (!this.atmosphereLayer || layers.length === 0) {
      return;
    }

    const root = this.atmosphereLayer.append('g').attr('class', 'atlas-canvas__constellation-root');

    for (const layer of layers) {
      const group = root
        .append('g')
        .attr('class', `atlas-canvas__constellation atlas-canvas__constellation--${layer.id}`)
        .attr('opacity', layer.opacity ?? 1);

      const bodiesById = new Map(layer.bodies.map((body) => [body.id, body]));
      const rays = (layer.rays ?? [])
        .map((ray) => ({
          ...ray,
          sourceBody: bodiesById.get(ray.source),
          targetBody: bodiesById.get(ray.target),
        }))
        .filter(
          (
            ray,
          ): ray is typeof ray & {
            sourceBody: NonNullable<typeof ray.sourceBody>;
            targetBody: NonNullable<typeof ray.targetBody>;
          } => Boolean(ray.sourceBody && ray.targetBody),
        );

      group
        .append('g')
        .attr('class', 'atlas-canvas__constellation-rays')
        .selectAll('line')
        .data(rays)
        .join('line')
        .attr('class', 'atlas-canvas__constellation-ray')
        .attr('x1', (ray) => ray.sourceBody.x)
        .attr('y1', (ray) => ray.sourceBody.y)
        .attr('x2', (ray) => ray.targetBody.x)
        .attr('y2', (ray) => ray.targetBody.y)
        .attr('stroke', layer.color)
        .attr('opacity', (ray) => ray.opacity ?? 0.12);

      group
        .append('g')
        .attr('class', 'atlas-canvas__constellation-halos')
        .selectAll('circle')
        .data(layer.bodies)
        .join('circle')
        .attr('class', (body) => `atlas-canvas__constellation-halo atlas-canvas__constellation-halo--${body.kind ?? 'satellite'}`)
        .attr('cx', (body) => body.x)
        .attr('cy', (body) => body.y)
        .attr('r', (body) => body.r + body.glow)
        .attr('fill', (body) => body.color)
        .attr('opacity', (body) => Math.min(0.2, body.opacity * 0.15 + 0.025));

      group
        .append('g')
        .attr('class', 'atlas-canvas__constellation-stars')
        .selectAll('circle')
        .data(layer.bodies)
        .join('circle')
        .attr('class', (body) => `atlas-canvas__constellation-star atlas-canvas__constellation-star--${body.kind ?? 'satellite'}`)
        .attr('cx', (body) => body.x)
        .attr('cy', (body) => body.y)
        .attr('r', (body) => body.r)
        .attr('fill', (body) => body.color)
        .attr('opacity', (body) => Math.min(1, body.opacity + 0.06));

      group
        .append('g')
        .attr('class', 'atlas-canvas__constellation-labels')
        .selectAll('text')
        .data(layer.bodies.filter((body) => (body.label_opacity ?? 0) > 0.2))
        .join('text')
        .attr('class', (body) => `atlas-canvas__constellation-label atlas-canvas__constellation-label--${body.kind ?? 'satellite'}`)
        .attr('x', (body) => body.x)
        .attr('y', (body) => body.y - body.r - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', (body) => body.color)
        .attr('font-size', (body) => body.label_size ?? 8)
        .attr('opacity', (body) => body.label_opacity ?? 0.34)
        .text((body) => body.short_label ?? body.label);

      group
        .append('text')
        .attr('class', 'atlas-canvas__constellation-title')
        .attr('x', layer.label_x)
        .attr('y', layer.label_y)
        .attr('fill', layer.color)
        .text(layer.label);
    }
  }

  private ambientOpacity(target: Element, fallback: number, minFactor: number, maxFactor: number): number {
    const attrOpacity = target.getAttribute('opacity');
    const styleOpacity = (target as HTMLElement).style?.opacity;
    const base = Number(attrOpacity ?? styleOpacity ?? fallback);

    return Math.max(0.02, Math.min(1, base * gsap.utils.random(minFactor, maxFactor)));
  }

  private startAmbientAnimation(): void {
    this.animationContext?.revert();
    this.animationContext = gsap.context(() => {
      gsap.fromTo(
        '.atlas-canvas__sacred-ring, .atlas-canvas__sacred-link, .atlas-canvas__sacred-node, .atlas-canvas__sacred-ring-label',
        { opacity: 0, scale: 0.96, transformOrigin: '50% 50%' },
        {
          opacity: 1,
          scale: 1,
          duration: 1.8,
          stagger: 0.03,
          ease: 'power3.out',
          clearProps: 'transform',
        },
      );

      gsap.fromTo(
        '.atlas-canvas__territory, .atlas-canvas__node',
        { opacity: 0, scale: 0.94, transformOrigin: '50% 50%' },
        {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          stagger: 0.02,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );

      gsap.set('.atlas-canvas__star', { clearProps: 'transform,opacity' });

      gsap.set('.atlas-canvas__sacred-ring-halo, .atlas-canvas__sacred-link', {
        clearProps: 'transform,opacity',
      });

      gsap.set('.atlas-canvas__dust, .atlas-canvas__territory-nebula, .atlas-canvas__territory-track, .atlas-canvas__node-halo, .atlas-canvas__node-orbit', {
        clearProps: 'transform',
      });

      gsap.set('.atlas__edge-word', {
        willChange: 'transform, opacity',
      });

      gsap.fromTo(
        '.atlas__edge-word',
        {
          opacity: 0,
        },
        {
          opacity: (_, target) => Number((target as HTMLElement).style.opacity || 0.18),
          duration: 2.4,
          stagger: {
            each: 0.06,
            from: 'random',
          },
          ease: 'power2.out',
        },
      );

      gsap.to('.atlas__edge-word', {
        x: (_, target) => {
          const side = (target as HTMLElement).dataset['side'];
          return side === 'top' || side === 'bottom' ? gsap.utils.random(-8, 8) : gsap.utils.random(-2, 2);
        },
        y: (_, target) => {
          const side = (target as HTMLElement).dataset['side'];
          return side === 'left' || side === 'right' ? gsap.utils.random(-8, 8) : gsap.utils.random(-2, 2);
        },
        duration: () => gsap.utils.random(24, 40),
        delay: (_, target) => Number((target as HTMLElement).dataset['delay'] ?? 0) * 0.12 + 0.6,
        repeat: -1,
        yoyo: true,
        stagger: {
          each: 0.05,
          from: 'random',
        },
        ease: 'sine.inOut',
      });

    }, this.hostRef.nativeElement);
  }

  private renderTerritories(clusters: AtlasCluster[]): void {
    if (!this.territoryLayer) {
      return;
    }

    this.territorySelection = this.territoryLayer
      .selectAll<SVGGElement, AtlasCluster>('g.atlas-canvas__territory')
      .data(clusters, (cluster) => cluster.id)
      .join((enter) => {
        const group = enter.append('g').attr('class', 'atlas-canvas__territory');
        group.append('path').attr('class', 'atlas-canvas__territory-nebula');
        group.append('path').attr('class', 'atlas-canvas__territory-track').attr('fill', 'none');
        group.append('g').attr('class', 'atlas-canvas__territory-dust');
        group
          .append('text')
          .attr('class', 'atlas-canvas__territory-label')
          .attr('filter', 'url(#atlas-label-glow)');
        return group;
      })
      .attr('data-cluster-id', (cluster) => cluster.id)
      .on('click', (_, cluster) => {
        this.pauseAutoTour();
        this.ngZone.run(() =>
          this.setFocus({ kind: 'cluster', clusterId: cluster.id }),
        );
      });

    this.territorySelection.each((cluster, index, groups) => {
      const group = d3.select(groups[index]);
      const labelPlacement = this.clusterLabelPlacement(cluster);

      group
        .select<SVGPathElement>('path.atlas-canvas__territory-nebula')
        .attr('d', this.clusterNebulaPath(cluster))
        .attr('fill', cluster.color)
        .attr('stroke', cluster.color)
        .attr('filter', 'url(#atlas-soft-glow)');

      group
        .select<SVGPathElement>('path.atlas-canvas__territory-track')
        .attr('d', this.clusterTrackPath(cluster))
        .attr('stroke', cluster.color);

      group
        .select<SVGTextElement>('text.atlas-canvas__territory-label')
        .attr('x', labelPlacement.x)
        .attr('y', labelPlacement.y)
        .attr('text-anchor', labelPlacement.anchor)
        .text(cluster.label);

      group
        .select<SVGGElement>('g.atlas-canvas__territory-dust')
        .selectAll<SVGCircleElement, ClusterDust>('circle')
        .data(this.clusterDust(cluster), (dust) => dust.id)
        .join('circle')
        .attr('class', 'atlas-canvas__territory-star')
        .attr('cx', (dust) => dust.x)
        .attr('cy', (dust) => dust.y)
        .attr('r', (dust) => dust.r)
        .attr('opacity', (dust) => dust.opacity)
        .attr('fill', (dust) => dust.fill);
    });
  }

  private renderLinks(links: SimulationLink[]): void {
    if (!this.linkLayer) {
      return;
    }

    this.linkSelection = this.linkLayer
      .selectAll<SVGPathElement, SimulationLink>('path')
      .data(links, (link) => link.id)
      .join('path')
      .attr('class', (link) => `atlas-canvas__link atlas-canvas__link--${this.facade.edgeSlug(link.type)}`);
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

        group.append('circle').attr('class', 'atlas-canvas__node-halo');
        group.append('path').attr('class', 'atlas-canvas__node-orbit').attr('fill', 'none');
        group.append('path').attr('class', 'atlas-canvas__node-symbol');
        group.append('circle').attr('class', 'atlas-canvas__node-core-dot');
        return group;
      })
      .attr('data-node-id', (node) => node.id)
      .on('click', (_, node) => {
        this.pauseAutoTour();
        this.ngZone.run(() => this.setFocus(this.facade.focusForNode(node)));
      });

    this.nodeSelection
      .select<SVGCircleElement>('circle.atlas-canvas__node-halo')
      .attr('r', (node) => this.facade.nodeRadius(node) * 2.15)
      .attr('fill', (node) => this.clusterMap.get(node.cluster_id)?.color ?? '#ffffff');

    this.nodeSelection
      .select<SVGPathElement>('path.atlas-canvas__node-orbit')
      .attr('d', (node) => this.nodeOrbitPath(node))
      .attr('stroke', (node) => this.facade.nodeStroke(node, this.clusterMap));

    this.nodeSelection
      .select<SVGPathElement>('path.atlas-canvas__node-symbol')
      .attr('d', (node) => this.nodeSymbolPath(node))
      .attr('fill', (node) => this.facade.nodeFill(node, this.clusterMap))
      .attr('stroke', (node) => this.facade.nodeStroke(node, this.clusterMap));

    this.nodeSelection
      .select<SVGCircleElement>('circle.atlas-canvas__node-core-dot')
      .attr('r', (node) => Math.max(1.8, this.facade.nodeRadius(node) * 0.18))
      .attr('fill', 'rgba(255,255,255,0.92)');
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
      .attr('filter', 'url(#atlas-label-glow)')
      .text((node) => this.facade.shortLabel(node))
      .on('click', (_, node) => {
        this.pauseAutoTour();
        this.ngZone.run(() => this.setFocus(this.facade.focusForNode(node)));
      });

    this.labelSelection.each(function(node) {
      d3.select(this)
        .selectAll('title')
        .data([node])
        .join('title')
        .text(node.label);
    });
  }

  private renderGraph(): void {
    if (!this.graphData || !this.nodeSelection || !this.linkSelection || !this.labelSelection) {
      return;
    }

    const focus = this.focus();
    const scale = this.currentTransform.k || 1;

    this.linkSelection
      .attr('d', (link) => this.linkPath(link))
      .attr('stroke', (link) => this.facade.edgeStroke(link, this.clusterMap, (node) => this.resolveNode(node)))
      .attr('stroke-width', (link) => this.facade.edgeWidth(link, scale))
      .attr('stroke-opacity', (link) =>
        this.facade.edgeOpacity(link, focus, scale, this.linksByNode, (node) => this.resolveNode(node)));

    this.nodeSelection
      .attr('transform', (node) => {
        const { x, y } = this.nodePosition(node);
        return `translate(${x}, ${y})`;
      })
      .attr('opacity', (node) => this.facade.nodeOpacity(node, focus, scale, this.linksByNode))
      .attr('class', (node) => `${this.facade.nodeClass(node)}${this.facade.isFocusedNode(node, focus) ? ' is-focused' : ''}`);

    this.labelSelection
      .attr('x', (node) => this.labelPlacement(node).x)
      .attr('y', (node) => this.labelPlacement(node).y)
      .attr('opacity', (node) => this.facade.labelOpacity(node, focus, scale, this.linksByNode))
      .attr('text-anchor', (node) => this.labelPlacement(node).anchor);

    this.territorySelection
      ?.attr('opacity', (cluster) => this.facade.clusterOpacity(cluster, focus, scale))
      .attr('class', (cluster) => this.facade.territoryClass(cluster, focus));

  }

  private clusterNebulaPath(cluster: AtlasCluster): string {
    const rotation = this.seededValue(cluster.id, 3) * Math.PI * 2;
    const stretchX = 1.05 + this.seededValue(cluster.id, 7) * 0.55;
    const stretchY = 0.74 + this.seededValue(cluster.id, 11) * 0.34;

    const points = d3.range(14).map((index) => {
      const angle = (index / 14) * Math.PI * 2;
      const warp = 0.72 + this.seededValue(cluster.id, index + 21) * 0.32 + Math.sin(angle * 3 + rotation) * 0.08;
      const radius = cluster.radius * warp;
      return {
        x: cluster.world_x + Math.cos(angle + rotation) * radius * stretchX,
        y: cluster.world_y + Math.sin(angle + rotation) * radius * stretchY,
      };
    });

    return this.safeLinePath(points, d3.curveCatmullRomClosed.alpha(0.72));
  }

  private clusterTrackPath(cluster: AtlasCluster): string {
    const rotation = this.seededValue(cluster.id, 31) * Math.PI * 2;
    const arcSpan = Math.PI * (1.04 + this.seededValue(cluster.id, 37) * 0.32);
    const start = rotation - arcSpan * 0.54;
    const end = rotation + arcSpan * 0.46;
    const rx = cluster.radius * (0.92 + this.seededValue(cluster.id, 41) * 0.22);
    const ry = cluster.radius * (0.58 + this.seededValue(cluster.id, 43) * 0.16);

    const points = d3.range(28).map((index) => {
      const t = index / 27;
      const angle = start + (end - start) * t;
      return {
        x: cluster.world_x + Math.cos(angle) * rx,
        y: cluster.world_y + Math.sin(angle) * ry,
      };
    });

    return this.safeLinePath(points, d3.curveCatmullRom.alpha(0.8));
  }

  private clusterDust(cluster: AtlasCluster): ClusterDust[] {
    const rotation = this.seededValue(cluster.id, 101) * Math.PI * 2;
    const color = d3.color(cluster.color)?.brighter(0.8).formatRgb() ?? cluster.color;

    return d3.range(12).map((index) => {
      const angle = rotation + (index / 12) * Math.PI * 2 + this.seededValue(cluster.id, index + 120) * 0.6;
      const orbit = cluster.radius * (0.24 + this.seededValue(cluster.id, index + 138) * 0.72);
      return {
        id: `${cluster.id}-${index}`,
        x: cluster.world_x + Math.cos(angle) * orbit * (1.1 + this.seededValue(cluster.id, index + 160) * 0.34),
        y: cluster.world_y + Math.sin(angle) * orbit * (0.72 + this.seededValue(cluster.id, index + 170) * 0.18),
        r: 1 + (index % 3) * 0.7,
        opacity: 0.1 + (index % 4) * 0.04,
        fill: color,
      };
    });
  }

  private clusterLabelPlacement(cluster: AtlasCluster): LabelPlacement {
    return {
      x: cluster.world_x - cluster.radius * 0.26,
      y: cluster.world_y - cluster.radius * 0.46,
      anchor: 'start',
    };
  }

  private linkPath(link: SimulationLink): string {
    const source = this.resolveNode(link.source);
    const target = this.resolveNode(link.target);
    if (!source || !target) {
      return '';
    }

    const { x: sx, y: sy } = this.nodePosition(source);
    const { x: tx, y: ty } = this.nodePosition(target);
    if (![sx, sy, tx, ty].every(Number.isFinite)) {
      return '';
    }

    const dx = tx - sx;
    const dy = ty - sy;
    const distance = Math.hypot(dx, dy) || 1;
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const bendDirection = this.seededValue(link.id, 11) > 0.5 ? 1 : -1;
    const bendStrength = Math.min(140, distance * (link.type === 'contrasts' ? 0.22 : 0.12));
    const controlX = (sx + tx) / 2 + normalX * bendStrength * bendDirection;
    const controlY = (sy + ty) / 2 + normalY * bendStrength * bendDirection;

    return `M ${sx} ${sy} Q ${controlX} ${controlY} ${tx} ${ty}`;
  }

  private nodeSymbolPath(node: SimulationNode): string {
    const radius = this.finiteNumber(this.facade.nodeRadius(node));
    if (radius <= 0) {
      return '';
    }

    if (node.kind === 'concept') {
      return this.sparklePath(radius * 0.98, Math.PI / 4, 0.9);
    }
    if (node.kind === 'claim') {
      return this.discPath(radius * 0.82);
    }
    return this.discPath(radius * 0.68);
  }

  private nodeOrbitPath(node: SimulationNode): string {
    const radius = this.finiteNumber(this.facade.nodeRadius(node));
    if (radius <= 0) {
      return '';
    }

    const stretchX = node.kind === 'concept' ? 1.85 : node.kind === 'claim' ? 1.55 : 1.28;
    const stretchY = node.kind === 'concept' ? 1.12 : 0.92;
    const rotation = this.seededValue(node.id, 49) * Math.PI * 2;
    const start = rotation - Math.PI * 0.48;
    const end = rotation + Math.PI * (node.kind === 'evidence' ? 0.38 : 0.64);
    const rx = radius * stretchX;
    const ry = radius * stretchY;

    const points = d3.range(18).map((index) => {
      const t = index / 17;
      const angle = start + (end - start) * t;
      return {
        x: Math.cos(angle) * rx,
        y: Math.sin(angle) * ry,
      };
    });

    return this.safeLinePath(points, d3.curveCatmullRom.alpha(0.85));
  }

  private labelPlacement(node: SimulationNode): LabelPlacement {
    const { x, y } = this.nodePosition(node);
    const radius = this.facade.nodeRadius(node);

    if (node.kind === 'claim') {
      return {
        x: x + radius + 12,
        y: y - 2,
        anchor: 'start',
      };
    }

    if (node.kind === 'evidence') {
      return {
        x: x + radius + 10,
        y: y + radius * 0.2,
        anchor: 'start',
      };
    }

    return {
      x,
      y: y - radius - 18,
      anchor: 'middle',
    };
  }

  private starPath(radius: number, innerRadius: number, points: number, rotation = 0): string {
    if (![radius, innerRadius, points, rotation].every(Number.isFinite) || radius <= 0 || innerRadius < 0 || points < 2) {
      return '';
    }

    const vertices = d3.range(points * 2).map((index) => {
      const angle = rotation + (index / (points * 2)) * Math.PI * 2;
      const currentRadius = index % 2 === 0 ? radius : innerRadius;
      return `${index === 0 ? 'M' : 'L'} ${Math.cos(angle) * currentRadius} ${Math.sin(angle) * currentRadius}`;
    });

    return `${vertices.join(' ')} Z`;
  }

  private discPath(radius: number): string {
    if (!Number.isFinite(radius) || radius <= 0) {
      return '';
    }

    return `M 0 ${-radius} A ${radius} ${radius} 0 1 1 0 ${radius} A ${radius} ${radius} 0 1 1 0 ${-radius} Z`;
  }

  private sparklePath(radius: number, rotation = 0, innerRatio = 0.9, points = 4): string {
    return this.starPath(radius, radius * innerRatio, points, rotation);
  }

  private seededValue(seed: string, salt = 0): number {
    let hash = 2166136261 ^ salt;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index) + salt;
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
  }

  private updateFocusCard(focus: FocusState): void {
    if (focus.semanticId) {
      const semanticNode =
        this.sacredNodeMap.get(focus.semanticId) ??
        this.projectSacredNodes(this.sacredScene).find((node) => node.id === focus.semanticId);
      if (semanticNode) {
        this.focusCard.set(this.cardForSacredNode(semanticNode));
        return;
      }
    }

    if (focus.nodeId) {
      const node = this.nodeMap.get(focus.nodeId);
      if (node) {
        this.focusCard.set({
          id: node.id,
          title: node.label,
          subtitle: `${this.clusterMap.get(node.cluster_id)?.label ?? 'Worldview'} ${node.kind}`,
          summary: node.kind === 'concept'
            ? 'A major thematic anchor inside the worldview graph.'
            : node.kind === 'claim'
              ? 'A claim or interpretive statement branching from a thematic anchor.'
              : 'An evidence or textual grounding connected to the current claim.',
          polarity: 'guidance',
          relationToCenter: 'Rendered as an outer worldview constellation under the sacred center.',
          relationToQuran: 'Visible as part of the wider field that the revelation core illuminates, confirms, questions, or corrects.',
          relationToHumanResponse: 'Invites study, discernment, and comparison with the moral center of the atlas.',
        });
        return;
      }
    }

    if (focus.clusterId) {
      const cluster = this.clusterMap.get(focus.clusterId);
      if (cluster) {
        this.focusCard.set({
          id: cluster.id,
          title: cluster.label,
          subtitle: 'Worldview territory',
          summary: 'An outer thematic constellation that receives meaning from the sacred center without becoming autonomous from it.',
          polarity: 'guidance',
          relationToCenter: 'The cluster belongs to the worldview perimeter and should be read back toward the center.',
          relationToQuran: 'The Qur’an remains the criterion by which the territory is illuminated, challenged, or reordered.',
          relationToHumanResponse: 'Calls for thoughtful engagement rather than detached consumption.',
        });
        return;
      }
    }

    this.focusCard.set({
      id: 'atlas-overview',
      title: this.sacredScene.title,
      subtitle: 'Sacred observatory',
      summary: this.sacredScene.subtitle,
      polarity: 'guidance',
      relationToCenter: 'Everything begins from the divine center and receives rank by nearness, fidelity, or rebellion.',
      relationToQuran: 'The Qur’an is the strongest revealed star and the interpretive core of the field.',
      relationToHumanResponse: 'The atlas reads knowledge, history, and society as responses to revelation, memory, and moral struggle.',
    });
  }

  private cardForSacredNode(node: SacredAtlasProjection): AtlasFocusCard {
    return {
      id: node.id,
      title: node.label,
      subtitle: node.symbolic_role,
      summary: node.meaning_summary,
      polarity: node.polarity,
      relationToCenter: node.relation_to_center,
      relationToQuran: node.relation_to_quran,
      relationToHumanResponse: node.relation_to_human_response,
    };
  }

  private setFocus(
    focus: FocusState,
    animate = true,
    duration = 1760,
    onComplete?: () => void,
  ): void {
    this.focus.set(focus);
    this.updateFocusCard(focus);
    this.applyFocusZoom(animate, duration, onComplete);
    this.renderSacredFocusState();
    this.scheduleGraphRender();
  }

  private scaleZoomBy(factor: number): void {
    if (!this.svg || !this.zoomBehavior) {
      return;
    }

    this.pauseAutoTour();
    this.svg
      .transition()
      .duration(260)
      .ease(d3.easeCubicOut)
      .call(this.zoomBehavior.scaleBy, factor);
  }

  private applySceneTransform(transform: d3.ZoomTransform): void {
    this.currentTransform = transform;
    this.svg?.property('__zoom', transform);
    this.scene?.attr('transform', transform.toString());
    this.scheduleGraphRender();
  }

  private applyFocusZoom(
    animate = true,
    duration = 1760,
    onComplete?: () => void,
  ): void {
    if (!this.graphData || !this.zoomBehavior || !this.svg) {
      return;
    }

    const target = this.buildZoomTransform(this.focus());
    if (!animate) {
      this.applySceneTransform(target);
      onComplete?.();
      return;
    }

    const startView = this.transformTriple(this.currentTransform);
    const endView = this.transformTriple(target);
    const interpolate = d3.interpolateZoom(startView, endView);
    const transitionDuration = Math.max(
      650,
      Math.min(2800, Math.max(duration, interpolate.duration * 1.08)),
    );

    this.svg.interrupt();
    const transition = this.svg.transition().duration(transitionDuration).ease(d3.easeLinear);

    transition.tween('smooth-zoom', () => (t) => {
      this.applySceneTransform(this.transformFromTriple(interpolate(t)));
    });

    transition.on('end', () => {
      this.applySceneTransform(target);
      onComplete?.();
    });
  }

  private buildZoomTransform(focus: FocusState): d3.ZoomTransform {
    const { width, height } = this.viewport();
    const defaultWorld = this.zoomViews.get('view_world');

    if (focus.semanticId) {
      const semanticNode = this.sacredNodeMap.get(focus.semanticId);
      if (semanticNode) {
        const scale =
          focus.kind === 'divine'
            ? 1.38
            : focus.kind === 'revelation_ring'
              ? 1.2
              : focus.kind === 'book_ring'
                ? 1.08
                : focus.kind === 'prophet_ring'
                  ? 1.04
                  : focus.kind === 'opposition'
                    ? 1.1
                    : focus.kind === 'worldview_ring'
                      ? 0.94
                      : 1.02;

        return d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(scale)
          .translate(-semanticNode.x, -semanticNode.y);
      }
    }

    if (focus.kind === 'world') {
      const worldBounds = this.worldBounds();
      if (worldBounds) {
        return d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(worldBounds.k)
          .translate(-worldBounds.x, -worldBounds.y);
      }
      const k = defaultWorld?.k ?? 0.58;
      return d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(k)
        .translate(-(defaultWorld?.x ?? 0), -(defaultWorld?.y ?? 0));
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
        const { x, y } = this.nodePosition(node);
        return d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-x, -y);
      }
    }

    return d3.zoomIdentity.translate(width / 2, height / 2).scale(0.58);
  }

  private fitScale(radius: number): number {
    const { width, height } = this.viewport();
    return d3.scaleLinear().domain([180, 760]).range([2.7, 0.72]).clamp(true)(radius) * Math.min(width / 1440, 1.08);
  }

  private worldBounds(): { x: number; y: number; k: number } | null {
    if (!this.graphData || this.graphData.clusters.length === 0) {
      return null;
    }

    let minX = d3.min(this.graphData.clusters, (cluster) => cluster.world_x - cluster.radius) ?? 0;
    let maxX = d3.max(this.graphData.clusters, (cluster) => cluster.world_x + cluster.radius) ?? 0;
    let minY = d3.min(this.graphData.clusters, (cluster) => cluster.world_y - cluster.radius) ?? 0;
    let maxY = d3.max(this.graphData.clusters, (cluster) => cluster.world_y + cluster.radius) ?? 0;

    for (const layer of ATLAS_CONSTELLATION_LAYERS) {
      minX = Math.min(minX, layer.label_x - 220);
      maxX = Math.max(maxX, layer.label_x + 220);
      minY = Math.min(minY, layer.label_y - 120);
      maxY = Math.max(maxY, layer.label_y + 120);

      for (const body of layer.bodies) {
        const spread = body.r + body.glow + 96;
        minX = Math.min(minX, body.x - spread);
        maxX = Math.max(maxX, body.x + spread);
        minY = Math.min(minY, body.y - spread);
        maxY = Math.max(maxY, body.y + spread);
      }
    }

    const sacredRadius =
      (d3.max(this.sacredScene.rings, (ring) => ring.radius + (ring.halo ?? 0)) ?? 0) + 380;
    minX = Math.min(minX, this.sacredScene.origin.x - sacredRadius);
    maxX = Math.max(maxX, this.sacredScene.origin.x + sacredRadius);
    minY = Math.min(minY, this.sacredScene.origin.y - sacredRadius);
    maxY = Math.max(maxY, this.sacredScene.origin.y + sacredRadius);

    const paddingX = 260;
    const paddingY = 300;
    const widthSpan = maxX - minX + paddingX * 2;
    const heightSpan = maxY - minY + paddingY * 2;
    const { width, height } = this.viewport();
    const k = Math.min(width / widthSpan, height / heightSpan, 0.62) * 0.94;

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      k: Math.min(k, 0.64),
    };
  }

  private transformTriple(transform: d3.ZoomTransform): ZoomTriple {
    const { width, height } = this.viewport();
    const scale = transform.k || 1;
    return [((width / 2) - transform.x) / scale, ((height / 2) - transform.y) / scale, width / scale];
  }

  private transformFromTriple([cx, cy, viewWidth]: ZoomTriple): d3.ZoomTransform {
    const { width, height } = this.viewport();
    const scale = width / viewWidth;
    return d3.zoomIdentity
      .translate(width / 2 - cx * scale, height / 2 - cy * scale)
      .scale(scale);
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

  private resolveNode(node: string | SimulationNode): SimulationNode | undefined {
    return typeof node === 'string' ? this.nodeMap.get(node) : node;
  }

  private nodePosition(node: SimulationNode): { x: number; y: number } {
    return {
      x: this.finiteNumber(node.x, this.finiteNumber(node.homeX)),
      y: this.finiteNumber(node.y, this.finiteNumber(node.homeY)),
    };
  }

  private safeLinePath(
    points: Array<{ x: number; y: number }>,
    curve: d3.CurveFactory | d3.CurveFactoryLineOnly,
  ): string {
    if (!points.length || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
      return '';
    }

    return d3.line<{ x: number; y: number }>().curve(curve)(points) ?? '';
  }

  private finiteNumber(value: number | undefined, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }
}

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
  EDGE_WORD_CLOUD,
  FIRE_FRAGMENT_SHADER,
  FIRE_VERTEX_SHADER,
} from './atlas.data';
import {
  AtlasCluster,
  AtlasGraphData,
  AtlasZoomView,
  FocusState,
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
  @ViewChild('fireHost', { static: true }) private readonly fireHostRef!: ElementRef<HTMLElement>;
  @ViewChild('svgRoot', { static: true }) private readonly svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('homePlaneButton', { static: true })
  private readonly homePlaneButtonRef!: ElementRef<HTMLButtonElement>;

  private readonly facade = inject(AtlasLandingFacade);
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly renderer = inject(Renderer2);

  private readonly focus = signal<FocusState>({ kind: 'world' });
  readonly edgeWordCloud = EDGE_WORD_CLOUD;

  private graphData: AtlasGraphData | null = null;
  private clusterMap = new Map<string, AtlasCluster>();
  private nodeMap = new Map<string, SimulationNode>();
  private zoomViews = new Map<string, AtlasZoomView>();
  private linksByNode = new Map<string, Set<string>>();

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
  private flameFrameId: number | null = null;
  private readonly fireTextureLoader = new THREE.TextureLoader();

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
    this.graphData = await this.facade.loadGraphData();
    const lookups = this.facade.createLookups(this.graphData);
    this.clusterMap = lookups.clusterMap;
    this.zoomViews = lookups.zoomViews;
    this.linksByNode = lookups.linksByNode;
    this.initialiseSvg();
    this.initialiseResizeObserver();
    this.initialiseGraph(this.graphData);
    this.initFlames();
  }

  ngOnDestroy(): void {
    this.animationContext?.revert();
    this.planeLaunchTimeline?.kill();
    if (this.autoTourTimer) {
      window.clearTimeout(this.autoTourTimer);
    }
    this.resizeObserver?.disconnect();
    this.simulation?.stop();
    this.destroyFlames();
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
      .on('start', (event) => {
        if (event.sourceEvent) {
          this.pauseAutoTour();
        }
      })
      .on('zoom', (event) => {
        this.currentTransform = event.transform;
        this.scene?.attr('transform', event.transform.toString());
        this.renderGraph();
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
      this.resizeFlames();
      this.applyFocusZoom(false);
      this.renderGraph();
    });
    this.resizeObserver.observe(this.hostRef.nativeElement);
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
      .on('tick', () => this.renderGraph());

    this.setFocus({ kind: 'world' }, false);
    this.simulation.alpha(1).restart();
    this.autoTourSequence = this.facade.buildAutoTourSequence(data);
    this.startAmbientAnimation();
    this.scheduleAutoTour(1800);
  }

  private initFlames(): void {
    this.destroyFlames();
    this.flameInstances = [this.createFlameInstance(this.fireHostRef.nativeElement)];
    this.resizeFlames();

    this.ngZone.runOutsideAngular(() => {
      const animate = () => {
        const elapsed = performance.now() * 0.001;
        this.renderFlames(elapsed);
        this.flameFrameId = window.requestAnimationFrame(animate);
      };

      animate();
    });
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
    mesh.scale.set(8.6, 8.6, 8.6);
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
      const phase = elapsed * 0.16 + instance.seed;

      instance.mesh.position.x = Math.sin(phase * 0.55) * 0.04;
      instance.mesh.position.y = -0.2 + Math.cos(phase * 0.8) * 0.03;
      instance.mesh.rotation.z = Math.sin(phase * 0.35) * 0.01;
      instance.mesh.updateMatrixWorld();

      instance.material.uniforms['time'].value = elapsed;
      instance.material.uniforms['invModelMatrix'].value.copy(instance.mesh.matrixWorld).invert();
      instance.material.uniforms['scale'].value.copy(instance.mesh.scale);

      instance.renderer.render(instance.scene, instance.camera);
    });
  }

  private resizeFlames(): void {
    this.flameInstances.forEach((instance) => {
      const width = Math.max(instance.host.clientWidth, 360);
      const height = Math.max(instance.host.clientHeight, 360);

      instance.renderer.setSize(width, height, false);
      instance.camera.aspect = width / height;
      instance.camera.updateProjectionMatrix();
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

  private scheduleAutoTour(delayMs = 2800): void {
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
    if (!this.autoTourSequence.length) {
      return;
    }

    const focus = this.autoTourSequence[this.autoTourIndex % this.autoTourSequence.length];
    this.autoTourIndex += 1;
    const duration = this.autoTourDuration(focus);

    this.setFocus(focus, true, duration, () => {
      const holdMs = focus.kind === 'world' ? 1600 : focus.kind === 'cluster' ? 1450 : 1280;
      this.scheduleAutoTour(holdMs);
    });
  }

  private pauseAutoTour(delayMs = 9000): void {
    this.autoTourPauseUntil = Date.now() + delayMs;
    if (this.autoTourTimer) {
      window.clearTimeout(this.autoTourTimer);
      this.autoTourTimer = null;
    }
    this.svg?.interrupt();
    this.scheduleAutoTour(delayMs);
  }

  private autoTourDuration(focus: FocusState): number {
    const currentTriple = this.transformTriple(this.currentTransform);
    const targetTriple = this.focusTriple(focus);
    const interpolation = d3.interpolateZoom(currentTriple, targetTriple);
    return Math.max(1800, Math.min(4200, interpolation.duration * 0.72));
  }

  private renderAtmosphere(): void {
    if (!this.atmosphereLayer) {
      return;
    }

    const stars = d3.range(220).map((index) => ({
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

  private startAmbientAnimation(): void {
    this.animationContext?.revert();
    this.animationContext = gsap.context(() => {
      gsap.fromTo(
        '.atlas-canvas__territory',
        { opacity: 0, scale: 0.92, transformOrigin: '50% 50%' },
        {
          opacity: 1,
          scale: 1,
          duration: 1.25,
          stagger: 0.05,
          ease: 'power3.out',
          clearProps: 'transform',
        },
      );

      gsap.fromTo(
        '.atlas-canvas__node',
        { opacity: 0, scale: 0.9, transformOrigin: '50% 50%' },
        {
          opacity: 1,
          scale: 1,
          duration: 1.1,
          stagger: 0.01,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );

      gsap.to('.atlas-canvas__star', {
        opacity: () => gsap.utils.random(0.12, 0.34),
        repeat: -1,
        yoyo: true,
        duration: () => gsap.utils.random(5.6, 10.8),
        stagger: {
          each: 0.05,
          from: 'random',
        },
        repeatRefresh: true,
        ease: 'sine.inOut',
      });

      gsap.to('.atlas-canvas__halo', {
        opacity: () => gsap.utils.random(0.1, 0.16),
        scale: () => gsap.utils.random(0.97, 1.04),
        repeat: -1,
        yoyo: true,
        duration: () => gsap.utils.random(8.2, 13.6),
        repeatRefresh: true,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%',
      });

      gsap.to('.atlas-canvas__territory-core', {
        opacity: () => gsap.utils.random(0.05, 0.08),
        scale: () => gsap.utils.random(0.985, 1.03),
        repeat: -1,
        yoyo: true,
        duration: () => gsap.utils.random(7.4, 11.2),
        stagger: 0.14,
        repeatRefresh: true,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%',
      });

      gsap.to('.atlas-canvas__node-glow', {
        opacity: () => gsap.utils.random(0.07, 0.12),
        scale: () => gsap.utils.random(0.97, 1.06),
        repeat: -1,
        yoyo: true,
        duration: () => gsap.utils.random(5.2, 8.6),
        stagger: {
          each: 0.05,
          from: 'random',
        },
        repeatRefresh: true,
        ease: 'sine.inOut',
        transformOrigin: '50% 50%',
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
          duration: 1.8,
          stagger: {
            each: 0.06,
            from: 'random',
          },
          ease: 'power2.out',
        },
      );

      gsap.to('.atlas__edge-words--top .atlas__edge-word', {
        x: () => gsap.utils.random(-18, 18),
        y: () => gsap.utils.random(-3, 8),
        opacity: () => gsap.utils.random(0.12, 0.3),
        repeat: -1,
        yoyo: true,
        duration: () => gsap.utils.random(10, 16),
        stagger: {
          each: 0.38,
          from: 'random',
        },
        repeatRefresh: true,
        ease: 'sine.inOut',
      });

      gsap.to('.atlas__edge-words--bottom .atlas__edge-word', {
        x: () => gsap.utils.random(-20, 20),
        y: () => gsap.utils.random(-8, 3),
        opacity: () => gsap.utils.random(0.12, 0.28),
        repeat: -1,
        yoyo: true,
        duration: () => gsap.utils.random(11, 17),
        stagger: {
          each: 0.34,
          from: 'random',
        },
        repeatRefresh: true,
        ease: 'sine.inOut',
      });

      gsap.to('.atlas__edge-words--left .atlas__edge-word', {
        x: () => gsap.utils.random(-2, 8),
        y: () => gsap.utils.random(-14, 14),
        opacity: () => gsap.utils.random(0.12, 0.28),
        repeat: -1,
        yoyo: true,
        duration: () => gsap.utils.random(11, 18),
        stagger: {
          each: 0.42,
          from: 'random',
        },
        repeatRefresh: true,
        ease: 'sine.inOut',
      });

      gsap.to('.atlas__edge-words--right .atlas__edge-word', {
        x: () => gsap.utils.random(-8, 2),
        y: () => gsap.utils.random(-16, 16),
        opacity: () => gsap.utils.random(0.12, 0.28),
        repeat: -1,
        yoyo: true,
        duration: () => gsap.utils.random(11, 18),
        stagger: {
          each: 0.42,
          from: 'random',
        },
        repeatRefresh: true,
        ease: 'sine.inOut',
      });
    }, this.hostRef.nativeElement);
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
        this.pauseAutoTour();
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

        group.append('circle').attr('class', 'atlas-canvas__node-glow');
        group.append('circle').attr('class', 'atlas-canvas__node-core');
        return group;
      })
      .attr('data-node-id', (node) => node.id)
      .on('click', (_, node) => {
        this.pauseAutoTour();
        this.ngZone.run(() => this.setFocus(this.facade.focusForNode(node)));
      });

    this.nodeSelection
      .select<SVGCircleElement>('circle.atlas-canvas__node-glow')
      .attr('r', (node) => this.facade.nodeRadius(node) * 2.15)
      .attr('fill', (node) => this.clusterMap.get(node.cluster_id)?.color ?? '#ffffff');

    this.nodeSelection
      .select<SVGCircleElement>('circle.atlas-canvas__node-core')
      .attr('r', (node) => this.facade.nodeRadius(node))
      .attr('fill', (node) => this.facade.nodeFill(node, this.clusterMap))
      .attr('stroke', (node) => this.facade.nodeStroke(node, this.clusterMap));
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
      .text((node) => this.facade.shortLabel(node))
      .on('click', (_, node) => {
        this.pauseAutoTour();
        this.ngZone.run(() => this.setFocus(this.facade.focusForNode(node)));
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
      .attr('stroke', (link) => this.facade.edgeStroke(link, this.clusterMap, (node) => this.resolveNode(node)))
      .attr('stroke-width', (link) => this.facade.edgeWidth(link, scale))
      .attr('stroke-opacity', (link) =>
        this.facade.edgeOpacity(link, focus, scale, this.linksByNode, (node) => this.resolveNode(node)));

    this.nodeSelection
      .attr('transform', (node) => `translate(${node.x ?? node.homeX}, ${node.y ?? node.homeY})`)
      .attr('opacity', (node) => this.facade.nodeOpacity(node, focus, scale, this.linksByNode))
      .attr('class', (node) => `${this.facade.nodeClass(node)}${this.facade.isFocusedNode(node, focus) ? ' is-focused' : ''}`);

    this.labelSelection
      .attr('x', (node) => node.x ?? node.homeX)
      .attr('y', (node) => (node.y ?? node.homeY) - this.facade.nodeRadius(node) - 14)
      .attr('opacity', (node) => this.facade.labelOpacity(node, focus, scale, this.linksByNode))
      .attr('text-anchor', 'middle');

    this.territorySelection
      ?.attr('opacity', (cluster) => this.facade.clusterOpacity(cluster, focus, scale))
      .attr('class', (cluster) => this.facade.territoryClass(cluster, focus));

  }

  private setFocus(
    focus: FocusState,
    animate = true,
    duration = 1400,
    onComplete?: () => void,
  ): void {
    this.focus.set(focus);
    this.applyFocusZoom(animate, duration, onComplete);
    this.renderGraph();
  }

  private applyFocusZoom(
    animate = true,
    duration = 1400,
    onComplete?: () => void,
  ): void {
    if (!this.graphData || !this.zoomBehavior || !this.svg) {
      return;
    }

    const target = this.buildZoomTransform(this.focus());
    if (!animate) {
      this.svg.call(this.zoomBehavior.transform, target);
      onComplete?.();
      return;
    }

    const transition = this.svg.transition().duration(duration).ease(d3.easeCubicInOut);
    transition.call(this.zoomBehavior.transform, target);
    if (onComplete) {
      transition.on('end', () => onComplete());
    }
  }

  private buildZoomTransform(focus: FocusState): d3.ZoomTransform {
    const { width, height } = this.viewport();
    const defaultWorld = this.zoomViews.get('view_world');

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
        return d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-(node.x ?? node.homeX), -(node.y ?? node.homeY));
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

    const padding = 120;
    const minX = d3.min(this.graphData.clusters, (cluster) => cluster.world_x - cluster.radius) ?? 0;
    const maxX = d3.max(this.graphData.clusters, (cluster) => cluster.world_x + cluster.radius) ?? 0;
    const minY = d3.min(this.graphData.clusters, (cluster) => cluster.world_y - cluster.radius) ?? 0;
    const maxY = d3.max(this.graphData.clusters, (cluster) => cluster.world_y + cluster.radius) ?? 0;
    const widthSpan = maxX - minX + padding * 2;
    const heightSpan = maxY - minY + padding * 2;
    const { width, height } = this.viewport();
    const k = Math.min(width / widthSpan, height / heightSpan, 0.74) * 1.08;

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      k: Math.min(k, 0.82),
    };
  }

  private transformTriple(transform: d3.ZoomTransform): ZoomTriple {
    const { width, height } = this.viewport();
    const scale = transform.k || 1;
    return [((width / 2) - transform.x) / scale, ((height / 2) - transform.y) / scale, height / scale];
  }

  private focusTriple(focus: FocusState): ZoomTriple {
    const target = this.buildZoomTransform(focus);
    return this.transformTriple(target);
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
}

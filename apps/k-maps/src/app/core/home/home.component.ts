import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import * as THREE from 'three';

interface ModuleCard {
  id: string;
  label: string;
  route: string;
  icon: string;
  glyph: string;
}

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

const FIRE_VERTEX_SHADER = `
varying vec3 vWorldPos;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
}
`;

const FIRE_FRAGMENT_SHADER = `
precision highp float;

#define ITERATIONS 10
#define OCTIVES 3

uniform vec3 color;
uniform float time;
uniform float seed;
uniform mat4 invModelMatrix;
uniform vec3 scale;
uniform vec4 noiseScale;
uniform float magnitude;
uniform float lacunarity;
uniform float gain;
uniform sampler2D fireTex;
varying vec3 vWorldPos;

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 c = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 d = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, c.yyy));
  vec3 x0 = v - i + dot(i, c.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + c.xxx;
  vec3 x2 = x0 - i2 + c.yyy;
  vec3 x3 = x0 - d.yyy;

  i = mod(i, 289.0);
  vec4 p = permute(
    permute(
      permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0)
    )
    + i.x + vec4(0.0, i1.x, i2.x, 1.0)
  );

  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * d.wyz - d.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float turbulence(vec3 p) {
  float sum = 0.0;
  float freq = 1.0;
  float amp = 1.0;

  for (int i = 0; i < OCTIVES; i++) {
    sum += abs(snoise(p * freq)) * amp;
    freq *= lacunarity;
    amp *= gain;
  }

  return sum;
}

vec4 samplerFire(vec3 p, vec4 scaleValue) {
  vec2 st = vec2(sqrt(dot(p.xz, p.xz)), p.y);

  if (st.x <= 0.0 || st.x >= 1.0 || st.y <= 0.0 || st.y >= 1.0) {
    return vec4(0.0);
  }

  p.y -= (seed + time) * scaleValue.w;
  p *= scaleValue.xyz;
  st.y += sqrt(st.y) * magnitude * turbulence(p);

  if (st.y <= 0.0 || st.y >= 1.0) {
    return vec4(0.0);
  }

  return texture2D(fireTex, st);
}

vec3 localize(vec3 p) {
  return (invModelMatrix * vec4(p, 1.0)).xyz;
}

void main() {
  vec3 rayPos = vWorldPos;
  vec3 rayDir = normalize(rayPos - cameraPosition);
  float rayLen = 0.0288 * length(scale.xyz);
  vec4 col = vec4(0.0);

  for (int i = 0; i < ITERATIONS; i++) {
    rayPos += rayDir * rayLen;
    vec3 lp = localize(rayPos);
    lp.y += 0.5;
    lp.xz *= 2.0;
    col += samplerFire(lp, noiseScale);
  }

  col.a = col.r;
  gl_FragColor = col;
}
`;

@Component({
  selector: 'km-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private static readonly BASE_FLAME_SCALE = 8.6;

  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('logo') logoRef!: ElementRef<HTMLElement>;
  @ViewChild('subtitle') subtitleRef!: ElementRef<HTMLElement>;
  @ViewChild('domainLabel') domainLabelRef!: ElementRef<HTMLElement>;
  @ViewChild('fireHost') fireHostRef!: ElementRef<HTMLElement>;

  private animationContext: gsap.Context | null = null;
  private flameInstances: FlameInstance[] = [];
  private flameResizeObserver?: ResizeObserver;
  private flameFrameId: number | null = null;
  private readonly fireTextureLoader = new THREE.TextureLoader();

  readonly particles = Array.from({ length: 15 }, (_, i) => i);

  readonly modules: ModuleCard[] = [
    { id: 'hub', label: 'Hub', route: '/hub', icon: '◈', glyph: '⬡' },
    { id: 'quran', label: 'Quran', route: '/quran', icon: '◉', glyph: '☽' },
    { id: 'arabic', label: 'Arabic', route: '/arabic', icon: '◆', glyph: 'ع' },
    { id: 'worldview', label: 'Worldview', route: '/worldview', icon: '◎', glyph: '◉' },
    { id: 'planner', label: 'Planner', route: '/planner', icon: '▦', glyph: '⊞' },
    { id: 'srs', label: 'SRS', route: '/srs', icon: '↻', glyph: '↻' },
    { id: 'content', label: 'Content', route: '/content', icon: '▷', glyph: '▶' },
    { id: 'docs', label: 'Docs', route: '/docs', icon: '✦', glyph: '✦' },
  ];

  ngAfterViewInit(): void {
    this.animationContext = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        this.logoRef.nativeElement,
        { opacity: 0, y: -24, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, clearProps: 'filter' },
      )
        .fromTo(
          this.subtitleRef.nativeElement,
          { opacity: 0, letterSpacing: '0.5em' },
          { opacity: 1, letterSpacing: '0.18em', duration: 0.8 },
          '-=0.5',
        )
        .fromTo(
          '.km-module-card',
          { opacity: 0, y: 32, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.09, clearProps: 'transform' },
          '-=0.3',
        )
        .fromTo(
          this.domainLabelRef.nativeElement,
          { opacity: 0 },
          { opacity: 1, duration: 0.6 },
          '-=0.1',
        );
    }, this.pageRef.nativeElement);

    this.initFlames();
  }

  ngOnDestroy(): void {
    this.animationContext?.revert();
    this.destroyFlames();
  }

  navigate(route: string): void {
    gsap.to('.km-module-card', {
      opacity: 0,
      y: -16,
      stagger: 0.04,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => {
        void this.router.navigateByUrl(route);
      },
    });
  }

  private initFlames(): void {
    this.destroyFlames();
    this.flameInstances = [this.createFlameInstance(this.fireHostRef.nativeElement)];

    this.flameResizeObserver = new ResizeObserver(() => this.resizeFlames());
    this.flameInstances.forEach((instance) => this.flameResizeObserver?.observe(instance.host));
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
    renderer.domElement.className = 'home__fire-canvas';
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
      HomeComponent.BASE_FLAME_SCALE,
      HomeComponent.BASE_FLAME_SCALE,
      HomeComponent.BASE_FLAME_SCALE,
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
      const aspect = width / height;
      const horizontalScale = HomeComponent.BASE_FLAME_SCALE * Math.max(1.2, aspect * 1.08);

      instance.renderer.setSize(width, height, false);
      instance.camera.aspect = width / height;
      instance.camera.updateProjectionMatrix();
      instance.mesh.scale.set(
        horizontalScale,
        HomeComponent.BASE_FLAME_SCALE,
        HomeComponent.BASE_FLAME_SCALE,
      );
    });
  }

  private destroyFlames(): void {
    this.flameResizeObserver?.disconnect();
    this.flameResizeObserver = undefined;

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
}

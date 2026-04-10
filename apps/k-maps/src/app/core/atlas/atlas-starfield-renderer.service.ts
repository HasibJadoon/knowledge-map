import { Injectable, NgZone, inject } from '@angular/core';
import * as THREE from 'three';
import { SceneLayer } from './atlas.models';

/**
 * AtlasStarfieldRenderer — realistic multi-layer night sky.
 *
 * Design goals:
 *   • Multiple parallax depth planes (near / mid / far)
 *   • Astronomy-inspired size + brightness distribution
 *   • Subtle cool-to-warm colour temperature variation
 *   • Faint Milky Way banding via an extra dim particle sheet
 *   • Atmospheric vignette handled in CSS, not WebGL
 *   • No fire, no candle, no fantasy effects
 *
 * Usage:
 *   1. Call init(container) once after view is ready.
 *   2. Call resize(w, h) on window resize.
 *   3. Call dispose() on component destroy.
 */
@Injectable({ providedIn: 'root' })
export class AtlasStarfieldRenderer {
  private static readonly FRAME_INTERVAL_MS = 1000 / 36;

  private readonly ngZone = inject(NgZone);

  private host: HTMLElement | null = null;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private layers: StarLayer[] = [];
  private milkyWay!: THREE.Points;
  private animFrameId = 0;
  private lastFrameTimestamp = 0;
  private timer = new THREE.Timer();
  private disposed = false;
  private readonly lookTarget = new THREE.Vector3();
  private activeMotion = { ...STARFIELD_MOTION_PROFILES.sky };
  private targetMotion = { ...STARFIELD_MOTION_PROFILES.sky };
  private currentRig = {
    x: 0,
    y: 0,
    z: STARFIELD_MOTION_PROFILES.sky.baseZ,
    lookX: 0,
    lookY: 0,
    roll: 0,
  };

  // ─── Public API ──────────────────────────────────────────────────────────

  init(host: HTMLElement): void {
    this.dispose();

    this.disposed = false;
    this.host = host;
    this.lastFrameTimestamp = 0;
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.timer.reset();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, (host.clientWidth || window.innerWidth) / (host.clientHeight || window.innerHeight), 0.1, 2000);
    this.camera.position.z = this.currentRig.z;
    this.setSceneLayer('sky');

    this.buildMilkyWay();
    this.buildLayers();

    this.ngZone.runOutsideAngular(() => this.loop());
  }

  resize(w: number, h: number): void {
    if (!this.renderer) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);
    this.animFrameId = 0;
    this.lastFrameTimestamp = 0;
    this.timer.dispose();
    for (const layer of this.layers) {
      layer.points.geometry.dispose();
      (layer.points.material as THREE.Material).dispose();
    }
    this.milkyWay?.geometry.dispose();
    (this.milkyWay?.material as THREE.Material)?.dispose();
    this.renderer?.dispose();
    const canvas = this.renderer?.domElement;
    if (canvas?.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    this.scene?.clear();
    this.layers = [];
    this.host = null;
    this.renderer = undefined as unknown as THREE.WebGLRenderer;
    this.scene = undefined as unknown as THREE.Scene;
    this.camera = undefined as unknown as THREE.PerspectiveCamera;
    this.milkyWay = undefined as unknown as THREE.Points;
    this.timer = new THREE.Timer();
  }

  setSceneLayer(layer: SceneLayer): void {
    this.targetMotion = { ...STARFIELD_MOTION_PROFILES[layer] };
  }

  // ─── Build helpers ───────────────────────────────────────────────────────

  private buildMilkyWay(): void {
    // Faint elongated band of dust — low-opacity, tiny points
    const count = 2200;
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute along a tilted band
      const bandAngle = (Math.random() - 0.5) * Math.PI * 0.18;
      const t = (Math.random() - 0.5) * 2;
      const perp = (Math.random() - 0.5) * 0.3;

      positions[i * 3 + 0] = t * 600 * Math.cos(bandAngle) + perp * 120 * Math.sin(bandAngle);
      positions[i * 3 + 1] = t * 600 * Math.sin(bandAngle) - perp * 120 * Math.cos(bandAngle);
      positions[i * 3 + 2] = -400 + Math.random() * 80;

      // Higher density toward centre
      alphas[i] = Math.pow(1 - Math.abs(t), 1.8) * 0.18 + Math.random() * 0.06;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.8,
      color: new THREE.Color(0.72, 0.80, 0.98),
      transparent: true,
      opacity: 0.16,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.milkyWay = new THREE.Points(geo, mat);
    this.milkyWay.frustumCulled = false;
    this.scene.add(this.milkyWay);
  }

  private buildLayers(): void {
    // Three depth layers: far (dense/dim), mid, near (sparse/bright)
    const specs: LayerSpec[] = [
      {
        count: 1600,
        zRange: [-500, -300],
        sizeRange: [0.8, 1.4],
        materialSize: 0.95,
        brightnessRange: [0.1, 0.24],
        opacity: 0.4,
        rotationSpeed: 0.000012,
        drift: 0.000004,
        colorTemps: ['#9bb3d8', '#b8c8e8', '#c8d5f0'],
      },
      {
        count: 780,
        zRange: [-300, -120],
        sizeRange: [1.1, 1.9],
        materialSize: 1.25,
        brightnessRange: [0.22, 0.46],
        opacity: 0.56,
        rotationSpeed: 0.000018,
        drift: 0.000008,
        colorTemps: ['#c0d0f0', '#dde8ff', '#f0e8d0', '#fff4e0'],
      },
      {
        count: 260,
        zRange: [-120, 0],
        sizeRange: [1.8, 3.2],
        materialSize: 1.9,
        brightnessRange: [0.46, 0.86],
        opacity: 0.76,
        rotationSpeed: 0.000024,
        drift: 0.000012,
        colorTemps: ['#ffffff', '#f8f4e8', '#ffe8c0', '#d8eeff'],
      },
    ];

    for (const spec of specs) {
      const layer = this.buildLayer(spec);
      this.layers.push(layer);
      this.scene.add(layer.points);
    }
  }

  private buildLayer(spec: LayerSpec): StarLayer {
    const positions = new Float32Array(spec.count * 3);
    const colors = new Float32Array(spec.count * 3);
    const sizes = new Float32Array(spec.count);

    for (let i = 0; i < spec.count; i++) {
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 340 + Math.random() * 80;

      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = spec.zRange[0] + Math.random() * (spec.zRange[1] - spec.zRange[0]);

      // Astronomy-like size-brightness correlation with scatter
      const brightness = spec.brightnessRange[0] + Math.random() * (spec.brightnessRange[1] - spec.brightnessRange[0]);
      const colorHex = spec.colorTemps[Math.floor(Math.random() * spec.colorTemps.length)];
      const col = new THREE.Color(colorHex);

      colors[i * 3 + 0] = col.r * brightness;
      colors[i * 3 + 1] = col.g * brightness;
      colors[i * 3 + 2] = col.b * brightness;

      sizes[i] = spec.sizeRange[0] + Math.pow(Math.random(), 2.4) * (spec.sizeRange[1] - spec.sizeRange[0]);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      size: spec.materialSize,
      transparent: true,
      opacity: spec.opacity,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;

    return {
      points,
      rotationSpeed: spec.rotationSpeed,
      drift: spec.drift,
    };
  }

  // ─── Animation loop ──────────────────────────────────────────────────────

  private loop(timestamp?: number): void {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));

    const frameTimestamp = timestamp ?? performance.now();
    if (this.lastFrameTimestamp !== 0 && frameTimestamp - this.lastFrameTimestamp < AtlasStarfieldRenderer.FRAME_INTERVAL_MS) {
      return;
    }
    this.lastFrameTimestamp = frameTimestamp;

    this.timer.update(frameTimestamp);
    const delta = Math.min(this.timer.getDelta(), 0.05);
    const elapsed = this.timer.getElapsed();
    const profileBlend = 1 - Math.exp(-delta * 1.2);
    this.activeMotion = blendStarfieldMotion(this.activeMotion, this.targetMotion, profileBlend);

    const targetX =
      Math.sin(elapsed * this.activeMotion.orbitSpeed) * this.activeMotion.xAmplitude
      + Math.sin(elapsed * (this.activeMotion.orbitSpeed * 0.47) + 1.6) * this.activeMotion.xSecondaryAmplitude;
    const targetY =
      Math.cos(elapsed * this.activeMotion.ySpeed + 0.45) * this.activeMotion.yAmplitude
      + Math.sin(elapsed * (this.activeMotion.ySpeed * 0.54) + 2.1) * this.activeMotion.ySecondaryAmplitude;
    const targetZ =
      this.activeMotion.baseZ
      + Math.sin(elapsed * this.activeMotion.dollySpeed + 0.3) * this.activeMotion.zAmplitude
      + Math.sin(elapsed * (this.activeMotion.dollySpeed * 0.52) + 2.4) * this.activeMotion.zSecondaryAmplitude;
    const targetLookX =
      Math.sin(elapsed * this.activeMotion.lookSpeed + 0.2) * this.activeMotion.lookXAmplitude;
    const targetLookY =
      Math.cos(elapsed * (this.activeMotion.lookSpeed * 0.84) + 0.8) * this.activeMotion.lookYAmplitude;
    const targetRoll =
      Math.sin(elapsed * this.activeMotion.rollSpeed + 1.2) * this.activeMotion.rollAmplitude;
    const rigBlend = 1 - Math.exp(-delta * this.activeMotion.response);

    this.currentRig.x += (targetX - this.currentRig.x) * rigBlend;
    this.currentRig.y += (targetY - this.currentRig.y) * rigBlend;
    this.currentRig.z += (targetZ - this.currentRig.z) * rigBlend;
    this.currentRig.lookX += (targetLookX - this.currentRig.lookX) * rigBlend;
    this.currentRig.lookY += (targetLookY - this.currentRig.lookY) * rigBlend;
    this.currentRig.roll += (targetRoll - this.currentRig.roll) * rigBlend;

    this.camera.position.set(this.currentRig.x, this.currentRig.y, this.currentRig.z);
    this.lookTarget.set(this.currentRig.lookX, this.currentRig.lookY, -320);
    this.camera.lookAt(this.lookTarget);
    this.camera.rotation.z = this.currentRig.roll;

    // Very slow differential rotation per layer for parallax
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      layer.points.rotation.y = elapsed * layer.rotationSpeed * this.activeMotion.parallaxBoost * (i % 2 === 0 ? 1 : -0.6);
      layer.points.rotation.x = elapsed * layer.drift * this.activeMotion.parallaxBoost * (i % 2 === 0 ? 0.35 : 0.82);
    }

    // Milky Way drifts imperceptibly
    if (this.milkyWay) {
      this.milkyWay.rotation.z = elapsed * 0.000008 * this.activeMotion.parallaxBoost;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// ─── Internal types ──────────────────────────────────────────────────────────

interface LayerSpec {
  count: number;
  zRange: [number, number];
  sizeRange: [number, number];
  materialSize: number;
  brightnessRange: [number, number];
  opacity: number;
  rotationSpeed: number;
  drift: number;
  colorTemps: string[];
}

interface StarLayer {
  points: THREE.Points;
  rotationSpeed: number;
  drift: number;
}

interface StarfieldMotionProfile {
  baseZ: number;
  xAmplitude: number;
  xSecondaryAmplitude: number;
  yAmplitude: number;
  ySecondaryAmplitude: number;
  zAmplitude: number;
  zSecondaryAmplitude: number;
  lookXAmplitude: number;
  lookYAmplitude: number;
  orbitSpeed: number;
  ySpeed: number;
  dollySpeed: number;
  lookSpeed: number;
  rollSpeed: number;
  rollAmplitude: number;
  response: number;
  parallaxBoost: number;
}

const STARFIELD_MOTION_PROFILES: Record<SceneLayer, StarfieldMotionProfile> = {
  sky: {
    baseZ: 408,
    xAmplitude: 10,
    xSecondaryAmplitude: 3.5,
    yAmplitude: 5.5,
    ySecondaryAmplitude: 2,
    zAmplitude: 10,
    zSecondaryAmplitude: 3.5,
    lookXAmplitude: 7,
    lookYAmplitude: 4,
    orbitSpeed: 0.06,
    ySpeed: 0.05,
    dollySpeed: 0.075,
    lookSpeed: 0.07,
    rollSpeed: 0.04,
    rollAmplitude: 0,
    response: 0.9,
    parallaxBoost: 0.92,
  },
  constellation: {
    baseZ: 388,
    xAmplitude: 7,
    xSecondaryAmplitude: 2.6,
    yAmplitude: 4,
    ySecondaryAmplitude: 1.6,
    zAmplitude: 7,
    zSecondaryAmplitude: 2.5,
    lookXAmplitude: 5,
    lookYAmplitude: 3,
    orbitSpeed: 0.07,
    ySpeed: 0.06,
    dollySpeed: 0.085,
    lookSpeed: 0.08,
    rollSpeed: 0.04,
    rollAmplitude: 0,
    response: 1.05,
    parallaxBoost: 0.82,
  },
  node: {
    baseZ: 366,
    xAmplitude: 4,
    xSecondaryAmplitude: 1.6,
    yAmplitude: 2.4,
    ySecondaryAmplitude: 1,
    zAmplitude: 4.6,
    zSecondaryAmplitude: 1.8,
    lookXAmplitude: 3,
    lookYAmplitude: 2,
    orbitSpeed: 0.08,
    ySpeed: 0.07,
    dollySpeed: 0.1,
    lookSpeed: 0.09,
    rollSpeed: 0.04,
    rollAmplitude: 0,
    response: 1.2,
    parallaxBoost: 0.72,
  },
  history: {
    baseZ: 356,
    xAmplitude: 3,
    xSecondaryAmplitude: 1.2,
    yAmplitude: 1.8,
    ySecondaryAmplitude: 0.8,
    zAmplitude: 3.8,
    zSecondaryAmplitude: 1.2,
    lookXAmplitude: 2.2,
    lookYAmplitude: 1.6,
    orbitSpeed: 0.085,
    ySpeed: 0.075,
    dollySpeed: 0.11,
    lookSpeed: 0.095,
    rollSpeed: 0.04,
    rollAmplitude: 0,
    response: 1.3,
    parallaxBoost: 0.64,
  },
};

function blendStarfieldMotion(
  current: StarfieldMotionProfile,
  target: StarfieldMotionProfile,
  alpha: number,
): StarfieldMotionProfile {
  const blend = (from: number, to: number) => from + (to - from) * alpha;
  return {
    baseZ: blend(current.baseZ, target.baseZ),
    xAmplitude: blend(current.xAmplitude, target.xAmplitude),
    xSecondaryAmplitude: blend(current.xSecondaryAmplitude, target.xSecondaryAmplitude),
    yAmplitude: blend(current.yAmplitude, target.yAmplitude),
    ySecondaryAmplitude: blend(current.ySecondaryAmplitude, target.ySecondaryAmplitude),
    zAmplitude: blend(current.zAmplitude, target.zAmplitude),
    zSecondaryAmplitude: blend(current.zSecondaryAmplitude, target.zSecondaryAmplitude),
    lookXAmplitude: blend(current.lookXAmplitude, target.lookXAmplitude),
    lookYAmplitude: blend(current.lookYAmplitude, target.lookYAmplitude),
    orbitSpeed: blend(current.orbitSpeed, target.orbitSpeed),
    ySpeed: blend(current.ySpeed, target.ySpeed),
    dollySpeed: blend(current.dollySpeed, target.dollySpeed),
    lookSpeed: blend(current.lookSpeed, target.lookSpeed),
    rollSpeed: blend(current.rollSpeed, target.rollSpeed),
    rollAmplitude: blend(current.rollAmplitude, target.rollAmplitude),
    response: blend(current.response, target.response),
    parallaxBoost: blend(current.parallaxBoost, target.parallaxBoost),
  };
}

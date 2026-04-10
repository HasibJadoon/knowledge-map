import { Injectable, NgZone, inject } from '@angular/core';
import * as THREE from 'three';

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
  private readonly ngZone = inject(NgZone);

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private layers: StarLayer[] = [];
  private milkyWay!: THREE.Points;
  private animFrameId = 0;
  private clock = new THREE.Clock();
  private disposed = false;

  // ─── Public API ──────────────────────────────────────────────────────────

  init(host: HTMLElement): void {
    this.disposed = false;

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, (host.clientWidth || window.innerWidth) / (host.clientHeight || window.innerHeight), 0.1, 2000);
    this.camera.position.z = 400;

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
    for (const layer of this.layers) {
      layer.points.geometry.dispose();
      (layer.points.material as THREE.PointsMaterial).dispose();
    }
    this.milkyWay?.geometry.dispose();
    (this.milkyWay?.material as THREE.PointsMaterial)?.dispose();
    this.renderer?.dispose();
    this.layers = [];
  }

  // ─── Build helpers ───────────────────────────────────────────────────────

  private buildMilkyWay(): void {
    // Faint elongated band of dust — low-opacity, tiny points
    const count = 3000;
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
      size: 0.7,
      color: new THREE.Color(0.72, 0.80, 0.98),
      transparent: true,
      opacity: 0.22,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.milkyWay = new THREE.Points(geo, mat);
    this.scene.add(this.milkyWay);
  }

  private buildLayers(): void {
    // Three depth layers: far (dense/dim), mid, near (sparse/bright)
    const specs: LayerSpec[] = [
      {
        count: 2200,
        zRange: [-500, -300],
        sizeRange: [0.5, 1.2],
        brightnessRange: [0.10, 0.38],
        rotationSpeed: 0.000018,
        drift: 0.000006,
        colorTemps: ['#9bb3d8', '#b8c8e8', '#c8d5f0'],
      },
      {
        count: 1100,
        zRange: [-300, -120],
        sizeRange: [0.8, 1.8],
        brightnessRange: [0.28, 0.68],
        rotationSpeed: 0.000028,
        drift: 0.000014,
        colorTemps: ['#c0d0f0', '#dde8ff', '#f0e8d0', '#fff4e0'],
      },
      {
        count: 380,
        zRange: [-120, 0],
        sizeRange: [1.2, 2.6],
        brightnessRange: [0.55, 1.0],
        rotationSpeed: 0.000038,
        drift: 0.000022,
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
      size: 1.4,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true,
      depthWrite: false,
    });

    return {
      points: new THREE.Points(geo, mat),
      rotationSpeed: spec.rotationSpeed,
      drift: spec.drift,
    };
  }

  // ─── Animation loop ──────────────────────────────────────────────────────

  private loop(): void {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(() => this.loop());

    const elapsed = this.clock.getElapsedTime();

    // Very slow differential rotation per layer for parallax
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      layer.points.rotation.y = elapsed * layer.rotationSpeed * (i % 2 === 0 ? 1 : -0.6);
      layer.points.rotation.x = elapsed * layer.drift * (i % 2 === 0 ? 0.4 : 1);
    }

    // Milky Way drifts imperceptibly
    if (this.milkyWay) {
      this.milkyWay.rotation.z = elapsed * 0.000008;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// ─── Internal types ──────────────────────────────────────────────────────────

interface LayerSpec {
  count: number;
  zRange: [number, number];
  sizeRange: [number, number];
  brightnessRange: [number, number];
  rotationSpeed: number;
  drift: number;
  colorTemps: string[];
}

interface StarLayer {
  points: THREE.Points;
  rotationSpeed: number;
  drift: number;
}

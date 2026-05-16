import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BackendApiService } from '../../services/backend-api.service';

type TreeStatus = 'loading' | 'ready' | 'empty' | 'error';

const MIN_SCALE = 0.15;
const MAX_SCALE = 8;
const FALLBACK_W = 800;
const FALLBACK_H = 480;

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/**
 * Normalises a raw QUL/GraphViz dependency-graph SVG so it can be embedded
 * inline and scaled freely:
 *   - strips the XML prolog / DOCTYPE (invalid inside innerHTML),
 *   - guarantees a `viewBox`,
 *   - forces the root `<svg>` to fill its container (`width/height = 100%`).
 * Returns the natural pixel dimensions so the viewport can fit-to-screen.
 */
function normalizeSvg(raw: string): { html: string; w: number; h: number } | null {
  if (!raw) return null;
  let s = raw.replace(/^﻿/, '').trim();
  s = s.replace(/<\?xml[\s\S]*?\?>/i, '').replace(/<!DOCTYPE[^>]*>/i, '').trim();
  if (!/^<svg\b/i.test(s)) {
    const at = s.search(/<svg\b/i);
    if (at < 0) return null;
    s = s.slice(at);
  }
  const open = s.match(/<svg\b[^>]*>/i);
  if (!open) return null;
  const tag = open[0];

  let w = 0;
  let h = 0;
  const vb = tag.match(
    /viewBox\s*=\s*["']\s*[\d.eE+-]+[\s,]+[\d.eE+-]+[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)/i,
  );
  if (vb) {
    w = parseFloat(vb[1]);
    h = parseFloat(vb[2]);
  }
  if (!w || !h) {
    const wm = tag.match(/\bwidth\s*=\s*["']\s*([\d.]+)/i);
    const hm = tag.match(/\bheight\s*=\s*["']\s*([\d.]+)/i);
    if (wm) w = parseFloat(wm[1]);
    if (hm) h = parseFloat(hm[1]);
  }
  if (!w || !h || !isFinite(w) || !isFinite(h)) {
    w = FALLBACK_W;
    h = FALLBACK_H;
  }

  let newTag = tag;
  if (!/viewBox/i.test(newTag)) {
    newTag = newTag.replace(/<svg\b/i, `<svg viewBox="0 0 ${w} ${h}"`);
  }
  newTag = newTag
    .replace(/\bwidth\s*=\s*["'][^"']*["']/i, '')
    .replace(/\bheight\s*=\s*["'][^"']*["']/i, '')
    .replace(/\bpreserveAspectRatio\s*=\s*["'][^"']*["']/i, '')
    .replace(
      /<svg\b/i,
      '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet"',
    );

  return { html: s.replace(tag, () => newTag), w, h };
}

/**
 * Miro-style infinite-canvas viewer for a single ayah's iʿrāb dependency
 * tree. The tree itself is a pre-rendered SVG served from R2 by the quran
 * worker (`/qr/irab/dep-graph/:surah/:ayah`); this component fetches it as
 * text, embeds it inline and layers drag-to-pan + pinch/wheel zoom on top,
 * with a fit-to-screen control and a fullscreen mode.
 *
 * Replaces the bare `<img>` that 404'd whenever the API base differed from
 * the app origin, or whenever an ayah had no graph — both now resolve to a
 * graceful in-canvas state instead of a broken-image glyph.
 */
@Component({
  selector: 'app-iraab-tree-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './iraab-tree-viewer.component.html',
  styleUrl: './iraab-tree-viewer.component.scss',
  host: {
    '[class.tv-host--fullscreen]': 'fullscreen()',
  },
})
export class IraabTreeViewerComponent {
  readonly surah = input.required<number>();
  readonly ayah = input.required<number>();
  readonly caption = input<string | null>(null);
  readonly compact = input<boolean>(false);

  private readonly http = inject(HttpClient);
  private readonly backend = inject(BackendApiService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  private readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewport');

  readonly status = signal<TreeStatus>('loading');
  readonly svgHtml = signal<SafeHtml | null>(null);
  readonly fullscreen = signal(false);

  readonly scale = signal(1);
  readonly tx = signal(0);
  readonly ty = signal(0);
  readonly natW = signal(FALLBACK_W);
  readonly natH = signal(FALLBACK_H);

  readonly stageTransform = computed(
    () => `translate(${this.tx()}px, ${this.ty()}px) scale(${this.scale()})`,
  );
  readonly zoomPct = computed(() => Math.round(this.scale() * 100));

  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private pinchMid = { x: 0, y: 0 };
  private panning = false;
  private reqToken = 0;

  constructor() {
    // (Re)fetch whenever the addressed ayah changes.
    effect(() => {
      const surah = this.surah();
      const ayah = this.ayah();
      this.fetchGraph(surah, ayah);
    });

    // Viewport size changes on fullscreen toggle — re-fit once it has settled.
    effect(() => {
      this.fullscreen();
      if (this.status() === 'ready') {
        requestAnimationFrame(() => this.fitToScreen());
      }
    });
  }

  reload(): void {
    this.fetchGraph(this.surah(), this.ayah());
  }

  private fetchGraph(surah: number, ayah: number): void {
    const token = ++this.reqToken;
    this.status.set('loading');
    this.svgHtml.set(null);

    const url = this.backend.url('qr', 'irab', 'dep-graph', surah, ayah);
    this.http
      .get(url, { responseType: 'text' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (raw) => {
          if (token !== this.reqToken) return;
          this.ingest(raw);
        },
        error: (err: { status?: number }) => {
          if (token !== this.reqToken) return;
          this.status.set(err?.status === 404 ? 'empty' : 'error');
        },
      });
  }

  private ingest(raw: string): void {
    const norm = normalizeSvg(raw);
    if (!norm) {
      this.status.set('empty');
      return;
    }
    this.natW.set(norm.w);
    this.natH.set(norm.h);
    this.svgHtml.set(this.sanitizer.bypassSecurityTrustHtml(norm.html));
    this.status.set('ready');
    requestAnimationFrame(() => this.fitToScreen());
  }

  // ── Zoom / pan ──────────────────────────────────────────────────────────────

  private fitToScreen(): void {
    const vp = this.viewportRef()?.nativeElement;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    if (!vw || !vh) return;
    const fit = Math.min(vw / this.natW(), vh / this.natH());
    const s = clamp(fit * 0.92, MIN_SCALE, MAX_SCALE);
    this.scale.set(s);
    this.tx.set((vw - this.natW() * s) / 2);
    this.ty.set((vh - this.natH() * s) / 2);
  }

  resetView(): void {
    this.fitToScreen();
  }

  toggleFullscreen(): void {
    this.fullscreen.update((v) => !v);
  }

  private zoomAround(factor: number, vx: number, vy: number): void {
    const s0 = this.scale();
    const s1 = clamp(s0 * factor, MIN_SCALE, MAX_SCALE);
    if (s1 === s0) return;
    const k = s1 / s0;
    this.tx.set(vx - (vx - this.tx()) * k);
    this.ty.set(vy - (vy - this.ty()) * k);
    this.scale.set(s1);
  }

  private zoomFromButton(factor: number): void {
    const vp = this.viewportRef()?.nativeElement;
    if (!vp) return;
    this.zoomAround(factor, vp.clientWidth / 2, vp.clientHeight / 2);
  }

  zoomIn(): void {
    this.zoomFromButton(1.3);
  }

  zoomOut(): void {
    this.zoomFromButton(1 / 1.3);
  }

  private toViewport(clientX: number, clientY: number): { x: number; y: number } {
    const vp = this.viewportRef()?.nativeElement;
    if (!vp) return { x: clientX, y: clientY };
    const r = vp.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const p = this.toViewport(event.clientX, event.clientY);
    this.zoomAround(event.deltaY < 0 ? 1.12 : 1 / 1.12, p.x, p.y);
  }

  onPointerDown(event: PointerEvent): void {
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 1) {
      this.panning = true;
    } else if (this.pointers.size === 2) {
      this.panning = false;
      this.beginPinch();
    }
  }

  onPointerMove(event: PointerEvent): void {
    const prev = this.pointers.get(event.pointerId);
    if (!prev) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1 && this.panning) {
      this.tx.update((v) => v + (event.clientX - prev.x));
      this.ty.update((v) => v + (event.clientY - prev.y));
    } else if (this.pointers.size === 2) {
      this.updatePinch();
    }
  }

  onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (this.pointers.size === 0) this.panning = false;
  }

  private activePointers(): Array<{ x: number; y: number }> {
    return [...this.pointers.values()];
  }

  private beginPinch(): void {
    const [a, b] = this.activePointers();
    if (!a || !b) return;
    this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    this.pinchMid = this.toViewport((a.x + b.x) / 2, (a.y + b.y) / 2);
  }

  private updatePinch(): void {
    const [a, b] = this.activePointers();
    if (!a || !b) return;
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = this.toViewport((a.x + b.x) / 2, (a.y + b.y) / 2);
    if (this.pinchDist > 0) {
      this.zoomAround(dist / this.pinchDist, this.pinchMid.x, this.pinchMid.y);
      this.tx.update((v) => v + (mid.x - this.pinchMid.x));
      this.ty.update((v) => v + (mid.y - this.pinchMid.y));
    }
    this.pinchDist = dist;
    this.pinchMid = mid;
  }
}

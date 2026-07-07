import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  HostListener, Input, OnInit, Output, ViewChild, computed, inject, signal,
} from '@angular/core';
import gsap from 'gsap';
import {
  QuranSurahService, MorphWordView, MorphBlockVm, Tri, Lang,
} from '../../../../../../../shared/services/quran/quran-surah.service';

/**
 * Morphology Word View — the full-screen, GSAP-animated word study surface.
 * Pure renderer: it binds the trilingual, tier-merged blocks the display layer
 * ships (qr_morph_display_*). Arabic terms stay Arabic; the understanding layer
 * switches EN · ع · UR. Zero content logic here — only presentation.
 */
@Component({
  selector: 'km-morph-word-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './morph-word-modal.component.html',
  styleUrl: './morph-word-modal.component.scss',
})
export class MorphWordModalComponent implements OnInit, AfterViewInit {
  private readonly svc = inject(QuranSurahService);

  @Input({ required: true }) surah!: number;
  @Input({ required: true }) ayah!: number;
  @Input({ required: true }) wordIndex!: number;
  @Input() surfacePreview = '';
  @Output() closed = new EventEmitter<void>();

  @ViewChild('scrim') scrim!: ElementRef<HTMLElement>;
  @ViewChild('sheet') sheet!: ElementRef<HTMLElement>;
  @ViewChild('board') boardEl?: ElementRef<HTMLElement>;

  readonly view = signal<MorphWordView | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly lang = signal<Lang>('en');
  /** Reader font scale (both Arabic & English), persisted per session. */
  readonly fontScale = signal(this.readScale());

  readonly word = computed(() => this.view()?.word ?? null);
  readonly blocks = computed<MorphBlockVm[]>(() => this.view()?.blocks ?? []);
  readonly sources = computed(() => this.view()?.sources ?? {});

  /** Section nav — one entry per rendered block, its Arabic term as the label. */
  readonly nav = computed(() =>
    this.blocks().map((b, i) => ({ i, label: b.title.ar || b.type, type: b.type })));

  readonly langs: { key: Lang; label: string }[] = [
    { key: 'en', label: 'EN' }, { key: 'ar', label: 'ع' }, { key: 'ur', label: 'UR' },
  ];

  ngOnInit(): void {
    this.svc.getMorphWord(this.surah, this.ayah, this.wordIndex).subscribe({
      next: v => { this.view.set(v); this.loading.set(false); queueMicrotask(() => this.revealBlocks()); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  ngAfterViewInit(): void {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { return; }
    gsap.fromTo(this.scrim.nativeElement, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    gsap.fromTo(this.sheet.nativeElement,
      { opacity: 0, y: 40, scale: 0.985 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' });
  }

  private revealBlocks(): void {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const els = this.sheet?.nativeElement.querySelectorAll('.mblock');
    if (els?.length) {
      gsap.fromTo(els, { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' });
    }
    const hero = this.sheet?.nativeElement.querySelector('.mhero__word');
    if (hero) gsap.fromTo(hero, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.6)' });
  }

  setLang(l: Lang): void { this.lang.set(l); }

  private readScale(): number {
    const v = Number(localStorage?.getItem('km.morph.fontScale'));
    return v >= 0.8 && v <= 1.8 ? v : 1;
  }
  stepFont(dir: 1 | -1): void {
    const next = Math.min(1.8, Math.max(0.8, +(this.fontScale() + dir * 0.1).toFixed(2)));
    this.fontScale.set(next);
    try { localStorage?.setItem('km.morph.fontScale', String(next)); } catch { /* ignore */ }
  }

  @HostListener('document:keydown.escape')
  close(): void {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !this.sheet) { this.closed.emit(); return; }
    gsap.to(this.sheet.nativeElement, { opacity: 0, y: 30, scale: 0.985, duration: 0.28, ease: 'power2.in' });
    gsap.to(this.scrim.nativeElement, { opacity: 0, duration: 0.3, delay: 0.04, onComplete: () => this.closed.emit() });
  }

  onScrim(ev: MouseEvent): void { if (ev.target === this.scrim?.nativeElement) this.close(); }

  scrollTo(i: number): void {
    const el = this.sheet?.nativeElement.querySelectorAll('.mblock')[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── trilingual + data helpers (presentation only) ──────────────────────────

  /** Pick the active-language string from a {ar,en,ur} object, EN→AR fallback. */
  t(tri: Tri | null | undefined): string {
    if (!tri) return '';
    const l = this.lang();
    return (tri[l] ?? tri.en ?? tri.ar ?? '') as string;
  }
  /** Same, for an inline {en,ar,ur} record inside data_json. */
  tr(o: any): string {
    if (!o) return '';
    const l = this.lang();
    return o[l] ?? o.en ?? o.ar ?? '';
  }
  isRtlText(): boolean { return this.lang() !== 'en'; }

  /** Render a hook/emphasis string: *word* → highlighted. */
  emph(s: string | null | undefined): string {
    if (!s) return '';
    return s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  /** Strip diacritics + normalize alef/wasla so surfaces match across scripts. */
  private norm(s: string): string {
    return s
      .replace(/[ً-ْٰـ۝]/g, '')  // harakāt, superscript alef, tatweel, end-marker
      .replace(/[آأإٱ]/g, 'ا');  // آ أ إ ٱ → ا
  }
  /** Split an ayah so the focus surface can be highlighted. */
  ayahParts(text: string | null | undefined, surface: string | null | undefined): { t: string; hit: boolean }[] {
    if (!text) return [];
    if (!surface) return [{ t: text, hit: false }];
    const bare = this.norm(surface);
    return text.split(/(\s+)/).map(tok => {
      const tb = this.norm(tok);
      return { t: tok, hit: tb.length > 1 && (tb === bare || tb.includes(bare) || bare.includes(tb)) };
    });
  }

  arNum(n: number | null | undefined): string {
    return (n ?? '').toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  /** Radial layout for the constellation word-web (viewBox 0 0 440 300). */
  constel(data: any): { cx: number; cy: number; nodes: Array<{ x: number; y: number; label: string; kind: string; en: string }> } {
    const cx = 220, cy = 150, nodes = (data?.nodes ?? []) as any[];
    const R = 118;
    return {
      cx, cy,
      nodes: nodes.map((n, i) => {
        const ang = (i / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
        const r = n.kind === 'anchor' ? R * 0.62 : R;
        return { x: cx + r * Math.cos(ang), y: cy + r * 0.72 * Math.sin(ang), label: n.label, kind: n.kind, en: n.en };
      }),
    };
  }
  nodeColor(kind: string): string {
    return kind === 'aspect' ? '#8878e2' : kind === 'anchor' ? '#eacd75' : '#6db3e6';
  }

  /** Active-recall reveal state for exercise cards (by index). */
  private readonly revealed = new Set<number>();
  isRevealed(i: number): boolean { return this.revealed.has(i); }
  toggleReveal(i: number): void { this.revealed.has(i) ? this.revealed.delete(i) : this.revealed.add(i); }

  // ── Draggable board (worldview-style pannable canvas) ──────────────────────

  readonly boardView = signal<'list' | 'board'>('list');
  readonly pos = signal<Record<number, { x: number; y: number }>>({});
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly zoom = signal(1);
  private canDrag = false;
  private dragOrder: number | null = null;
  private dOX = 0; private dOY = 0;
  private panning = false;
  private pStartX = 0; private pStartY = 0; private pBaseX = 0; private pBaseY = 0;

  private storeKey(): string { return `km.morph.board.${this.surah}:${this.ayah}:${this.wordIndex}`; }

  toggleBoard(): void {
    if (this.boardView() === 'board') { this.boardView.set('list'); return; }
    if ((window.innerWidth || 0) < 900) return;   // responsive: board only on wide screens
    this.boardView.set('board');
    queueMicrotask(() => this.layoutBoard());
  }

  /** Masonry auto-layout: pack blocks into columns by measured height. */
  private layoutBoard(): void {
    const board = this.boardEl?.nativeElement;
    if (!board) return;
    const saved = this.loadBoard();
    if (saved) { this.pos.set(saved.pos); this.panX.set(saved.panX); this.panY.set(saved.panY); this.zoom.set(saved.zoom); return; }
    requestAnimationFrame(() => {
      const els = Array.from(board.querySelectorAll('.mblock')) as HTMLElement[];
      const colW = 380, gap = 22, pad = 24;
      const cols = Math.max(1, Math.floor((board.clientWidth - pad) / (colW + gap)));
      const colH = new Array(cols).fill(pad);
      const p: Record<number, { x: number; y: number }> = {};
      const order = this.blocks().map(b => b.order);
      els.forEach((el, i) => {
        const c = colH.indexOf(Math.min(...colH));
        p[order[i] ?? i] = { x: pad + c * (colW + gap), y: colH[c] };
        colH[c] += el.offsetHeight + gap;
      });
      this.pos.set(p);
    });
  }

  onPanelDown(e: PointerEvent, order: number): void {
    if (this.boardView() !== 'board') return;
    e.stopPropagation();
    this.canDrag = true; this.dragOrder = order;
    const p = this.pos()[order] ?? { x: 0, y: 0 };
    const z = this.zoom();
    this.dOX = e.clientX / z - p.x; this.dOY = e.clientY / z - p.y;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  onBoardDown(e: PointerEvent): void {
    if (this.boardView() !== 'board' || this.dragOrder !== null) return;
    this.panning = true;
    this.pStartX = e.clientX; this.pStartY = e.clientY;
    this.pBaseX = this.panX(); this.pBaseY = this.panY();
  }
  onBoardMove(e: PointerEvent): void {
    if (this.dragOrder !== null && this.canDrag) {
      const z = this.zoom();
      this.pos.update(m => ({ ...m, [this.dragOrder as number]: { x: e.clientX / z - this.dOX, y: e.clientY / z - this.dOY } }));
    } else if (this.panning) {
      this.panX.set(this.pBaseX + (e.clientX - this.pStartX));
      this.panY.set(this.pBaseY + (e.clientY - this.pStartY));
    }
  }
  onBoardUp(): void {
    if (this.dragOrder !== null || this.panning) this.saveBoard();
    this.dragOrder = null; this.canDrag = false; this.panning = false;
  }
  onBoardWheel(e: WheelEvent): void {
    if (this.boardView() !== 'board') return;
    e.preventDefault();
    const z = Math.min(1.6, Math.max(0.5, +(this.zoom() - Math.sign(e.deltaY) * 0.08).toFixed(2)));
    this.zoom.set(z);
  }
  resetBoard(): void {
    try { localStorage?.removeItem(this.storeKey()); } catch { /* ignore */ }
    this.panX.set(0); this.panY.set(0); this.zoom.set(1);
    this.layoutBoard();
  }

  private saveBoard(): void {
    try { localStorage?.setItem(this.storeKey(), JSON.stringify({ pos: this.pos(), panX: this.panX(), panY: this.panY(), zoom: this.zoom() })); } catch { /* ignore */ }
  }
  private loadBoard(): { pos: Record<number, { x: number; y: number }>; panX: number; panY: number; zoom: number } | null {
    try { const v = localStorage?.getItem(this.storeKey()); return v ? JSON.parse(v) : null; } catch { return null; }
  }
}

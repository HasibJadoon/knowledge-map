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

  readonly view = signal<MorphWordView | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly lang = signal<Lang>('en');

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
}

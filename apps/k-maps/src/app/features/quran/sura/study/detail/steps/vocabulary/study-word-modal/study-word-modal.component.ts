import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  HostListener, Input, OnInit, Output, ViewChild, computed, inject, signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import gsap from 'gsap';
import {
  QuranSurahService, WordCardVm, WordDetailResponse, RootAnalysisVm,
} from '../../../../../../../../shared/services/quran/quran-surah.service';

type LensKey = 'five' | 'maqayis' | 'mufradat' | 'lane' | 'sinai';
interface ConstNode { x: number; y: number; label: string; kind: 'sense' | 'syn' | 'ant'; }

/**
 * Word Backbone 360 — the deep, retention-optimised word modal.
 * Opens on word-click in the morphology step. Renders every layer the API
 * builds from the tables (sarf · iʿrāb · 5 lenses · constellation · hook ·
 * senses · examples · tafsīr) and drives active-recall + SM-2 grading.
 */
@Component({
  selector: 'km-study-word-modal',
  standalone: true,
  imports: [TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-word-modal.component.html',
  styleUrl: './study-word-modal.component.scss',
})
export class StudyWordModalComponent implements OnInit, AfterViewInit {
  private readonly svc = inject(QuranSurahService);

  @Input({ required: true }) word!: WordCardVm;
  @Input() surahId = 0;
  @Output() closed = new EventEmitter<void>();
  @Output() graded = new EventEmitter<{ wordId: string; grade: 'again' | 'hard' | 'good' | 'easy' }>();

  @ViewChild('overlay') overlay!: ElementRef<HTMLElement>;
  @ViewChild('card') card!: ElementRef<HTMLElement>;

  readonly detail = signal<WordDetailResponse | null>(null);
  readonly loading = signal(true);
  readonly revealed = signal(false);            // active recall: meaning hidden first
  readonly activeLens = signal<LensKey>('five');

  readonly analysis = computed<RootAnalysisVm | null>(() => this.detail()?.root_analysis ?? null);

  /** available lens tabs, curated synthesis first */
  readonly lensTabs = computed(() => {
    const a = this.analysis();
    const tabs: { key: LensKey; ar: string; en: string; modern?: boolean }[] = [];
    if (a?.five_lens) tabs.push({ key: 'five', ar: 'العدسات الخمس', en: 'Synthesis' });
    if (a?.lenses?.maqayis) tabs.push({ key: 'maqayis', ar: 'مقاييس', en: 'Ibn Fāris' });
    if (a?.lenses?.mufradat) tabs.push({ key: 'mufradat', ar: 'مفردات', en: 'al-Rāghib' });
    if (a?.lenses?.lane) tabs.push({ key: 'lane', ar: 'لَين', en: 'Lane' });
    if (a?.lenses?.sinai) tabs.push({ key: 'sinai', ar: 'سيناي', en: 'Sinai', modern: true });
    return tabs;
  });

  /** radial constellation nodes derived from senses + near-synonyms + antonyms */
  readonly constellation = computed<ConstNode[]>(() => {
    const a = this.analysis();
    if (!a) return [];
    const senses = a.senses.slice(0, 5);
    const syns = a.near_synonyms
      .map(s => (typeof s === 'string' ? s : (s as { word?: string; ar?: string })?.word ?? (s as { ar?: string })?.ar))
      .filter((s): s is string => !!s).slice(0, 4);
    const ants = a.antonyms.map(x => x.ar).slice(0, 3);
    const nodes: ConstNode[] = [];
    const place = (items: string[], radius: number, kind: ConstNode['kind'], startDeg: number, spanDeg: number) => {
      items.forEach((label, i) => {
        const t = items.length > 1 ? i / (items.length - 1) : 0.5;
        const ang = (startDeg + t * spanDeg) * Math.PI / 180;
        nodes.push({ x: 210 + radius * Math.cos(ang), y: 170 + radius * Math.sin(ang), label, kind });
      });
    };
    place(senses, 92, 'sense', -150, 300);
    place(syns, 150, 'syn', -120, 240);
    place(ants, 120, 'ant', 60, 120);
    return nodes;
  });

  ngOnInit(): void {
    this.svc.getWordDetail(this.word.word_id).subscribe({
      next: d => {
        this.detail.set(d);
        // default to first available lens
        const first = this.lensTabs()[0]?.key;
        if (first) this.activeLens.set(first);
        this.loading.set(false);
        queueMicrotask(() => this.animateSections());
      },
      error: () => this.loading.set(false),
    });
  }

  ngAfterViewInit(): void {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { gsap.set([this.overlay?.nativeElement, this.card?.nativeElement], { opacity: 1 }); return; }
    gsap.fromTo(this.overlay.nativeElement, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' });
    gsap.fromTo(this.card.nativeElement,
      { opacity: 0, y: 26, scale: 0.965 },
      { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out' });
  }

  private animateSections(): void {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const els = this.card?.nativeElement.querySelectorAll('.reveal-sec');
    if (els?.length) {
      gsap.fromTo(els, { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.045, ease: 'power2.out', clearProps: 'transform' });
    }
  }

  reveal(): void {
    this.revealed.set(true);
    queueMicrotask(() => {
      const els = this.card?.nativeElement.querySelectorAll('.on-reveal');
      if (els?.length && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(els, { opacity: 0, filter: 'blur(6px)' },
          { opacity: 1, filter: 'blur(0px)', duration: 0.5, stagger: 0.05, ease: 'power2.out' });
      }
    });
  }

  setLens(k: LensKey): void { this.activeLens.set(k); }

  lensText(k: LensKey): string | null {
    const a = this.analysis();
    if (!a) return null;
    if (k === 'five') {
      const f = a.five_lens;
      if (!f) return null;
      return [f.sarf && `صرف — ${f.sarf}`, f.irab && `إعراب — ${f.irab}`, f.dalala && `دلالة — ${f.dalala}`,
        f.balagha && `بلاغة — ${f.balagha}`, f.tarjama && `ترجمة — ${f.tarjama}`].filter(Boolean).join('\n\n');
    }
    return a.lenses[k]?.text ?? null;
  }

  grade(g: 'again' | 'hard' | 'good' | 'easy'): void {
    this.graded.emit({ wordId: this.word.word_id, grade: g });
    this.close();
  }

  @HostListener('document:keydown.escape')
  close(): void {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !this.card) { this.closed.emit(); return; }
    gsap.to(this.card.nativeElement, { opacity: 0, y: 18, scale: 0.97, duration: 0.22, ease: 'power2.in' });
    gsap.to(this.overlay.nativeElement, { opacity: 0, duration: 0.24, delay: 0.04, onComplete: () => this.closed.emit() });
  }

  onOverlayClick(ev: MouseEvent): void {
    if (ev.target === this.overlay?.nativeElement) this.close();
  }

  refFor(ex: string): string { return ex; }
}

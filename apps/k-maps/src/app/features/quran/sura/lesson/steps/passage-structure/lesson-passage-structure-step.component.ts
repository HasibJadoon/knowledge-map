import {
  Component, Input, OnInit, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, inject, signal, computed, ChangeDetectionStrategy, NgZone,
} from '@angular/core';
import gsap from 'gsap';
import { StudyLessonResponse } from '../../../../../../shared/services/quran/quran-surah.service';

export interface PassageSection {
  key: string;
  title: string;
  badge: string;
  tone: 'gold' | 'purple' | 'ember' | 'moss' | 'sky' | 'narrative' | 'indigo'
      | 'info' | 'primary' | 'warning' | 'danger' | 'success' | 'secondary';
  renderer: 'discourse' | 'chiasm' | 'conflict' | 'lexicon' | 'purpose' | 'narrative_seed'
           | 'symbol_maps' | 'keyvalue' | 'clusters' | 'timeline';
  data: any;
}

const PASSAGE_FONT_SCALE_STORAGE_KEY = 'k-maps:passage-structure:font-scale';
const PASSAGE_FONT_SCALE_DEFAULT = 1;
const PASSAGE_FONT_SCALE_MIN = 0.7;
const PASSAGE_FONT_SCALE_MAX = 2.05;

@Component({
  selector: 'km-lesson-passage-structure-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lesson-passage-structure-step.component.html',
  styleUrl: './lesson-passage-structure-step.component.scss',
})
export class LessonPassageStructureStepComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) lesson!: StudyLessonResponse;
  @ViewChild('cardRef') cardRef!: ElementRef<HTMLElement>;

  private zone = inject(NgZone);

  sections: PassageSection[] = [];
  ref = '';

  // ── Card deck state ──────────────────────────────────
  currentIdx = signal(0);
  revealed   = signal(false);
  hintText   = signal('');
  private animating = false;
  private swipeStartX = 0;
  private swipeStartY = 0;

  currentSection = computed((): PassageSection | undefined => this.sections[this.currentIdx()]);
  private readonly compactRenderers = new Set<PassageSection['renderer']>([
    'chiasm',
    'purpose',
    'keyvalue',
    'clusters',
  ]);
  private readonly roomyRenderers = new Set<PassageSection['renderer']>([
    'narrative_seed',
    'symbol_maps',
    'timeline',
  ]);

  // ── Chiasm hover mirror ───────────────────────────────
  chiasmHover = signal<string | null>(null);
  onChiasmEnter(variant: string): void { if (this.revealed()) this.chiasmHover.set(variant); }
  onChiasmLeave(): void { this.chiasmHover.set(null); }

  // ── Font scale ───────────────────────────────────────
  fontScale = signal(PASSAGE_FONT_SCALE_DEFAULT);
  sceneMinHeightRem = computed(() => {
    const renderer = this.currentSection()?.renderer;
    const scaleDelta = Math.max(0, this.fontScale() - PASSAGE_FONT_SCALE_DEFAULT);
    const base = renderer && this.compactRenderers.has(renderer)
      ? 29
      : renderer && this.roomyRenderers.has(renderer)
        ? 35
        : 32;
    const gain = renderer && this.compactRenderers.has(renderer) ? 8 : 12;
    const ceiling = renderer && this.compactRenderers.has(renderer)
      ? 38
      : renderer && this.roomyRenderers.has(renderer)
        ? 48
        : 42;
    return Math.min(base + scaleDelta * gain, ceiling);
  });
  sceneHeightStyle = computed(() => {
    const renderer = this.currentSection()?.renderer;
    const scaleDelta = Math.max(0, this.fontScale() - PASSAGE_FONT_SCALE_DEFAULT);
    const base = renderer && this.compactRenderers.has(renderer)
      ? 33
      : renderer && this.roomyRenderers.has(renderer)
        ? 43
        : 38;
    const gain = renderer && this.compactRenderers.has(renderer) ? 12 : 16;
    const ceiling = renderer && this.compactRenderers.has(renderer)
      ? 46
      : renderer && this.roomyRenderers.has(renderer)
        ? 60
        : 50;
    return `min(80dvh, ${Math.min(base + scaleDelta * gain, ceiling).toFixed(2)}rem)`;
  });

  increaseFontScale(): void { this.setFontScale(this.fontScale() + 0.1); }
  decreaseFontScale(): void { this.setFontScale(this.fontScale() - 0.1); }
  resetFontScale(): void    { this.setFontScale(PASSAGE_FONT_SCALE_DEFAULT); }

  ngOnInit(): void {
    this.loadStoredFontScale();
    this.ref = this.refFromUnit();

    // Table-sourced: the per-step endpoint supplies the analysis cards from
    // qr_passage_sections (no task_json).
    const sections = this.lesson?.passageStructure ?? [];
    if (Array.isArray(sections) && sections.length) {
      this.sections = sections as unknown as PassageSection[];
    }
  }

  ngAfterViewInit(): void {
    if (!this.sections.length) return;
    setTimeout(() => this.dealIn(true), 250);
  }

  ngOnDestroy(): void {}

  // ── Scene touch/mouse swipe ──────────────────────────
  onSwipeStart(e: TouchEvent | MouseEvent): void {
    const pt = e instanceof TouchEvent ? e.touches[0] : e;
    this.swipeStartX = pt.clientX;
    this.swipeStartY = pt.clientY;
  }

  onSwipeEnd(e: TouchEvent | MouseEvent): void {
    if (e instanceof MouseEvent && this.hasMouseTextSelection()) return;

    const pt = e instanceof TouchEvent ? e.changedTouches[0] : e;
    const dx = pt.clientX - this.swipeStartX;
    const dy = pt.clientY - this.swipeStartY;
    // Only count as swipe if mostly horizontal and > 50px
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
    if (dx < 0) { // swipe left → next
      if (this.currentIdx() < this.sections.length - 1) this.goTo(this.currentIdx() + 1, true);
    } else { // swipe right → prev
      if (this.currentIdx() > 0) this.goTo(this.currentIdx() - 1, false);
    }
  }

  // ── Navigation ───────────────────────────────────────
  goNext(e: Event): void {
    e.stopPropagation();
    if (this.currentIdx() < this.sections.length - 1) this.goTo(this.currentIdx() + 1, true);
  }

  goPrev(e: Event): void {
    e.stopPropagation();
    if (this.currentIdx() > 0) this.goTo(this.currentIdx() - 1, false);
  }

  private goTo(newIdx: number, forward: boolean): void {
    if (this.animating) return;
    this.revealed.set(false);
    this.hintText.set('');
    this.chiasmHover.set(null);
    this.swipeOut(forward, () => {
      this.zone.run(() => {
        this.currentIdx.set(newIdx);
        setTimeout(() => this.dealIn(forward), 0);
      });
    });
  }

  // ── GSAP: deal in ────────────────────────────────────
  private dealIn(fromRight: boolean): void {
    if (!this.cardRef) return;
    const el = this.cardRef.nativeElement;
    this.animating = true;
    gsap.fromTo(el,
      { x: fromRight ? 400 : -400, opacity: 0, rotationZ: fromRight ? 6 : -6, scale: 0.93 },
      {
        x: 0, opacity: 1, rotationZ: 0, scale: 1,
        duration: 0.55, ease: 'back.out(1.2)',
        onComplete: () => {
          this.animating = false;
          this.zone.run(() => {
            this.hintText.set(this.sections.length > 1 ? 'Swipe or use arrows to navigate' : '');
            this.doReveal();
          });
        },
      }
    );
  }

  private hasMouseTextSelection(): boolean {
    if (typeof window === 'undefined') return false;

    const selection = window.getSelection();
    if (!selection) return false;

    return selection.type === 'Range' || !selection.isCollapsed;
  }

  // ── GSAP: swipe out ───────────────────────────────────
  private swipeOut(toRight: boolean, cb: () => void): void {
    if (!this.cardRef) { cb(); return; }
    const el = this.cardRef.nativeElement;
    this.animating = true;
    gsap.to(el, {
      x: toRight ? -420 : 420, opacity: 0,
      rotationZ: toRight ? -7 : 7, scale: 0.94,
      duration: 0.35, ease: 'power2.in',
      onComplete: () => { this.animating = false; cb(); },
    });
  }

  // ── GSAP: reveal ─────────────────────────────────────
  private doReveal(): void {
    if (!this.cardRef) return;
    const el = this.cardRef.nativeElement;
    const sec = this.currentSection();
    if (!sec) return;

    this.revealed.set(true);
    this.hintText.set('');

    switch (sec.renderer) {

      case 'discourse': {
        const tl = gsap.timeline();
        const rows  = Array.from(el.querySelectorAll<HTMLElement>('.disc-row'));
        const hinge = el.querySelector<HTMLElement>('.disc-hinge');
        const dir   = el.querySelector<HTMLElement>('.disc-dir');
        if (rows[0]) tl.fromTo(rows[0], { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: .45, ease: 'power2.out' });
        if (hinge)   tl.fromTo(hinge,   { opacity: 0 },          { opacity: 1,       duration: .5,  ease: 'power1.in' }, '+=.08');
        if (rows[1]) tl.fromTo(rows[1], { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: .45, ease: 'power2.out' }, '+=.05');
        if (dir)     tl.fromTo(dir,     { opacity: 0 },          { opacity: 1,       duration: .5  }, '+=.15');
        break;
      }

      case 'chiasm': {
        const tl   = gsap.timeline();
        const rows = Array.from(el.querySelectorAll<HTMLElement>('.ch-row'));
        const note = el.querySelector<HTMLElement>('.ch-center');
        rows.forEach((r, i) => tl.fromTo(r, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: .32, ease: 'power2.out' }, i * .11));
        if (note) tl.fromTo(note, { opacity: 0 }, { opacity: 1, duration: .45 }, '+=.08');
        const glowDelay = rows.length * 110 + 200;
        setTimeout(() => {
          const outerA = el.querySelectorAll<HTMLElement>('.cl-a');
          if (outerA.length) gsap.to(Array.from(outerA), { boxShadow: '0 0 10px rgba(201,168,76,.5)', duration: .4, yoyo: true, repeat: 1, stagger: 0 });
        }, glowDelay);
        break;
      }

      case 'conflict': {
        const tl     = gsap.timeline();
        const levels = Array.from(el.querySelectorAll<HTMLElement>('.cf-level'));
        if (levels[0]) tl.fromTo(levels[0], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, ease: 'back.out(1.2)' });
        if (levels[1]) {
          tl.fromTo(levels[1], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, ease: 'back.out(1.2)' }, '+=.12');
          const arabic = levels[1].querySelector<HTMLElement>('.cf-arabic');
          if (arabic) tl.add(() => { gsap.to(arabic, { color: '#e07050', textShadow: '0 0 14px rgba(192,80,48,.4)', duration: .4, yoyo: true, repeat: 1 }); });
        }
        if (levels[2]) tl.fromTo(levels[2], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, ease: 'back.out(1.2)' }, '+=.12');
        break;
      }

      case 'lexicon': {
        const tl     = gsap.timeline();
        const fields = Array.from(el.querySelectorAll<HTMLElement>('.lx-field'));
        fields.forEach((f, fi) => {
          tl.fromTo(f, { opacity: 0 }, { opacity: 1, duration: .35 }, fi === 0 ? 0 : '+=.05');
          const chips = Array.from(f.querySelectorAll<HTMLElement>('.lx-chip'));
          if (chips.length) tl.fromTo(chips, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: .28, stagger: .07, ease: 'back.out(1.4)' }, '+=.05');
        });
        break;
      }

      case 'purpose': {
        const tl   = gsap.timeline();
        const rows = Array.from(el.querySelectorAll<HTMLElement>('.pu-row'));
        rows.forEach((r, i) => tl.fromTo(r, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .38, ease: 'power2.out' }, i * .16));
        break;
      }

      case 'narrative_seed': {
        const tl        = gsap.timeline();
        const seedEl    = el.querySelector<HTMLElement>('.sd-seed');
        const bpEl      = el.querySelector<HTMLElement>('.sd-blueprint');
        const bpRows    = Array.from(el.querySelectorAll<HTMLElement>('.bp-row'));
        const flowEl    = el.querySelector<HTMLElement>('.sd-flow');
        const flowNodes = Array.from(el.querySelectorAll<HTMLElement>('.fl-node'));
        const flowArrows= Array.from(el.querySelectorAll<HTMLElement>('.fl-arr'));
        const closeEl   = el.querySelector<HTMLElement>('.sd-close');
        if (seedEl) tl.fromTo(seedEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .4,  ease: 'power2.out' });
        if (bpEl)   tl.fromTo(bpEl,   { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .35 }, '+=.08');
        bpRows.forEach(r => tl.fromTo(r, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .25 }, '+=.06'));
        if (flowEl) tl.fromTo(flowEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .35 }, '+=.1');
        flowNodes.forEach((node, i) => {
          tl.fromTo(node, { opacity: 0 }, { opacity: 1, duration: .2 }, '+=.02');
          if (flowArrows[i]) tl.fromTo(flowArrows[i], { opacity: 0 }, { opacity: 1, duration: .15 }, '+=.02');
        });
        if (closeEl) {
          tl.fromTo(closeEl, { opacity: 0 }, { opacity: 1, duration: .5, ease: 'power1.in' }, '+=.1');
          tl.add(() => { gsap.to(closeEl, { borderColor: '#c9a84c', boxShadow: '0 0 18px rgba(201,168,76,.12)', duration: .5 }); });
        }
        break;
      }

      case 'symbol_maps': {
        const tl     = gsap.timeline();
        const groups = Array.from(el.querySelectorAll<HTMLElement>('.sm-group'));
        groups.forEach((g, gi) => {
          const header = g.querySelector<HTMLElement>('.sm-group-name');
          const items  = Array.from(g.querySelectorAll<HTMLElement>('.sm-item'));
          if (header) tl.fromTo(header, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .3, ease: 'power2.out' }, gi === 0 ? 0 : '+=.04');
          if (items.length) tl.fromTo(items, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: .28, stagger: .05, ease: 'power2.out' }, '+=.04');
        });
        break;
      }

      // Legacy renderers
      default: {
        const items = Array.from(el.querySelectorAll<HTMLElement>('.pss-anim-item'));
        if (!items.length) return;
        if (sec.renderer === 'clusters') {
          gsap.fromTo(items, { opacity: 0, scale: 0.84 }, { opacity: 1, scale: 1, duration: .32, stagger: .08, ease: 'back.out(1.5)' });
        } else if (sec.renderer === 'timeline') {
          gsap.fromTo(items, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .38, stagger: .1, ease: 'power2.out' });
        } else {
          gsap.fromTo(items, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: .38, stagger: .08, ease: 'power2.out' });
        }
      }
    }
  }

  // ── Ref helper ───────────────────────────────────────
  private refFromUnit(): string {
    const u = this.lesson?.unit;
    if (!u) return '';
    if (u.start_ref && u.end_ref) return `${u.start_ref} – ${u.end_ref}`;
    if (u.start_ref) return u.start_ref;
    if (u.ayah_from && u.ayah_to) return `${u.ayah_from}–${u.ayah_to}`;
    return '';
  }

  // ── Renderer helpers ─────────────────────────────────
  barGradient(tone: string): string {
    const map: Record<string, string> = {
      gold:      'linear-gradient(90deg,transparent,#c9a84c,transparent)',
      purple:    'linear-gradient(90deg,transparent,#a090d8,transparent)',
      ember:     'linear-gradient(90deg,transparent,#c05030,transparent)',
      moss:      'linear-gradient(90deg,transparent,#2e7c40,transparent)',
      sky:       'linear-gradient(90deg,transparent,#3a6a9a,transparent)',
      narrative: 'linear-gradient(90deg,transparent,rgba(201,168,76,.5),#a090d8,rgba(201,168,76,.5),transparent)',
      indigo:    'linear-gradient(90deg,transparent,#6070d8,transparent)',
      // legacy
      info:      'linear-gradient(90deg,transparent,rgba(58,106,154,0.85),transparent)',
      primary:   'linear-gradient(90deg,transparent,rgba(160,144,216,0.85),transparent)',
      warning:   'linear-gradient(90deg,transparent,rgba(201,168,76,0.9),transparent)',
      danger:    'linear-gradient(90deg,transparent,rgba(192,80,48,0.85),transparent)',
      success:   'linear-gradient(90deg,transparent,rgba(46,124,64,0.85),transparent)',
      secondary: 'linear-gradient(90deg,transparent,rgba(160,160,160,0.55),transparent)',
    };
    return map[tone] ?? map['secondary'];
  }

  symbolGroups(data: any): any[]   { return data?.groups ?? []; }
  discourseRows(data: any): any[]  { return data?.rows ?? []; }
  chiasmLevels(data: any): any[] {
    const levels: any[] = data?.levels ?? [];
    return levels.map((l, i) => ({
      ...l,
      indent: Math.min(i, levels.length - 1 - i),
    }));
  }
  conflictLevels(data: any): any[] { return data?.levels ?? []; }
  lexiconFields(data: any): any[]  { return data?.fields ?? []; }
  purposeRows(data: any): any[]    { return data?.rows ?? []; }
  flowNodes(data: any): Array<{ text: string; highlight: boolean }> {
    const flow = data?.flow ?? [];
    const highlights: number[] = data?.flow_highlights ?? [];
    return flow.map((text: string, i: number) => ({ text, highlight: highlights.includes(i) }));
  }

  // Legacy helpers kept for backwards compatibility
  kvPairs(data: Record<string, string>): { key: string; value: string }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value }));
  }
  clusters(data: any): any[]      { return data?.clusters ?? []; }
  timelineSteps(data: any): any[] { return data?.steps ?? []; }

  private parsePayload(raw: unknown): any {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return raw;
  }

  private setFontScale(value: number): void {
    const nextValue = Number(
      Math.min(PASSAGE_FONT_SCALE_MAX, Math.max(PASSAGE_FONT_SCALE_MIN, value)).toFixed(2),
    );
    this.fontScale.set(nextValue);
    this.storeFontScale(nextValue);
  }

  private loadStoredFontScale(): void {
    if (typeof localStorage === 'undefined') return;

    const rawValue = localStorage.getItem(PASSAGE_FONT_SCALE_STORAGE_KEY);
    if (!rawValue) return;

    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) return;

    this.fontScale.set(
      Math.min(PASSAGE_FONT_SCALE_MAX, Math.max(PASSAGE_FONT_SCALE_MIN, parsed)),
    );
  }

  private storeFontScale(value: number): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PASSAGE_FONT_SCALE_STORAGE_KEY, String(value));
  }
}

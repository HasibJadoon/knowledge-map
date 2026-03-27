import {
  Component, Input, OnInit, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, inject, signal, computed, ChangeDetectionStrategy, NgZone,
} from '@angular/core';
import gsap from 'gsap';
import { StudyLessonResponse } from '../../../../../../shared/services/surah-modules.service';

export interface PassageSection {
  key: string;
  title: string;
  badge: string;
  tone: 'info' | 'primary' | 'warning' | 'danger' | 'success' | 'secondary';
  renderer: 'keyvalue' | 'chiasm' | 'clusters' | 'timeline';
  data: any;
}

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
  hintText   = signal('Tap to reveal');
  private animating = false;

  currentSection = computed(() => this.sections[this.currentIdx()] as PassageSection);

  // ── Font scale ───────────────────────────────────────
  fontScale = signal(1);
  increaseFontScale(): void { this.fontScale.update(v => Math.min(v + 0.1, 1.6)); }
  decreaseFontScale(): void { this.fontScale.update(v => Math.max(v - 0.1, 0.7)); }
  resetFontScale(): void    { this.fontScale.set(1); }

  // ── Chiasm pair hover ────────────────────────────────
  hoveredPair = signal<number | null>(null);
  onPairEnter(i: number, total: number): void { this.hoveredPair.set(Math.min(i, total - 1 - i)); }
  onPairLeave(): void { this.hoveredPair.set(null); }
  isPairHighlighted(i: number, total: number): boolean {
    const active = this.hoveredPair();
    return active !== null && Math.min(i, total - 1 - i) === active;
  }

  ngOnInit(): void {
    this.ref = this.refFromUnit();
    const task = this.lesson?.tasks?.find(t => t.task_type === 'passage_structure');
    if (!task) return;

    // 1. Check if root task_json contains all sections in one payload
    const rootParsed = this.parsePayload(task.task_json);
    const rootSections = rootParsed?.analysis?.sections ?? rootParsed?.sections ?? [];
    if (Array.isArray(rootSections) && rootSections.length) {
      this.sections = rootSections;
      const s = rootParsed?.scope?.ref;
      if (s) this.ref = `${s.surah}:${s.verses}`;
      return;
    }

    // 2. Aggregate one section per child (each child carries its own analysis.sections[0])
    const aggregated: PassageSection[] = [];
    for (const child of task.children ?? []) {
      const parsed = this.parsePayload(child.task_json);
      if (!parsed) continue;
      const sections = parsed?.analysis?.sections ?? parsed?.sections ?? [];
      if (Array.isArray(sections)) {
        aggregated.push(...sections);
        if (!this.ref || this.ref === this.refFromUnit()) {
          const s = parsed?.scope?.ref;
          if (s) this.ref = `${s.surah}:${s.verses}`;
        }
      }
    }
    this.sections = aggregated;
  }

  ngAfterViewInit(): void {
    if (!this.sections.length) return;
    setTimeout(() => this.dealIn(true), 250);
  }

  ngOnDestroy(): void {}

  // ── Scene click: reveal ──────────────────────────────
  onSceneClick(): void {
    if (this.animating || this.revealed()) return;
    this.doReveal();
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
          this.zone.run(() => this.hintText.set('Tap to reveal'));
        },
      }
    );
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

  // ── GSAP: reveal renderer content ────────────────────
  private doReveal(): void {
    if (!this.cardRef) return;
    const el = this.cardRef.nativeElement;
    const sec = this.currentSection();
    if (!sec) return;

    this.revealed.set(true);
    this.hintText.set('');

    const items = Array.from(el.querySelectorAll<HTMLElement>('.pss-anim-item'));
    if (!items.length) return;

    if (sec.renderer === 'chiasm') {
      const rows = items.filter(i => !i.classList.contains('chiasm-note'));
      const note = items.find(i => i.classList.contains('chiasm-note'));
      gsap.fromTo(rows, { opacity: 0, x: -14 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.07, ease: 'power2.out' });
      if (note) {
        gsap.fromTo(note, { opacity: 0 },
          { opacity: 1, duration: 0.4, delay: rows.length * 0.07 + 0.1 });
      }
    } else if (sec.renderer === 'clusters') {
      gsap.fromTo(items, { opacity: 0, scale: 0.84 },
        { opacity: 1, scale: 1, duration: 0.32, stagger: 0.08, ease: 'back.out(1.5)' });
    } else if (sec.renderer === 'timeline') {
      gsap.fromTo(items, { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.38, stagger: 0.1, ease: 'power2.out' });
    } else {
      gsap.fromTo(items, { opacity: 0, x: -14 },
        { opacity: 1, x: 0, duration: 0.38, stagger: 0.08, ease: 'power2.out' });
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
      info:      'linear-gradient(90deg,transparent,rgba(58,106,154,0.85),transparent)',
      primary:   'linear-gradient(90deg,transparent,rgba(160,144,216,0.85),transparent)',
      warning:   'linear-gradient(90deg,transparent,rgba(201,168,76,0.9),transparent)',
      danger:    'linear-gradient(90deg,transparent,rgba(192,80,48,0.85),transparent)',
      success:   'linear-gradient(90deg,transparent,rgba(46,124,64,0.85),transparent)',
      secondary: 'linear-gradient(90deg,transparent,rgba(160,160,160,0.55),transparent)',
    };
    return map[tone] ?? map['secondary'];
  }

  kvPairs(data: Record<string, string>): { key: string; value: string }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value }));
  }

  chiasmLevels(data: any): any[] { return data?.levels ?? []; }

  chiasmIndent(i: number, total: number): string {
    return `${Math.min(i, total - 1 - i) * 1.25}rem`;
  }

  isOddAxis(i: number, total: number): boolean {
    return total % 2 === 1 && i === Math.floor(total / 2);
  }

  isEvenCenter(i: number, total: number): boolean {
    if (total % 2 !== 0) return false;
    const mid = total / 2;
    return i === mid - 1 || i === mid;
  }

  pairColor(i: number, total: number): string {
    const depth = Math.min(i, total - 1 - i);
    const palette = [
      'rgba(100,160,230,0.75)',
      'rgba(140,100,220,0.75)',
      'rgba(80,180,150,0.75)',
      'rgba(220,140,80,0.75)',
      'rgba(200,80,120,0.75)',
    ];
    return palette[Math.min(depth, palette.length - 1)];
  }

  clusters(data: any): any[] { return data?.clusters ?? []; }

  timelineSteps(data: any): any[] { return data?.steps ?? []; }

  private parsePayload(raw: unknown): any {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return raw;
  }
}

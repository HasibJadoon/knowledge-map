import {
  Component, Input, OnInit, AfterViewInit, OnDestroy,
  ElementRef, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { StudyLessonResponse } from '../../../../../shared/services/surah-modules.service';

gsap.registerPlugin(ScrollTrigger);

export interface PassageSection {
  key: string;
  title: string;
  badge: string;
  tone: 'info' | 'primary' | 'warning' | 'danger' | 'success' | 'secondary';
  renderer: 'keyvalue' | 'chiasm' | 'clusters' | 'timeline';
  data: any;
}

@Component({
  selector: 'km-lesson-passage-structure-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ps-tab" [style.font-size]="fontScale() + 'rem'">

      @if (ref) {
        <div class="ps-header">
          <div class="ps-header__top">
            <div>
              <span class="ps-ref">{{ ref }}</span>
              <h2 class="ps-title">Passage Structure</h2>
            </div>
            <div class="ps-font-controls">
              <button class="ps-font-btn" (click)="decreaseFontScale()" title="Decrease font size">A−</button>
              <button class="ps-font-btn ps-font-btn--reset" (click)="resetFontScale()" title="Reset font size">A</button>
              <button class="ps-font-btn" (click)="increaseFontScale()" title="Increase font size">A+</button>
            </div>
          </div>
        </div>
      }

      @if (sections.length === 0) {
        <div class="no-task">
          <span class="no-task__icon">—</span>
          <p>No passage structure analysis for this passage.</p>
        </div>
      }

      @for (section of sections; track section.key) {
        <div class="section-card tone-{{ section.tone }}">

          <div class="card-header">
            <span class="badge tone-{{ section.tone }}">{{ section.badge }}</span>
            <span class="card-title">{{ section.title }}</span>
          </div>

          @if (section.renderer === 'keyvalue') {
            <div class="renderer-kv">
              @for (pair of kvPairs(section.data); track pair.key) {
                <div class="kv-row">
                  <span class="kv-key">{{ pair.key }}</span>
                  <span class="kv-value">{{ pair.value }}</span>
                </div>
              }
            </div>
          }

          @if (section.renderer === 'chiasm') {
            <div class="renderer-chiasm">
              @for (level of chiasmLevels(section.data); track level.label; let i = $index; let count = $count) {
                <div class="chiasm-level"
                     [class.chiasm-axis]="isOddAxis(i, count)"
                     [class.chiasm-even-center]="isEvenCenter(i, count)"
                     [class.chiasm-pair-hl]="isPairHighlighted(i, count)"
                     [style.padding-left]="chiasmIndent(i, count)"
                     [style.--pair-clr]="pairColor(i, count)"
                     (mouseenter)="onPairEnter(i, count)"
                     (mouseleave)="onPairLeave()">
                  <span class="chiasm-pair-dot"></span>
                  <span class="chiasm-label">{{ level.label }}</span>
                  <span class="chiasm-ref">{{ level.ref }}</span>
                  <span class="chiasm-text">{{ level.text }}</span>
                </div>
              }
              @if (section.data?.axis_note) {
                <p class="chiasm-note">{{ section.data.axis_note }}</p>
              }
            </div>
          }

          @if (section.renderer === 'clusters') {
            <div class="renderer-clusters">
              @for (cluster of clusters(section.data); track cluster.name) {
                <div class="cluster">
                  <span class="cluster-name color-{{ cluster.color }}">{{ cluster.name }}</span>
                  <div class="cluster-items">
                    @for (item of cluster.items; track item) {
                      <span class="cluster-item">{{ item }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (section.renderer === 'timeline') {
            <div class="renderer-timeline">
              @for (step of timelineSteps(section.data); track step.n; let last = $last) {
                <div class="timeline-step">
                  <div class="timeline-node"><span class="timeline-n">{{ step.n }}</span></div>
                  <div class="timeline-connector" [class.timeline-connector--last]="last"></div>
                  <p class="timeline-text">{{ step.text }}</p>
                </div>
              }
            </div>
          }

        </div>
      }

    </div>
  `,
  styles: [`
    /* Global Arabic fallback — browser auto-selects this font for Arabic codepoints */
    :host { font-family: var(--km-font-body), var(--km-font-arabic, 'Scheherazade New', 'KFGQPC Hafs Uthmanic', serif); }

    .ps-tab { display: flex; flex-direction: column; gap: 1.5rem; padding: 0.5rem 0 3rem; }

    .ps-header { margin-bottom: 0.5rem; }
    .ps-header__top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .ps-ref { font-size: 0.72em; letter-spacing: 0.15em; color: var(--km-gold); text-transform: uppercase; font-family: var(--km-font-heading); opacity: 0.85; display: block; margin-bottom: 0.2rem; }
    .ps-title { font-size: 1.35em; font-weight: 300; color: var(--km-text); letter-spacing: 0.05em; margin: 0; }
    .ps-font-controls {
      display: flex; align-items: center; gap: 0.15rem; flex-shrink: 0;
    }
    .ps-font-btn {
      display: inline-flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      color: var(--km-text-3); border-radius: 5px; padding: 0.3rem 0.5rem;
      font-size: 0.72rem; font-family: var(--km-font-heading); font-weight: 600;
      cursor: pointer; letter-spacing: 0.04em;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
      &:hover { background: rgba(201,168,76,0.12); border-color: rgba(201,168,76,0.35); color: var(--km-gold); }
      &--reset { font-size: 0.78rem; }
    }

    .section-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 14px;
      padding: 1.5rem 1.75rem;
      transition: border-color 0.3s;
      &:hover { border-color: rgba(255,255,255,0.16); }
      &.tone-info    { border-left: 3px solid rgba(100,160,230,0.6); }
      &.tone-primary { border-left: 3px solid rgba(140,100,220,0.6); }
      &.tone-warning { border-left: 3px solid rgba(201,168,76,0.7); }
      &.tone-danger  { border-left: 3px solid rgba(200,80,80,0.6); }
      &.tone-success { border-left: 3px solid rgba(80,180,120,0.6); }
      &.tone-secondary { border-left: 3px solid rgba(160,160,160,0.5); }
    }

    .card-header { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.2rem; }

    .badge {
      font-size: 0.63em; letter-spacing: 0.12em; text-transform: uppercase;
      padding: 0.22rem 0.65rem; border-radius: 4px; font-weight: 700;
      font-family: var(--km-font-heading); flex-shrink: 0;
      &.tone-info    { background: rgba(100,160,230,0.18); color: #8ec4f5; }
      &.tone-primary { background: rgba(140,100,220,0.18); color: #be9ef5; }
      &.tone-warning { background: rgba(201,168,76,0.22);  color: var(--km-gold); }
      &.tone-danger  { background: rgba(200,80,80,0.18);   color: #f08080; }
      &.tone-success { background: rgba(80,180,120,0.18);  color: #70d4a0; }
      &.tone-secondary { background: rgba(160,160,160,0.12); color: #b0b0b0; }
    }
    .card-title { font-size: 1em; font-weight: 500; color: var(--km-text); letter-spacing: 0.02em; }

    /* key-value */
    .renderer-kv { display: flex; flex-direction: column; gap: 0.8rem; }
    .kv-row { display: grid; grid-template-columns: 180px 1fr; gap: 1rem; align-items: baseline; }
    .kv-key { font-size: 0.72em; text-transform: uppercase; letter-spacing: 0.08em; color: var(--km-text-3); white-space: nowrap; font-weight: 600; }
    .kv-value { font-size: 0.95em; color: var(--km-text); line-height: 1.8; font-family: var(--km-font-body), var(--km-font-arabic, 'Scheherazade New', 'KFGQPC Hafs Uthmanic', serif); }

    /* chiasm */
    .renderer-chiasm { display: flex; flex-direction: column; gap: 0.3rem; }
    .chiasm-level {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 0.5rem 0.7rem; border-radius: 7px;
      transition: background 0.2s;
      border-left: 2.5px solid var(--pair-clr, transparent);
      &:hover { background: rgba(255,255,255,0.04); }
      /* odd-count: single center axis */
      &.chiasm-axis {
        background: rgba(201,168,76,0.09);
        border-left-color: var(--km-gold) !important;
        outline: 1px solid rgba(201,168,76,0.22);
        margin: 0.35rem 0;
      }
      /* even-count: paired center rows */
      &.chiasm-even-center {
        background: rgba(201,168,76,0.05);
        border-left-color: var(--km-gold) !important;
      }
    }
    .chiasm-pair-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--pair-clr, rgba(255,255,255,0.15));
      flex-shrink: 0;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .chiasm-label { font-size: 0.92em; font-weight: 700; color: var(--km-gold); min-width: 1.8rem; font-style: italic; }
    .chiasm-ref { font-size: 0.75em; color: rgba(255,255,255,0.45); min-width: 2.8rem; font-family: var(--km-font-heading); letter-spacing: 0.04em; }
    .chiasm-text { font-size: 0.97em; color: var(--km-text); line-height: 1.8; font-family: var(--km-font-body), var(--km-font-arabic, 'Scheherazade New', 'KFGQPC Hafs Uthmanic', serif); }
    .chiasm-note { font-size: 0.83em; color: var(--km-text-2); font-style: italic; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.07); line-height: 1.8; font-family: var(--km-font-body), var(--km-font-arabic, 'Scheherazade New', 'KFGQPC Hafs Uthmanic', serif); }
    /* pair highlight — activated when sibling is hovered */
    .chiasm-pair-hl {
      background: color-mix(in srgb, var(--pair-clr, rgba(255,255,255,0.3)) 18%, transparent) !important;
      border-left-color: var(--pair-clr, rgba(255,255,255,0.5)) !important;
      .chiasm-pair-dot { opacity: 1; transform: scale(1.35); }
      .chiasm-label { text-shadow: 0 0 10px var(--pair-clr, transparent); }
    }

    /* clusters */
    .renderer-clusters { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.85rem; }
    .cluster { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 1rem; }
    .cluster-name {
      font-size: 0.68em; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;
      display: block; margin-bottom: 0.65rem; font-family: var(--km-font-heading);
      &.color-blue { color: #8ec4f5; }
      &.color-gold { color: var(--km-gold); }
      &.color-red  { color: #f08080; }
      &.color-teal { color: #70d4b0; }
      &.color-green { color: #70d4a0; }
      &.color-purple { color: #be9ef5; }
    }
    .cluster-items { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .cluster-item {
      font-size: 1.3em; color: var(--km-text); background: rgba(255,255,255,0.06);
      padding: 0.25rem 0.65rem; border-radius: 5px;
      direction: rtl; font-family: var(--km-font-arabic, 'Scheherazade New', serif); line-height: 2;
    }

    /* timeline */
    .renderer-timeline { display: flex; flex-direction: column; }
    .timeline-step { display: grid; grid-template-columns: 32px 2px 1fr; gap: 0 1rem; align-items: start; }
    .timeline-node {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      border: 1px solid rgba(201,168,76,0.45); border-radius: 50%;
      background: rgba(201,168,76,0.06); margin-top: 0.15rem; flex-shrink: 0;
    }
    .timeline-n { font-size: 0.7em; color: var(--km-gold); font-weight: 700; font-family: var(--km-font-heading); }
    .timeline-connector {
      width: 1px; background: linear-gradient(to bottom, rgba(201,168,76,0.3), transparent);
      margin: 32px auto 0; align-self: stretch;
      &--last { background: transparent; }
    }
    .timeline-text { font-size: 0.95em; color: var(--km-text); line-height: 1.8; padding: 0.35rem 0 1.25rem; margin: 0; font-family: var(--km-font-body), var(--km-font-arabic, 'Scheherazade New', 'KFGQPC Hafs Uthmanic', serif); }

    /* empty */
    .no-task {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 4rem 1rem; gap: 0.75rem; color: var(--km-text-3); text-align: center;
      &__icon { font-size: 2rem; opacity: 0.25; }
      p { font-size: 0.875rem; font-style: italic; }
    }
  `],
})
export class LessonPassageStructureTabComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  private elRef = inject(ElementRef);

  sections: PassageSection[] = [];
  ref = '';

  // ── Font scale (em units, applied to container) ─────────
  fontScale = signal(1);
  increaseFontScale(): void { this.fontScale.update(v => Math.min(v + 0.1, 1.6)); }
  decreaseFontScale(): void { this.fontScale.update(v => Math.max(v - 0.1, 0.7)); }
  resetFontScale(): void    { this.fontScale.set(1); }

  // ── Chiasm pair hover ────────────────────────────────────
  hoveredPair = signal<number | null>(null);
  onPairEnter(i: number, total: number): void {
    this.hoveredPair.set(Math.min(i, total - 1 - i));
  }
  onPairLeave(): void { this.hoveredPair.set(null); }
  isPairHighlighted(i: number, total: number): boolean {
    const active = this.hoveredPair();
    if (active === null) return false;
    return Math.min(i, total - 1 - i) === active;
  }

  private scrollTriggers: ScrollTrigger[] = [];

  ngOnInit(): void {
    const task = this.lesson?.tasks?.find(t => t.task_type === 'passage_structure');
    if (!task?.task_json) return;
    try {
      const parsed = typeof task.task_json === 'string'
        ? JSON.parse(task.task_json)
        : task.task_json;
      // Schema v2: { analysis: { sections: [...] } }
      // Fallback: sections at root
      this.sections = parsed?.analysis?.sections ?? parsed?.sections ?? [];
      const s = parsed?.scope?.ref;
      this.ref = s ? `${s.surah}:${s.verses}` : '';
    } catch { /* malformed JSON — leave sections empty */ }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.animateCards(), 100);
  }

  ngOnDestroy(): void {}

  private animateCards(): void {
    const cards = this.elRef.nativeElement
      .querySelectorAll('.section-card') as NodeListOf<HTMLElement>;
    if (!cards.length) return;

    // Set all cards invisible first, then stagger them in — no scroll dependency
    gsap.set(Array.from(cards), { opacity: 0, y: 22 });
    gsap.to(Array.from(cards), {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      stagger: 0.07,
    });
  }

  kvPairs(data: Record<string, string>): { key: string; value: string }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value }));
  }

  chiasmLevels(data: any): any[] { return data?.levels ?? []; }

  // Indent increases toward the center regardless of odd/even
  chiasmIndent(i: number, total: number): string {
    const outerDepth = Math.min(i, total - 1 - i); // 0 = outermost (A/A')
    return `${outerDepth * 1.25}rem`;
  }

  // Odd count: exactly one center axis row
  isOddAxis(i: number, total: number): boolean {
    return total % 2 === 1 && i === Math.floor(total / 2);
  }

  // Even count: the two innermost rows both get the center highlight
  isEvenCenter(i: number, total: number): boolean {
    if (total % 2 !== 0) return false;
    const mid = total / 2;
    return i === mid - 1 || i === mid;
  }

  // Color for the left border / pair dot — same color for mirror pairs (A↔A', B↔B', etc.)
  pairColor(i: number, total: number): string {
    const depth = Math.min(i, total - 1 - i); // outermost = 0
    const palette = [
      'rgba(100,160,230,0.75)',  // 0 → blue    (A/A')
      'rgba(140,100,220,0.75)',  // 1 → purple  (B/B')
      'rgba(80,180,150,0.75)',   // 2 → teal    (C/C')
      'rgba(220,140,80,0.75)',   // 3 → amber   (D/D')
      'rgba(200,80,120,0.75)',   // 4 → rose
    ];
    return palette[Math.min(depth, palette.length - 1)];
  }

  clusters(data: any): any[] { return data?.clusters ?? []; }

  timelineSteps(data: any): any[] { return data?.steps ?? []; }
}

import {
  Component, Input, OnInit, AfterViewInit, OnDestroy,
  ElementRef, inject, ChangeDetectionStrategy,
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
    <div class="ps-tab">

      @if (ref) {
        <div class="ps-header">
          <span class="ps-ref">{{ ref }}</span>
          <h2 class="ps-title">Passage Structure</h2>
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
                <div class="chiasm-level" [class.chiasm-axis]="isCenter(i, count)"
                     [style.padding-left]="chiasmIndent(i, count)">
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
    .ps-tab { display: flex; flex-direction: column; gap: 1.25rem; padding: 0.5rem 0 3rem; }

    .ps-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.25rem; }
    .ps-ref { font-size: 0.68rem; letter-spacing: 0.15em; color: var(--km-gold); text-transform: uppercase; font-family: var(--km-font-heading); opacity: 0.75; }
    .ps-title { font-size: 1.2rem; font-weight: 300; color: var(--km-text); letter-spacing: 0.05em; margin: 0; }

    .section-card {
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      transition: border-color 0.3s;
      &:hover { border-color: rgba(255,255,255,0.13); }
      &.tone-info    { border-left: 2px solid rgba(100,160,230,0.5); }
      &.tone-primary { border-left: 2px solid rgba(140,100,220,0.5); }
      &.tone-warning { border-left: 2px solid rgba(201,168,76,0.6); }
      &.tone-danger  { border-left: 2px solid rgba(200,80,80,0.5); }
      &.tone-success { border-left: 2px solid rgba(80,180,120,0.5); }
    }

    .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }

    .badge {
      font-size: 0.58rem; letter-spacing: 0.12em; text-transform: uppercase;
      padding: 0.18rem 0.55rem; border-radius: 4px; font-weight: 600;
      font-family: var(--km-font-heading); flex-shrink: 0;
      &.tone-info    { background: rgba(100,160,230,0.15); color: #7ab0e8; }
      &.tone-primary { background: rgba(140,100,220,0.15); color: #a888e8; }
      &.tone-warning { background: rgba(201,168,76,0.18);  color: var(--km-gold); }
      &.tone-danger  { background: rgba(200,80,80,0.15);   color: #e07070; }
      &.tone-success { background: rgba(80,180,120,0.15);  color: #60c090; }
    }
    .card-title { font-size: 0.88rem; font-weight: 500; color: var(--km-text-2); letter-spacing: 0.03em; }

    /* key-value */
    .renderer-kv { display: flex; flex-direction: column; gap: 0.6rem; }
    .kv-row { display: grid; grid-template-columns: 160px 1fr; gap: 1rem; align-items: baseline; }
    .kv-key { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--km-text-3); white-space: nowrap; }
    .kv-value { font-size: 0.85rem; color: var(--km-text-2); line-height: 1.65; }

    /* chiasm */
    .renderer-chiasm { display: flex; flex-direction: column; gap: 0.35rem; }
    .chiasm-level {
      display: flex; align-items: baseline; gap: 0.75rem;
      padding: 0.35rem 0.5rem; border-radius: 6px; transition: background 0.2s;
      &:hover { background: rgba(255,255,255,0.04); }
      &.chiasm-axis {
        background: rgba(201,168,76,0.07);
        border: 1px solid rgba(201,168,76,0.2);
        margin: 0.2rem 0;
      }
    }
    .chiasm-label { font-size: 0.75rem; font-weight: 700; color: var(--km-gold); min-width: 1.4rem; font-style: italic; }
    .chiasm-ref { font-size: 0.65rem; color: var(--km-text-3); min-width: 2.5rem; font-family: var(--km-font-heading); letter-spacing: 0.04em; }
    .chiasm-text { font-size: 0.83rem; color: var(--km-text-2); line-height: 1.5; }
    .chiasm-note { font-size: 0.73rem; color: var(--km-text-3); font-style: italic; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.06); line-height: 1.6; }

    /* clusters */
    .renderer-clusters { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }
    .cluster { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem; }
    .cluster-name {
      font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;
      display: block; margin-bottom: 0.5rem; font-family: var(--km-font-heading);
      &.color-blue { color: #7ab0e8; }
      &.color-gold { color: var(--km-gold); }
      &.color-red  { color: #e07070; }
      &.color-teal { color: #60c0a0; }
    }
    .cluster-items { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .cluster-item {
      font-size: 0.95rem; color: var(--km-text-2); background: rgba(255,255,255,0.04);
      padding: 0.15rem 0.45rem; border-radius: 4px;
      direction: rtl; font-family: var(--km-font-arabic, 'Scheherazade New', serif); line-height: 1.8;
    }

    /* timeline */
    .renderer-timeline { display: flex; flex-direction: column; }
    .timeline-step { display: grid; grid-template-columns: 28px 2px 1fr; gap: 0 0.85rem; align-items: start; }
    .timeline-node {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      border: 1px solid rgba(201,168,76,0.35); border-radius: 50%;
      background: rgba(201,168,76,0.04); margin-top: 0.18rem; flex-shrink: 0;
    }
    .timeline-n { font-size: 0.62rem; color: var(--km-gold); font-weight: 600; font-family: var(--km-font-heading); }
    .timeline-connector {
      width: 1px; background: linear-gradient(to bottom, rgba(201,168,76,0.25), transparent);
      margin: 28px auto 0; align-self: stretch;
      &--last { background: transparent; }
    }
    .timeline-text { font-size: 0.83rem; color: var(--km-text-2); line-height: 1.65; padding: 0.3rem 0 1.1rem; margin: 0; }

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
    setTimeout(() => this.setupScrollAnimations(), 80);
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
    this.scrollTriggers = [];
  }

  private setupScrollAnimations(): void {
    const cards = this.elRef.nativeElement
      .querySelectorAll('.section-card') as NodeListOf<HTMLElement>;
    if (!cards.length) return;

    cards.forEach((card, i) => {
      gsap.set(card, { opacity: 0, y: 28 });
      const st = ScrollTrigger.create({
        trigger: card,
        scroller: document.body,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(card, {
            opacity: 1, y: 0, duration: 0.55,
            ease: 'power3.out',
            delay: Math.min(i * 0.07, 0.28),
          });
        },
      });
      this.scrollTriggers.push(st);
    });
    ScrollTrigger.refresh();
  }

  kvPairs(data: Record<string, string>): { key: string; value: string }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value }));
  }

  chiasmLevels(data: any): any[] { return data?.levels ?? []; }

  chiasmIndent(i: number, total: number): string {
    const center = Math.floor(total / 2);
    const dist = Math.abs(i - center);
    return `${(center - dist) * 1.1}rem`;
  }

  isCenter(i: number, total: number): boolean { return i === Math.floor(total / 2); }

  clusters(data: any): any[] { return data?.clusters ?? []; }

  timelineSteps(data: any): any[] { return data?.steps ?? []; }
}

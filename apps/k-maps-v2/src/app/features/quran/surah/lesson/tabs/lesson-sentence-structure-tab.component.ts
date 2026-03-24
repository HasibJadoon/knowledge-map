import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { StudyLessonResponse, UnitTaskVm } from '../../../../../shared/services/surah-modules.service';

gsap.registerPlugin(ScrollTrigger);

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

type SentenceTone = 'gold' | 'amber' | 'cyan' | 'mint' | 'slate';
type SentenceStepKind = 'frame' | 'main' | 'expansion';

interface SentenceSegmentVm {
  id: string;
  label: string;
  text: string;
  detail: string;
  pattern: string;
  grammar: string[];
  tone: SentenceTone;
}

interface SentenceStepVm {
  id: string;
  order: number;
  kind: SentenceStepKind;
  kindLabel: string;
  title: string;
  text: string;
  detail: string;
  pattern: string;
  grammar: string[];
  tone: SentenceTone;
}

interface SentenceVm {
  id: string;
  order: number;
  ref: string;
  sentenceType: string;
  corePattern: string;
  fullText: string;
  mainComponents: SentenceSegmentVm[];
  expansions: SentenceSegmentVm[];
  steps: SentenceStepVm[];
  stepsDerived: boolean;
}

@Component({
  selector: 'km-lesson-sentence-structure-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ss-tab">
      @if (sentences.length > 0) {
        <header class="ss-header">
          <div>
            <span class="ss-header__eyebrow">Sentence Structure</span>
            <h2 class="ss-header__title">{{ taskTitle }}</h2>
          </div>
          <div class="ss-header__meta">
            <span class="ss-header__count">{{ sentences.length }} sentence{{ sentences.length !== 1 ? 's' : '' }}</span>
            @if (derivedSentenceCount > 0) {
              <span class="ss-header__note">Derived teaching steps</span>
            }
          </div>
        </header>

        <div class="ss-slider">
          <div
            class="ss-stage"
            tabindex="0"
            (keydown.arrowdown)="nextSentence()"
            (keydown.arrowright)="nextSentence()"
            (keydown.arrowup)="previousSentence()"
            (keydown.arrowleft)="previousSentence()"
          >
            @for (sentence of sentences; track sentence.id; let sentenceIndex = $index) {
              <section
                class="ss-slide"
                [class.ss-slide--active]="sentenceIndex === activeSentenceIndex"
                [attr.aria-hidden]="sentenceIndex === activeSentenceIndex ? null : 'true'"
              >
                <div class="ss-slide__head ss-animate">
                  <div class="ss-slide__meta">
                    <span class="ss-slide__seq">Sentence {{ sentenceIndex + 1 }} / {{ sentences.length }}</span>
                    <span class="ss-slide__ref">{{ sentence.ref }}</span>
                    @if (sentence.sentenceType) {
                      <span class="ss-slide__type">{{ sentence.sentenceType }}</span>
                    }
                  </div>
                  @if (sentence.corePattern) {
                    <span class="ss-slide__pattern">{{ sentence.corePattern }}</span>
                  }
                </div>

                @if (sentence.fullText) {
                  <p class="ss-slide__full ss-animate" dir="rtl">{{ sentence.fullText }}</p>
                }

                <div class="ss-slide__stats ss-animate">
                  @if (sentence.mainComponents.length > 0) {
                    <span class="ss-mini-chip">{{ sentence.mainComponents.length }} main</span>
                  }
                  @if (sentence.expansions.length > 0) {
                    <span class="ss-mini-chip">{{ sentence.expansions.length }} expansion{{ sentence.expansions.length !== 1 ? 's' : '' }}</span>
                  }
                  <span class="ss-mini-chip">{{ sentence.steps.length }} teaching steps</span>
                </div>

                <div class="ss-flow">
                  @for (step of sentence.steps; track step.id) {
                    <article class="ss-step ss-animate" [attr.data-tone]="step.tone">
                      <div class="ss-step__rail">
                        <span class="ss-step__n">{{ step.order < 10 ? '0' + step.order : step.order }}</span>
                      </div>

                      <div class="ss-step__body">
                        <div class="ss-step__eyebrow">
                          <span class="ss-step__kind">{{ step.kindLabel }}</span>
                          @if (step.pattern) {
                            <span class="ss-step__pattern">{{ step.pattern }}</span>
                          }
                        </div>

                        <h3 class="ss-step__title">{{ step.title }}</h3>

                        @if (step.text) {
                          <p
                            class="ss-step__text"
                            [class.ss-step__text--arabic]="isArabic(step.text)"
                            [attr.dir]="dirFor(step.text)"
                          >{{ step.text }}</p>
                        }

                        @if (step.detail) {
                          <p
                            class="ss-step__detail"
                            [class.ss-step__detail--arabic]="isArabic(step.detail)"
                            [attr.dir]="dirFor(step.detail)"
                          >{{ step.detail }}</p>
                        }

                        @if (step.grammar.length > 0) {
                          <div class="ss-step__tags">
                            @for (tag of step.grammar; track tag) {
                              <span class="ss-tag">{{ tag }}</span>
                            }
                          </div>
                        }
                      </div>
                    </article>
                  }
                </div>

                @if (sentence.stepsDerived) {
                  <p class="ss-slide__note ss-animate">
                    Teaching steps were generated from the structure summary because the payload has no explicit step sequence yet.
                  </p>
                }

                <p class="ss-slide__cue ss-animate">
                  @if (sentenceIndex < sentences.length - 1) {
                    Scroll, swipe, or use Next for the next sentence.
                  } @else {
                    Final sentence in this passage.
                  }
                </p>
              </section>
            }
          </div>

          <div class="ss-controls">
            <button class="ss-nav" [disabled]="!canGoPrevious()" (click)="previousSentence()">Previous</button>
            <div class="ss-progress" role="tablist" aria-label="Sentence slides">
              @for (sentence of sentences; track sentence.id; let sentenceIndex = $index) {
                <button
                  class="ss-dot"
                  [class.ss-dot--active]="sentenceIndex === activeSentenceIndex"
                  [attr.aria-label]="'Go to sentence ' + (sentenceIndex + 1)"
                  [attr.aria-selected]="sentenceIndex === activeSentenceIndex"
                  (click)="goToSentence(sentenceIndex)"
                ></button>
              }
            </div>
            <button class="ss-nav" [disabled]="!canGoNext()" (click)="nextSentence()">Next</button>
          </div>

          <p class="ss-hint">Wheel or swipe inside the slide to move one sentence at a time.</p>
        </div>
      } @else if (hasTaskPayload) {
        <div class="empty-state">
          <span class="empty-state__icon">~</span>
          <p class="empty-state__title">Sentence payload found, but no structured items are ready yet.</p>
          <p class="empty-state__detail">This tab now ignores raw JSON and waits for sentence items it can teach step by step.</p>
        </div>
      } @else {
        <div class="empty-state">
          <span class="empty-state__icon">—</span>
          <p class="empty-state__title">No sentence structure task for this passage.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--km-font-body), var(--km-font-arabic, 'Scheherazade New', serif);
    }

    .ss-tab {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 0.25rem 0 3rem;
    }

    .ss-header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .ss-header__eyebrow {
      display: block;
      margin-bottom: 0.35rem;
      font-size: 0.7rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--km-gold);
      font-family: var(--km-font-heading);
      opacity: 0.8;
    }

    .ss-header__title {
      margin: 0;
      font-size: clamp(1.1rem, 2.4vw, 1.5rem);
      color: var(--km-text);
      font-weight: 500;
      letter-spacing: 0.03em;
    }

    .ss-header__meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .ss-header__count,
    .ss-header__note {
      font-size: 0.68rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      border-radius: 999px;
      padding: 0.24rem 0.65rem;
      border: 1px solid var(--km-border);
      color: var(--km-text-3);
      background: rgba(255, 255, 255, 0.03);
    }

    .ss-header__note {
      border-color: rgba(201, 168, 76, 0.25);
      color: var(--km-gold);
      background: rgba(201, 168, 76, 0.06);
    }

    .ss-slider {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .ss-stage {
      position: relative;
      height: min(46rem, calc(100svh - 14rem));
      min-height: 34rem;
      overflow: hidden;
      outline: none;
      touch-action: none;
    }

    .ss-slide {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.45rem 1.55rem;
      border-radius: 18px;
      border: 1px solid var(--km-border);
      background:
        linear-gradient(180deg, rgba(201, 168, 76, 0.05), transparent 22%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.015)),
        var(--km-surface);
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.2);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(201, 168, 76, 0.28) transparent;
    }

    .ss-slide::-webkit-scrollbar {
      width: 6px;
    }

    .ss-slide::-webkit-scrollbar-thumb {
      background: rgba(201, 168, 76, 0.24);
      border-radius: 999px;
    }

    .ss-slide--active {
      border-color: rgba(201, 168, 76, 0.28);
      box-shadow: 0 22px 54px rgba(0, 0, 0, 0.26), 0 0 0 1px rgba(201, 168, 76, 0.08);
    }

    .ss-slide__head {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 0.8rem;
      flex-wrap: wrap;
    }

    .ss-slide__meta {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
    }

    .ss-slide__seq,
    .ss-slide__ref,
    .ss-slide__type,
    .ss-slide__pattern,
    .ss-mini-chip {
      font-size: 0.72rem;
      line-height: 1.4;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 999px;
      padding: 0.28rem 0.72rem;
      border: 1px solid var(--km-border);
      background: rgba(255, 255, 255, 0.025);
      color: var(--km-text-2);
      white-space: nowrap;
    }

    .ss-slide__seq,
    .ss-slide__ref {
      color: var(--km-gold);
      font-family: var(--km-font-heading);
      opacity: 0.85;
    }

    .ss-slide__pattern {
      color: var(--km-gold);
      border-color: rgba(201, 168, 76, 0.22);
      background: rgba(201, 168, 76, 0.05);
      text-transform: none;
    }

    .ss-slide__full {
      margin: 0;
      font-family: var(--km-font-arabic, 'Scheherazade New', serif);
      font-size: clamp(1.45rem, 2.9vw, 2rem);
      line-height: 1.9;
      text-align: right;
      color: var(--km-text);
      unicode-bidi: plaintext;
    }

    .ss-slide__stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .ss-mini-chip {
      font-size: 0.66rem;
      color: var(--km-text-3);
      padding: 0.2rem 0.58rem;
    }

    .ss-flow {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }

    .ss-step {
      display: grid;
      grid-template-columns: 2.2rem minmax(0, 1fr);
      gap: 0.85rem;
      align-items: start;
      border: 1px solid var(--km-border);
      border-left: 3px solid rgba(150, 160, 180, 0.45);
      border-radius: 12px;
      padding: 0.9rem 0.95rem;
      background: rgba(255, 255, 255, 0.028);
    }

    .ss-step[data-tone="gold"] {
      border-left-color: var(--km-gold);
    }

    .ss-step[data-tone="amber"] {
      border-left-color: rgba(255, 190, 80, 0.78);
    }

    .ss-step[data-tone="cyan"] {
      border-left-color: rgba(80, 200, 220, 0.72);
    }

    .ss-step[data-tone="mint"] {
      border-left-color: rgba(90, 220, 150, 0.72);
    }

    .ss-step__rail {
      display: flex;
      justify-content: center;
    }

    .ss-step__n {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 50%;
      border: 1px solid rgba(201, 168, 76, 0.35);
      background: rgba(201, 168, 76, 0.07);
      color: var(--km-gold);
      font-size: 0.66rem;
      font-family: var(--km-font-heading);
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    .ss-step__body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.34rem;
    }

    .ss-step__eyebrow {
      display: flex;
      align-items: center;
      gap: 0.42rem;
      flex-wrap: wrap;
    }

    .ss-step__kind {
      font-size: 0.62rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--km-text-3);
      font-family: var(--km-font-heading);
    }

    .ss-step__pattern {
      font-size: 0.7rem;
      color: var(--km-text-2);
      padding: 0.15rem 0.46rem;
      border-radius: 999px;
      border: 1px solid var(--km-border);
      background: rgba(255, 255, 255, 0.025);
      letter-spacing: 0.03em;
    }

    .ss-step__title {
      margin: 0;
      font-size: 0.92rem;
      line-height: 1.42;
      color: var(--km-text);
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .ss-step__text,
    .ss-step__detail {
      margin: 0;
      font-size: 0.84rem;
      line-height: 1.62;
      color: var(--km-text-2);
    }

    .ss-step__text--arabic,
    .ss-step__detail--arabic {
      font-family: var(--km-font-arabic, 'Scheherazade New', serif);
      text-align: right;
      line-height: 1.9;
      unicode-bidi: plaintext;
    }

    .ss-step__text--arabic {
      font-size: 1.12rem;
      color: var(--km-text);
    }

    .ss-step__detail--arabic {
      font-size: 0.96rem;
    }

    .ss-step__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.1rem;
    }

    .ss-tag {
      font-size: 0.64rem;
      color: var(--km-text-3);
      padding: 0.18rem 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--km-border);
      background: rgba(255, 255, 255, 0.025);
      letter-spacing: 0.03em;
      white-space: nowrap;
    }

    .ss-slide__note {
      margin: 0;
      font-size: 0.74rem;
      color: var(--km-text-3);
      font-style: italic;
      line-height: 1.55;
    }

    .ss-slide__cue {
      margin: auto 0 0;
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--km-gold);
      opacity: 0.72;
      text-align: center;
      font-family: var(--km-font-heading);
    }

    .ss-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      flex-wrap: wrap;
    }

    .ss-nav {
      min-width: 7rem;
      padding: 0.55rem 0.95rem;
      border-radius: 999px;
      border: 1px solid var(--km-border);
      background: rgba(255, 255, 255, 0.03);
      color: var(--km-text);
      cursor: pointer;
      font-family: var(--km-font-heading);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
    }

    .ss-nav:hover:not(:disabled) {
      border-color: rgba(201, 168, 76, 0.35);
      color: var(--km-gold);
      background: rgba(201, 168, 76, 0.06);
    }

    .ss-nav:disabled {
      opacity: 0.42;
      cursor: default;
    }

    .ss-progress {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.42rem;
      flex-wrap: wrap;
      flex: 1;
    }

    .ss-dot {
      width: 0.7rem;
      height: 0.7rem;
      border: 0;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.18);
      cursor: pointer;
      transition: width 0.2s ease, background 0.2s ease, opacity 0.2s ease;
      opacity: 0.72;
    }

    .ss-dot--active {
      width: 1.7rem;
      background: var(--km-gold);
      opacity: 1;
    }

    .ss-hint {
      margin: 0;
      font-size: 0.76rem;
      color: var(--km-text-3);
      text-align: center;
      line-height: 1.55;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.7rem;
      padding: 4rem 1rem;
      text-align: center;
      color: var(--km-text-3);
    }

    .empty-state__icon {
      font-size: 2rem;
      opacity: 0.24;
    }

    .empty-state__title {
      margin: 0;
      font-size: 0.92rem;
      color: var(--km-text-2);
      font-style: italic;
    }

    .empty-state__detail {
      margin: 0;
      max-width: 34rem;
      font-size: 0.82rem;
      line-height: 1.6;
    }

    @media (max-width: 720px) {
      .ss-stage {
        height: calc(100svh - 12rem);
        min-height: 30rem;
      }

      .ss-slide {
        padding: 1.05rem;
      }

      .ss-step {
        grid-template-columns: 1fr;
        gap: 0.7rem;
      }

      .ss-step__rail {
        justify-content: flex-start;
      }

      .ss-controls {
        justify-content: center;
      }

      .ss-nav {
        min-width: 0;
      }
    }
  `],
})
export class LessonSentenceStructureTabComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef);
  private observer: ReturnType<typeof ScrollTrigger.observe> | null = null;
  private motionTimeout: ReturnType<typeof setTimeout> | null = null;
  private viewReady = false;
  private isAnimating = false;

  @Input({ required: true }) lesson!: StudyLessonResponse;

  activeSentenceIndex = 0;
  taskTitle = 'Sentence Structure';
  hasTaskPayload = false;
  sentences: SentenceVm[] = [];

  get derivedSentenceCount(): number {
    return this.sentences.filter((sentence) => sentence.stepsDerived).length;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('lesson' in changes) this.rebuild();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.queueSliderSetup();
  }

  ngOnDestroy(): void {
    if (this.motionTimeout) clearTimeout(this.motionTimeout);
    this.clearMotion();
  }

  canGoPrevious(): boolean {
    return this.activeSentenceIndex > 0;
  }

  canGoNext(): boolean {
    return this.activeSentenceIndex < this.sentences.length - 1;
  }

  previousSentence(): void {
    this.goToRelative(-1);
  }

  nextSentence(): void {
    this.goToRelative(1);
  }

  goToSentence(index: number): void {
    const slides = this.slideEls();
    if (!slides.length || index < 0 || index >= slides.length || index === this.activeSentenceIndex || this.isAnimating) {
      return;
    }

    const current = slides[this.activeSentenceIndex];
    const next = slides[index];
    if (!current || !next) return;

    this.isAnimating = true;
    next.scrollTop = 0;

    const direction = index > this.activeSentenceIndex ? 1 : -1;
    const nextItems = Array.from(next.querySelectorAll<HTMLElement>('.ss-animate'));

    gsap.killTweensOf([current, next, ...nextItems]);
    gsap.set(next, {
      autoAlpha: 1,
      yPercent: direction > 0 ? 100 : -100,
      zIndex: 2,
      pointerEvents: 'none',
    });
    gsap.set(current, {
      autoAlpha: 1,
      yPercent: 0,
      zIndex: 1,
      pointerEvents: 'none',
    });
    gsap.set(nextItems, { autoAlpha: 0, y: 16 });

    gsap.timeline({
      defaults: { duration: 0.56, ease: 'power3.inOut' },
      onComplete: () => {
        this.activeSentenceIndex = index;
        this.isAnimating = false;
        this.syncSlides();
        this.animateSlideContent(index);
      },
    })
      .to(current, {
        yPercent: direction > 0 ? -100 : 100,
        autoAlpha: 0,
      }, 0)
      .to(next, {
        yPercent: 0,
        autoAlpha: 1,
      }, 0);
  }

  isArabic(value: string): boolean {
    return ARABIC_SCRIPT_RE.test(value ?? '');
  }

  dirFor(value: string): 'rtl' | 'ltr' | null {
    const text = String(value ?? '').trim();
    if (!text) return null;
    return this.isArabic(text) ? 'rtl' : 'ltr';
  }

  private goToRelative(delta: number): void {
    this.goToSentence(this.activeSentenceIndex + delta);
  }

  private rebuild(): void {
    const task = this.task();
    this.taskTitle = task?.task_name?.trim() || 'Sentence Structure';
    this.hasTaskPayload = !!task?.task_json;
    this.activeSentenceIndex = 0;
    this.sentences = [];

    if (!task?.task_json) {
      this.queueSliderSetup();
      return;
    }

    const payload = this.parseJson(task.task_json);
    const items = Array.isArray(payload?.['items']) ? payload['items'] as unknown[] : [];
    this.sentences = items
      .map((raw, index) => this.toSentence(raw, index))
      .filter((sentence): sentence is SentenceVm => sentence != null)
      .sort((a, b) => a.order - b.order);

    this.queueSliderSetup();
  }

  private queueSliderSetup(): void {
    if (!this.viewReady) return;
    if (this.motionTimeout) clearTimeout(this.motionTimeout);
    this.motionTimeout = setTimeout(() => this.setupSlider(), 560);
  }

  private setupSlider(): void {
    this.motionTimeout = null;
    this.clearMotion();

    const slides = this.slideEls();
    if (!slides.length) return;

    this.syncSlides();

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const stage = this.stageEl();
    if (!stage) return;

    this.observer = ScrollTrigger.observe({
      target: stage,
      type: 'wheel,touch',
      tolerance: 18,
      preventDefault: true,
      allowClicks: true,
      ignoreCheck: (event, isTouchOrPointer) => this.allowNativeSlideScroll(event, isTouchOrPointer),
      onChangeY: (self) => {
        if (this.isAnimating) return;
        if (self.deltaY > 0) this.nextSentence();
        if (self.deltaY < 0) this.previousSentence();
      },
    });

    this.animateSlideContent(this.activeSentenceIndex);
  }

  private allowNativeSlideScroll(event: Event, isTouchOrPointer: boolean): boolean {
    if (isTouchOrPointer) return false;

    const slide = this.activeSlideEl();
    if (!slide || slide.scrollHeight <= slide.clientHeight + 2) return false;
    if (!(event instanceof WheelEvent)) return false;

    const atTop = slide.scrollTop <= 2;
    const atBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 2;

    if (event.deltaY > 0 && !atBottom) return true;
    if (event.deltaY < 0 && !atTop) return true;
    return false;
  }

  private animateSlideContent(index: number): void {
    const slide = this.slideEls()[index];
    if (!slide) return;

    const items = Array.from(slide.querySelectorAll<HTMLElement>('.ss-animate'));
    if (!items.length) return;

    gsap.killTweensOf(items);
    gsap.fromTo(
      items,
      { autoAlpha: 0, y: 16 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.42,
        stagger: 0.06,
        ease: 'power2.out',
        clearProps: 'transform',
      },
    );
  }

  private syncSlides(): void {
    const slides = this.slideEls();
    slides.forEach((slide, index) => {
      const isActive = index === this.activeSentenceIndex;
      slide.classList.toggle('ss-slide--active', isActive);
      if (!isActive) slide.scrollTop = 0;
      gsap.set(slide, {
        autoAlpha: isActive ? 1 : 0,
        yPercent: isActive ? 0 : index < this.activeSentenceIndex ? -100 : 100,
        zIndex: isActive ? 2 : 1,
        pointerEvents: isActive ? 'auto' : 'none',
      });
    });
  }

  private clearMotion(): void {
    this.observer?.kill();
    this.observer = null;
    this.isAnimating = false;

    const root = this.host.nativeElement as HTMLElement;
    const animatedNodes = root.querySelectorAll('.ss-slide, .ss-animate');
    gsap.killTweensOf(animatedNodes);
    gsap.set(animatedNodes, { clearProps: 'all' });
  }

  private stageEl(): HTMLElement | null {
    const root = this.host.nativeElement as HTMLElement;
    return root.querySelector('.ss-stage') as HTMLElement | null;
  }

  private activeSlideEl(): HTMLElement | null {
    return this.slideEls()[this.activeSentenceIndex] ?? null;
  }

  private slideEls(): HTMLElement[] {
    const root = this.host.nativeElement as HTMLElement;
    return Array.from(root.querySelectorAll('.ss-slide')) as HTMLElement[];
  }

  private task(): UnitTaskVm | null {
    return this.lesson?.tasks?.find((entry) => entry.task_type === 'sentence_structure') ?? null;
  }

  private toSentence(raw: unknown, index: number): SentenceVm | null {
    const record = this.record(raw);
    if (!record) return null;

    const summary = this.record(record['structure_summary']) ?? {};
    const order = this.toNumber(record['sentence_order'], index + 1);
    const ayah = this.lesson?.ayahs?.[index];
    const refAyah = ayah?.ayah ?? (this.lesson?.unit?.ayah_from ? this.lesson.unit.ayah_from + index : order);
    const ref = `${this.lesson?.surahId ?? ''}:${refAyah}`;
    const sentenceType = this.firstText(summary, ['sentence_type']) || 'Sentence';
    const fullText = this.firstText(summary, ['full_text'])
      || this.firstText(record, ['canonical_sentence', 'text_norm']);
    const corePattern = this.firstText(summary, ['core_pattern']);
    const mainComponents = this.toSegments(summary['main_components'], 'main');
    const expansions = this.toSegments(summary['expansions'], 'expansion');
    const explicitSteps = this.toExplicitSteps(record['steps']);
    const stepsDerived = explicitSteps.length === 0;
    const steps = stepsDerived
      ? this.deriveSteps(sentenceType, fullText, corePattern, mainComponents, expansions)
      : explicitSteps;

    return {
      id: `sentence_${order}`,
      order,
      ref,
      sentenceType,
      corePattern,
      fullText,
      mainComponents,
      expansions,
      steps,
      stepsDerived,
    };
  }

  private toSegments(raw: unknown, kind: 'main' | 'expansion'): SentenceSegmentVm[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry, index) => {
        const record = this.record(entry) ?? {};
        const label = this.toReadableLabel(this.firstText(record, ['component', 'type', 'label'])) || `${kind === 'main' ? 'Component' : 'Expansion'} ${index + 1}`;
        const text = this.firstText(record, ['text', 'phrase', 'value']);
        const detail = this.firstText(record, ['role', 'function', 'description', 'explanation']);
        const pattern = this.firstText(record, ['pattern']);
        const grammar = this.stringArray(record['grammar']).map((tag) => this.toReadableLabel(tag));
        if (!text && !detail && !pattern) return null;
        return {
          id: `${kind}_${index + 1}_${label.toLowerCase().replace(/[^a-z0-9_-]+/g, '_')}`,
          label,
          text,
          detail,
          pattern,
          grammar,
          tone: this.toneFor(label, index, kind === 'expansion'),
        };
      })
      .filter((segment): segment is SentenceSegmentVm => segment != null);
  }

  private toExplicitSteps(raw: unknown): SentenceStepVm[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry, index) => {
        const record = this.record(entry) ?? {};
        const title = this.toReadableLabel(this.firstText(record, ['title', 'label', 'component', 'type', 'step']));
        const text = this.firstText(record, ['text', 'phrase', 'value']);
        const detail = this.firstText(record, ['detail', 'description', 'explanation', 'role', 'function']);
        const pattern = this.firstText(record, ['pattern']);
        const grammar = [
          ...this.stringArray(record['grammar']),
          ...this.stringArray(record['tags']),
        ].map((tag) => this.toReadableLabel(tag));
        if (!title && !text && !detail) return null;
        const kind = this.stepKind(this.firstText(record, ['kind', 'phase', 'section']));
        return {
          id: `step_${index + 1}`,
          order: index + 1,
          kind,
          kindLabel: this.kindLabel(kind),
          title: title || `${this.kindLabel(kind)} ${index + 1}`,
          text,
          detail,
          pattern,
          grammar,
          tone: this.toneFor(title || detail || text, index, kind === 'expansion'),
        };
      })
      .filter((step): step is SentenceStepVm => step != null);
  }

  private deriveSteps(
    sentenceType: string,
    fullText: string,
    corePattern: string,
    mainComponents: SentenceSegmentVm[],
    expansions: SentenceSegmentVm[],
  ): SentenceStepVm[] {
    const steps: SentenceStepVm[] = [{
      id: 'frame',
      order: 1,
      kind: 'frame',
      kindLabel: this.kindLabel('frame'),
      title: sentenceType || 'Sentence Frame',
      text: fullText,
      detail: 'Start with the full clause, then unpack the core structure before reading the attached phrases.',
      pattern: corePattern,
      grammar: [],
      tone: 'gold',
    }];

    for (const segment of mainComponents) {
      steps.push({
        id: `main_${segment.id}`,
        order: steps.length + 1,
        kind: 'main',
        kindLabel: this.kindLabel('main'),
        title: segment.label,
        text: segment.text,
        detail: segment.detail || 'Key part of the sentence frame.',
        pattern: segment.pattern,
        grammar: segment.grammar,
        tone: segment.tone,
      });
    }

    for (const segment of expansions) {
      steps.push({
        id: `exp_${segment.id}`,
        order: steps.length + 1,
        kind: 'expansion',
        kindLabel: this.kindLabel('expansion'),
        title: segment.label,
        text: segment.text,
        detail: segment.detail || 'Supporting phrase that clarifies or extends the main structure.',
        pattern: segment.pattern,
        grammar: segment.grammar,
        tone: segment.tone,
      });
    }

    return steps;
  }

  private kindLabel(kind: SentenceStepKind): string {
    if (kind === 'main') return 'Main Component';
    if (kind === 'expansion') return 'Expansion';
    return 'Sentence Frame';
  }

  private stepKind(value: string): SentenceStepKind {
    const normalized = value.toLowerCase();
    if (normalized.includes('expand')) return 'expansion';
    if (normalized.includes('main') || normalized.includes('component')) return 'main';
    return 'frame';
  }

  private toneFor(value: string, index: number, isExpansion = false): SentenceTone {
    const normalized = value.toLowerCase();
    if (normalized.includes('main')) return 'gold';
    if (normalized.includes('cause') || normalized.includes('reason') || normalized.includes('result')) return 'amber';
    if (normalized.includes('clarif') || normalized.includes('apposition') || normalized.includes('relative')) return 'cyan';
    if (normalized.includes('circumstantial') || normalized.includes('khabar') || normalized.includes('laʿalla')) return 'mint';
    if (normalized.includes('idafa') || normalized.includes('adjective') || normalized.includes('preposition')) return 'cyan';
    return isExpansion ? 'slate' : index === 0 ? 'gold' : 'slate';
  }

  private parseJson(raw: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }

  private record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private firstText(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value
          .map((entry) => String(entry ?? '').trim())
          .filter((entry) => entry.length > 0)
      : [];
  }

  private toReadableLabel(value: string): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (this.isArabic(raw)) return raw;
    const spaced = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const lower = spaced.toLowerCase();
    return lower.replace(/(^|[\s/])([a-z])/g, (_match, prefix: string, chr: string) => `${prefix}${chr.toUpperCase()}`);
  }

  private toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}

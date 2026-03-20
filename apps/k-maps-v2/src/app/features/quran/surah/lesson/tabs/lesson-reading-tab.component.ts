import {
  Component, Input, signal, inject,
  ElementRef, AfterViewInit, OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { StudyLessonResponse, AyahVm } from '../../../../../shared/services/surah-modules.service';

gsap.registerPlugin(ScrollTrigger);

// Arabic diacritic codepoints (harakat + Quranic marks)
const DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;
// End-of-ayah marker + any following Arabic-Indic digits
const END_MARKER_RE = /\u06DD[\u0660-\u0669]*/g;

@Component({
  selector: 'km-lesson-reading-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rt">

      <!-- ── Task card ────────────────────────────────────── -->
      @if (readingTask()) {
        <div class="rt-task">
          <span class="rt-task__label">{{ readingTask()!.task_name ?? 'Reading Task' }}</span>
          @if (taskHtml()) {
            <div class="rt-task__body" [innerHTML]="taskHtml()"></div>
          }
        </div>
      }

      <!-- ── Controls ─────────────────────────────────────── -->
      <div class="rt-controls">
        <span class="rt-controls__info">
          Passage · Ayah {{ lesson.ayahs[0]?.ayah }}–{{ lesson.ayahs[lesson.ayahs.length - 1]?.ayah }}
        </span>
        <button
          class="rt-tashkeel"
          [class.rt-tashkeel--on]="showDiacritics()"
          (click)="showDiacritics.set(!showDiacritics())"
          [title]="showDiacritics() ? 'Hide tashkeel' : 'Show tashkeel'">
          <span class="rt-tashkeel__icon" aria-hidden="true">
            {{ showDiacritics() ? 'تَشْكِيل' : 'تشكيل' }}
          </span>
          <span class="rt-tashkeel__dot"></span>
        </button>
      </div>

      <!-- ── Ayah flow ─────────────────────────────────────── -->
      <div class="rt-flow" #flowEl>
        @for (ayah of lesson.ayahs; track ayah.ayah) {
          <div class="rt-ayah" #ayahEl>
            <div class="rt-ayah__body" dir="rtl">
              <span class="rt-ayah__text">{{ displayText(ayah) }}</span>
              <span class="rt-ayah__marker">{{ toArabicIndic(ayah.ayah) }}</span>
            </div>
          </div>
        }
      </div>

      @if (lesson.ayahs.length === 0) {
        <p class="rt-empty">No ayahs found for this passage.</p>
      }

    </div>
  `,
  styles: [`
    /* ── Shell ──────────────────────────────────────────── */
    .rt {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* ── Task card ─────────────────────────────────────── */
    .rt-task {
      background: var(--km-surface);
      border: 1px solid var(--km-border-gold);
      border-radius: 10px;
      padding: 1.1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .rt-task__label {
      font-size: 0.68rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--km-gold);
      opacity: 0.75;
      font-family: var(--km-font-heading);
    }
    .rt-task__body {
      font-size: 0.875rem;
      color: var(--km-text-2);
      line-height: 1.65;
    }

    /* ── Controls row ──────────────────────────────────── */
    .rt-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--km-border);
    }
    .rt-controls__info {
      font-family: var(--km-font-heading);
      font-size: 0.68rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--km-text-3);
    }

    /* ── Tashkeel toggle ───────────────────────────────── */
    .rt-tashkeel {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: 1px solid var(--km-border);
      border-radius: 999px;
      padding: 0.35rem 0.85rem;
      cursor: pointer;
      transition: border-color 0.25s, background 0.25s;
    }
    .rt-tashkeel:hover {
      border-color: var(--km-border-gold);
    }
    .rt-tashkeel--on {
      border-color: rgba(201,168,76,0.5);
      background: rgba(201,168,76,0.05);
    }
    .rt-tashkeel__icon {
      font-family: var(--km-font-arabic, 'Scheherazade New', serif);
      font-size: 0.9rem;
      color: var(--km-gold);
      direction: rtl;
      line-height: 1;
    }
    .rt-tashkeel__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--km-border);
      transition: background 0.25s;
    }
    .rt-tashkeel--on .rt-tashkeel__dot {
      background: var(--km-gold);
      box-shadow: 0 0 6px rgba(201,168,76,0.5);
    }

    /* ── Ayah flow ─────────────────────────────────────── */
    .rt-flow {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .rt-ayah {
      padding: 1.75rem 0;
      border-bottom: 1px solid var(--km-border);
      /* GSAP sets opacity=0 initially via JS */
    }
    .rt-ayah:last-child {
      border-bottom: none;
    }

    .rt-ayah__body {
      font-family: var(--km-font-arabic, 'Scheherazade New', serif);
      font-size: clamp(1.7rem, 3.2vw, 2.6rem);
      line-height: 2.8;
      direction: rtl;
      text-align: justify;
      text-justify: inter-word;
      color: var(--km-text);
      overflow-wrap: normal;
      word-break: keep-all;
    }

    /* ── Verse marker circle ───────────────────────────── */
    .rt-ayah__marker {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2em;
      height: 2em;
      border-radius: 50%;
      border: 1.5px solid var(--km-gold);
      background: transparent;
      font-family: var(--km-font-heading);
      font-size: 0.42em;
      color: var(--km-gold);
      vertical-align: middle;
      margin: 0 0.4em;
      user-select: none;
      letter-spacing: 0;
      flex-shrink: 0;
    }

    /* ── Empty ─────────────────────────────────────────── */
    .rt-empty {
      color: var(--km-text-3);
      font-size: 0.875rem;
      text-align: center;
      padding: 2rem;
      font-style: italic;
    }
  `],
})
export class LessonReadingTabComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  private elRef = inject(ElementRef);

  showDiacritics = signal(false);

  private scrollTriggers: ScrollTrigger[] = [];

  // ── Lifecycle ───────────────────────────────────────────

  ngAfterViewInit(): void {
    // Set initial opacity=0 on all ayah blocks, then ScrollTrigger reveals each
    setTimeout(() => this.setupScrollAnimations(), 50);
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
    this.scrollTriggers = [];
  }

  // ── Scroll animations ────────────────────────────────────

  private setupScrollAnimations(): void {
    const ayahEls = this.elRef.nativeElement.querySelectorAll<HTMLElement>('.rt-ayah');
    if (!ayahEls.length) return;

    ayahEls.forEach((el: HTMLElement) => {
      // Set to invisible before scroll reveal
      gsap.set(el, { opacity: 0, y: 28 });

      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        onEnter: () => {
          gsap.to(el, {
            opacity: 1, y: 0,
            duration: 0.6,
            ease: 'power2.out',
          });
        },
        onLeaveBack: () => {
          gsap.set(el, { opacity: 0, y: 28 });
        },
      });

      this.scrollTriggers.push(st);
    });
  }

  // ── Text processing ───────────────────────────────────────

  displayText(ayah: AyahVm): string {
    if (!this.showDiacritics()) {
      // Prefer text_simple (pre-stripped by API), otherwise strip inline
      const base = ayah.text_simple ?? ayah.text ?? '';
      return this.clean(base.replace(DIACRITICS_RE, ''));
    }
    return this.clean(ayah.text ?? '');
  }

  /** Remove end-of-ayah U+06DD markers (we render our own circles) */
  private clean(text: string): string {
    return text.replace(END_MARKER_RE, '').trim();
  }

  toArabicIndic(n: number): string {
    return n.toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  // ── Task helpers ─────────────────────────────────────────

  readingTask() {
    return this.lesson.tasks.find(t => t.task_type === 'reading') ?? null;
  }

  taskHtml(): string | null {
    const task = this.readingTask();
    if (!task?.task_json) return null;
    try {
      const parsed = JSON.parse(task.task_json);
      return parsed.content ?? parsed.text ?? null;
    } catch { return null; }
  }
}

import {
  Component, Input, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { StudyLessonResponse, AyahVm, AyahWordToken } from '../../../../../shared/services/surah-modules.service';

// Arabic diacritic codepoints (harakat + Quranic marks) — fallback stripping
const DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;
// Quranic structural ornament characters we always strip (we render our own markers):
//   U+06DD = Arabic End of Ayah       (ornamental circle with ayah number)
//   U+06DE = Arabic Start of Rub El Hizb (large ornamental circle, quarter-division marker)
const END_MARKER_RE = /[\u06DD\u06DE][\u0660-\u0669]*/g;
// Arabic-Indic digit-only tokens (٠١٢٣٤٥٦٧٨٩) — ayah numbers embedded in text without U+06DD prefix
const ARABIC_INDIC_ONLY_RE = /^[\u0660-\u0669]+$/;

@Component({
  selector: 'km-lesson-reading-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rt">

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

      <!-- ── Continuous mushaf flow ────────────────────────── -->
      @if (lesson.ayahs.length > 0) {
        <div class="rt-passage" #passageEl dir="rtl">

          @for (ayah of lesson.ayahs; track ayah.ayah) {

            @if (hasWordTokens(ayah)) {
              <!-- Word-by-word from DB token array (U+06DD stripped in wordText()) -->
              @for (word of wordTokens(ayah); track word.position) {
                <span class="ar-word">{{ wordText(word) }}</span>
              }
            } @else {
              <!-- Fallback: split full text -->
              @for (word of splitWords(ayah); track $index) {
                <span class="ar-word">{{ word }}</span>
              }
            }

            <!-- Inline verse marker circle after each ayah's last word -->
            <span class="verse-marker">{{ toArabicIndic(ayah.ayah) }}</span>

          }

        </div>
      } @else {
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
    .rt-tashkeel:hover { border-color: var(--km-border-gold); }
    .rt-tashkeel--on {
      border-color: rgba(201,168,76,0.5);
      background: rgba(201,168,76,0.05);
    }
    .rt-tashkeel__icon {
      font-family: var(--km-font-arabic, 'Scheherazade New', serif);
      font-size: 1rem;
      color: var(--km-gold);
      direction: rtl;
      line-height: 1;
      letter-spacing: 0;
    }
    .rt-tashkeel__dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--km-border);
      transition: background 0.25s;
    }
    .rt-tashkeel--on .rt-tashkeel__dot {
      background: var(--km-gold);
      box-shadow: 0 0 6px rgba(201,168,76,0.5);
    }

    /* ── Continuous passage block ──────────────────────── */
    .rt-passage {
      font-family: var(--km-font-arabic, 'Scheherazade New', serif);
      font-size: clamp(1.6rem, 3vw, 2.5rem);
      line-height: 2.9;
      direction: rtl;
      text-align: justify;
      text-justify: inter-word;
      color: var(--km-text);
      overflow-wrap: normal;
      word-break: keep-all;
      /* GSAP sets opacity=0 initially */
    }

    /* ── Individual word spans ─────────────────────────── */
    .ar-word {
      display: inline;
      cursor: pointer;
      transition: color 0.18s ease;

      &::after {
        content: '\\0020';
      }

      &:hover {
        color: var(--km-gold);
      }
    }

    /* ── Inline verse marker ───────────────────────────── */
    .verse-marker {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.2em;
      height: 2.2em;
      border-radius: 50%;
      border: 1px solid rgba(201,168,76,0.85);
      outline: 1.5px solid rgba(201,168,76,0.25);
      outline-offset: 2px;
      box-shadow: 0 0 8px rgba(201,168,76,0.15), inset 0 0 4px rgba(201,168,76,0.06);
      background: transparent;
      font-family: var(--km-font-heading);
      font-size: 0.4em;
      color: var(--km-gold);
      vertical-align: middle;
      margin: 0 0.45em;
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
export class LessonReadingTabComponent {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  showDiacritics = signal(false);

  // ── Word token helpers ────────────────────────────────────

  hasWordTokens(ayah: AyahVm): boolean {
    return Array.isArray(ayah.words) && ayah.words.length > 0;
  }

  wordTokens(ayah: AyahVm): AyahWordToken[] {
    return (ayah.words ?? []).filter(w => {
      if (w.char_type === 'end') return false;
      const display = (w.text || w.simple || '').replace(END_MARKER_RE, '').trim();
      if (!display) return false;
      if (ARABIC_INDIC_ONLY_RE.test(display)) return false; // bare ayah-number digit
      return true;
    });
  }

  /** Get the display text for a single word token — always strip U+06DD */
  wordText(word: AyahWordToken): string {
    const raw = (this.showDiacritics() ? word.text : word.simple) ?? '';
    return raw.replace(END_MARKER_RE, '').trim();
  }

  splitWords(ayah: AyahVm): string[] {
    let src = (ayah.text ?? '').replace(END_MARKER_RE, '');
    if (!this.showDiacritics()) {
      src = ayah.text_simple
        ? ayah.text_simple.replace(END_MARKER_RE, '')
        : src.replace(DIACRITICS_RE, '');
    }
    return src
      .split(/\s+/)
      .filter(w => w.length > 0)
      .filter(w => !ARABIC_INDIC_ONLY_RE.test(w)); // drop bare ayah-number digits
  }

  toArabicIndic(n: number): string {
    return n.toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }
}

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

/**
 * Unified Quranic verse renderer used outside the full Mushaf reader.
 *
 *   variant="header"  → centered Uthmani band (used as verse text above
 *                       tafsir/irab entries)
 *   variant="modal"   → larger verse block for the ayah-preview modal
 *   variant="compact" → small Latin-script "S:A" pill for inline ref chrome
 *
 * The Quran reader itself (apps/app-k-maps/.../reader/al-quran.component)
 * intentionally bypasses this component because it uses dynamic QPC-V2
 * per-page fonts and gesture handling. Everything else that displays a
 * Quranic verse should use this so font, brackets, and density stay aligned.
 */
@Component({
  selector: 'km-verse-display',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="km-verse"
         [class.km-verse--header]="variant === 'header'"
         [class.km-verse--modal]="variant === 'modal'"
         [class.km-verse--compact]="variant === 'compact'"
         dir="rtl">

      @if (variant !== 'compact' && (surah || ayah)) {
        <header class="km-verse__head">
          <span class="km-verse__ref">
            <span class="km-verse__bracket">﴿</span>{{ surah }}:{{ ayah }}<span class="km-verse__bracket">﴾</span>
          </span>
          @if (pageNumber) { <span class="km-verse__page">ص {{ pageNumber }}</span> }
        </header>
      }

      @if (variant === 'compact') {
        <button class="km-verse__compact-ref" type="button"
                [attr.aria-label]="'الآية ' + surah + ':' + ayah"
                (click)="onCompactTap($event)">
          <span class="km-verse__bracket">﴿</span><span
            class="km-verse__num">{{ surah }}</span><span
            class="km-verse__sep">:</span><span
            class="km-verse__num">{{ ayah }}</span><span
            class="km-verse__bracket">﴾</span>
        </button>
      } @else {
        <p class="km-verse__ar" lang="ar">{{ text }}</p>
        @if (translation && showTranslation) {
          <p class="km-verse__en" dir="ltr">{{ translation }}</p>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .km-verse {
      font-family: var(--km-font-arabic-ui, 'Noto Naskh Arabic', 'Amiri', serif);
      color: #f5f1e7;
    }

    // ── variant: header ──────────────────────────────────────────────
    // Centered Uthmani band used as a "you are reading this verse" header
    // inside tafsir / irab detail views.
    .km-verse--header {
      padding: 1.1rem 1.2rem 0.9rem;
      border-bottom: 1px solid rgba(201, 168, 76, 0.12);
      background: rgba(201, 168, 76, 0.035);
      text-align: center;

      .km-verse__head { justify-content: center; margin-bottom: 0.55rem; }
      .km-verse__ar {
        margin: 0;
        font-family: 'Amiri', 'Noto Naskh Arabic', serif;
        font-size: 1.45rem;
        line-height: 2.05;
        color: #f5f0de;
        letter-spacing: 0.01em;
      }
    }

    // ── variant: modal ───────────────────────────────────────────────
    // Used inside the ayah-preview bottom sheet.
    .km-verse--modal {
      padding: 0.5rem 0 0.6rem;

      .km-verse__ar {
        margin: 0 0 0.75rem;
        font-family: 'Amiri', 'Noto Naskh Arabic', serif;
        font-size: 1.36rem;
        line-height: 2.0;
        text-align: right;
        color: #f5f1e7;
      }
      .km-verse__en {
        margin: 0;
        color: rgba(245, 241, 231, 0.62);
        font-family: 'EB Garamond', 'Times New Roman', serif;
        font-size: 0.92rem;
        line-height: 1.65;
      }
    }

    // ── variant: compact ─────────────────────────────────────────────
    // Inline ref chip (alternative to <km-qref-pill>).
    .km-verse--compact { display: inline; }
    .km-verse__compact-ref {
      appearance: none;
      display: inline-flex;
      align-items: baseline;
      color: var(--quran, #a9d28a);
      font-weight: 600;
      padding: 1px 6px;
      margin: 0 2px;
      border: 1px solid rgba(169, 210, 138, 0.32);
      border-radius: 6px;
      background: rgba(169, 210, 138, 0.05);
      cursor: pointer;
      font-variant-numeric: tabular-nums;
      transition: background 0.15s, border-color 0.15s, transform 0.12s;
      &:active {
        background: rgba(169, 210, 138, 0.15);
        border-color: rgba(169, 210, 138, 0.55);
        transform: scale(0.97);
      }
    }
    .km-verse__num { font-family: 'EB Garamond', 'Times New Roman', serif; font-size: 0.95em; }
    .km-verse__sep { opacity: 0.65; margin: 0 1px; }
    .km-verse__bracket {
      font-family: var(--km-font-arabic-ui, 'Noto Naskh Arabic', 'Amiri', serif);
      color: var(--quran, #a9d28a);
      opacity: 0.85;
      font-size: 1.05em;
      margin: 0 1px;
    }

    // ── Shared head ───────────────────────────────────────────────────
    .km-verse__head {
      display: flex;
      align-items: baseline;
      gap: 0.55rem;
      padding-bottom: 0.35rem;
    }
    .km-verse__ref {
      color: var(--quran, #a9d28a);
      font-family: 'EB Garamond', serif;
      font-size: 0.95rem;
      font-weight: 700;
      padding: 1px 8px;
      border: 1px solid rgba(169, 210, 138, 0.32);
      border-radius: 999px;
      font-variant-numeric: tabular-nums;
    }
    .km-verse__page {
      margin-inline-start: auto;
      color: rgba(245, 241, 231, 0.42);
      font-size: 0.72rem;
    }
  `],
})
export class VerseDisplayComponent {
  /** Verse text (Uthmani / Imla'i). */
  @Input() text: string | null = null;
  /** Optional English/locale translation shown under Arabic. */
  @Input() translation: string | null = null;
  /** Surah number 1..114 */
  @Input() surah: number | null = null;
  /** Ayah number within the surah */
  @Input() ayah: number | null = null;
  /** Mushaf page number, shown as `ص NNN` when present */
  @Input() pageNumber: number | null = null;
  /** Visual variant — see component doc above */
  @Input() variant: 'header' | 'modal' | 'compact' = 'modal';
  /** Whether to show the translation when present */
  @Input() showTranslation = true;
  @Output() refTapped = new EventEmitter<{ surah: number; ayah: number }>();

  onCompactTap(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.surah && this.ayah) this.refTapped.emit({ surah: this.surah, ayah: this.ayah });
  }
}

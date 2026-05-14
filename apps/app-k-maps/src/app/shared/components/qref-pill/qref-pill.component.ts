import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Inline Quran reference chip — Mushaf ornate parens ﴿﴾ frame the
 * surah:ayah pair so the affordance reads as "this is a Quran citation
 * you can tap to preview." Used in lexicon, tafsir, and irab readers.
 *
 * Bracket glyphs are U+FD3E / U+FD3F (Arabic Presentation Forms). They
 * MUST render in a Naskh font (Amiri / Noto Naskh) or they fall back to
 * ASCII '[]'. The wrapping page should set `--km-font-arabic-ui` to a
 * Naskh stack; we inherit it.
 */
@Component({
  selector: 'km-qref-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="km-qref-pill"
            type="button"
            [attr.aria-label]="'الآية ' + surah + ':' + ayah"
            (click)="onClick($event)">
      <span class="km-qref-pill__bracket">﴿</span><span
        class="km-qref-pill__surah">{{ surah }}</span><span
        class="km-qref-pill__sep">:</span><span
        class="km-qref-pill__ayah">{{ ayah }}</span><span
        class="km-qref-pill__bracket">﴾</span>
    </button>
  `,
  styles: [`
    :host {
      display: inline;
      unicode-bidi: isolate;
    }
    .km-qref-pill {
      appearance: none;
      display: inline-flex;
      align-items: baseline;
      gap: 0;
      color: var(--quran, #a9d28a);
      font-weight: 600;
      padding: 1px 6px;
      margin: 0 2px;
      border: 1px solid rgba(169, 210, 138, 0.32);
      border-radius: 6px;
      background: rgba(169, 210, 138, 0.05);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      transition: background 0.15s, border-color 0.15s, transform 0.12s;
      min-height: 22px;
      &:active {
        background: rgba(169, 210, 138, 0.15);
        border-color: rgba(169, 210, 138, 0.55);
        transform: scale(0.97);
      }
    }
    .km-qref-pill__bracket {
      font-family: var(--km-font-arabic-ui, 'Noto Naskh Arabic', 'Amiri', serif);
      color: var(--quran, #a9d28a);
      opacity: 0.85;
      font-size: 1.05em;
      margin: 0 1px;
    }
    .km-qref-pill__surah,
    .km-qref-pill__ayah,
    .km-qref-pill__sep {
      font-family: 'EB Garamond', 'Times New Roman', serif;
      font-size: 0.95em;
    }
    .km-qref-pill__sep { opacity: 0.65; margin: 0 1px; }
  `],
})
export class QrefPillComponent {
  @Input({ required: true }) surah!: number;
  @Input({ required: true }) ayah!: number;
  @Output() refTapped = new EventEmitter<{ surah: number; ayah: number }>();

  onClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.refTapped.emit({ surah: this.surah, ayah: this.ayah });
  }
}

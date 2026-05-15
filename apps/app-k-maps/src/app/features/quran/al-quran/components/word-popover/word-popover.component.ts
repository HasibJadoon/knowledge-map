import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, PopoverController } from '@ionic/angular';
import { QuranPageWord } from '../../../../../shared/models/quran/quran-reader.model';

/**
 * Word-tap morphology popover. Receives a `QuranPageWord` (already
 * delivered as part of the mushaf page payload) and surfaces its root,
 * lemma, translation, and contextual actions:
 *
 *   • Open root in the Mu'jam (lexicon reader at the matching slug)
 *   • Open the containing verse in tafsir
 *   • Copy word text + reference
 *
 * Rendered via ion-popover; the host component decides anchoring and
 * dismissal. Emits action events the host wires to its router/clipboard.
 */
@Component({
  selector: 'km-word-popover',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wp">
      <header class="wp__head">
        <span class="wp__text" lang="ar" dir="rtl">{{ word.text }}</span>
        <span class="wp__ref">{{ word.surah }}:{{ word.ayah }}<span class="wp__pos">·{{ word.position }}</span></span>
      </header>

      <dl class="wp__grid">
        @if (word.root) {
          <dt>Root</dt>
          <dd class="wp__val wp__val--ar" dir="rtl">{{ word.root }}</dd>
        }
        @if (word.lemma) {
          <dt>Lemma</dt>
          <dd class="wp__val wp__val--ar" dir="rtl">{{ word.lemma }}</dd>
        }
        @if (word.simple && word.simple !== word.text) {
          <dt>Simple</dt>
          <dd class="wp__val wp__val--ar" dir="rtl">{{ word.simple }}</dd>
        }
        @if (word.translation) {
          <dt>Meaning</dt>
          <dd class="wp__val wp__val--en">{{ word.translation }}</dd>
        }
        @if (!hasAnyData()) {
          <dt class="wp__missing">No morphological data</dt>
          <dd></dd>
        }
      </dl>

      <div class="wp__actions">
        <ion-button class="wp__btn" fill="clear" size="small"
                    (click)="emitOpenRoot()">
          <ion-icon slot="start" name="library-outline" />
          Open in Lexicon{{ word.root ? ' · ' + word.root : '' }}
        </ion-button>
        <ion-button class="wp__btn" fill="clear" size="small"
                    (click)="emitOpenTafsir()">
          <ion-icon slot="start" name="reader-outline" />
          Open verse in Tafseer
        </ion-button>
        <ion-button class="wp__btn" fill="clear" size="small"
                    (click)="emitCopy()">
          <ion-icon slot="start" name="copy-outline" />
          Copy
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --background: #0b0a08;
      background: var(--background);
      color: #f5f1e7;
      max-width: 320px;
    }
    .wp {
      padding: 0.55rem 0.75rem 0.4rem;
      font-family: var(--km-font-arabic-ui, 'Noto Naskh Arabic', serif);
    }
    .wp__head {
      display: flex;
      align-items: baseline;
      gap: 0.55rem;
      padding-bottom: 0.45rem;
      border-bottom: 1px solid rgba(232, 201, 106, 0.18);
      margin-bottom: 0.55rem;
    }
    .wp__text {
      flex: 1;
      font-family: 'Amiri', 'Noto Naskh Arabic', serif;
      font-size: 1.4rem;
      color: #f3d77a;
      font-weight: 600;
      line-height: 1.3;
    }
    .wp__ref {
      font-family: 'EB Garamond', 'Times New Roman', serif;
      font-size: 0.86rem;
      color: rgba(232, 201, 106, 0.78);
      background: rgba(232, 201, 106, 0.10);
      border: 1px solid rgba(232, 201, 106, 0.22);
      padding: 1px 7px;
      border-radius: 999px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .wp__pos { opacity: 0.6; margin-inline-start: 1px; }

    .wp__grid {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.25rem 0.65rem;
      margin: 0 0 0.4rem;
      dt {
        color: rgba(232, 201, 106, 0.7);
        font-size: 0.7rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding-top: 0.18rem;
      }
      dd {
        margin: 0;
        font-size: 0.95rem;
        color: #f5f1e7;
        word-break: break-word;
      }
    }
    .wp__val--ar {
      font-family: var(--km-font-arabic-ui);
      color: #f3d77a;
      font-weight: 500;
    }
    .wp__val--en {
      font-family: 'EB Garamond', serif;
      font-style: italic;
      color: rgba(245, 241, 231, 0.78);
      font-size: 0.88rem;
      line-height: 1.45;
    }
    .wp__missing {
      grid-column: 1 / -1;
      color: rgba(245, 241, 231, 0.5);
      font-size: 0.84rem;
      text-align: center;
      padding: 0.3rem 0;
      text-transform: none;
      letter-spacing: 0;
    }

    .wp__actions {
      display: flex;
      flex-direction: column;
      gap: 0;
      border-top: 1px solid rgba(232, 201, 106, 0.16);
      padding-top: 0.25rem;
    }
    .wp__btn {
      --color: rgba(232, 201, 106, 0.85);
      --color-activated: #e8c96a;
      --padding-start: 0.4rem;
      --padding-end: 0.5rem;
      margin: 0;
      justify-content: flex-start;
      font-family: var(--km-font-arabic-ui);
      font-size: 0.84rem;
      letter-spacing: 0.02em;
      text-transform: none;
      ion-icon { font-size: 1rem; }
    }
  `],
})
export class WordPopoverComponent {
  @Input({ required: true }) word!: QuranPageWord;

  // Callbacks passed in via componentProps — direct invocation is more
  // robust through ion-popover's createElement bridge than @Output.
  @Input() onOpenRoot:   ((root: string) => void) | null = null;
  @Input() onOpenTafsir: ((s: number, a: number) => void) | null = null;
  @Input() onCopied:     ((payload: string) => void) | null = null;

  constructor(private readonly popoverCtrl: PopoverController) {}

  hasAnyData(): boolean {
    return !!(this.word.root || this.word.lemma || this.word.translation);
  }

  emitOpenRoot(): void {
    const lookup = this.word.root || this.word.simple || this.word.text;
    this.onOpenRoot?.(lookup);
    void this.popoverCtrl.dismiss();
  }
  emitOpenTafsir(): void {
    this.onOpenTafsir?.(this.word.surah, this.word.ayah);
    void this.popoverCtrl.dismiss();
  }
  emitCopy(): void {
    const payload = `${this.word.text}  (${this.word.surah}:${this.word.ayah})`;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(payload);
    }
    this.onCopied?.(payload);
    void this.popoverCtrl.dismiss();
  }
}

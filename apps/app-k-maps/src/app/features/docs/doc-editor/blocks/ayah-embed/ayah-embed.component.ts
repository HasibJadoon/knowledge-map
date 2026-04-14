import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'km-ayah-embed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="km-block km-block--ayah" dir="rtl">
      <div class="ayah-text">{{ attrs['text_uthmani'] }}</div>
      @if (attrs['show_translation']) {
        <div class="ayah-translation" dir="ltr">{{ attrs['translation'] }}</div>
      }
      <div class="ayah-ref" dir="ltr">{{ attrs['surah'] }}:{{ attrs['ayah'] }}</div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .km-block--ayah {
      background: var(--km-surface, rgba(255,255,255,0.04));
      border-right: 3px solid var(--km-gold, #c9a84c);
      border-radius: 8px;
      padding: 16px 20px;
      margin: 12px 0;
      user-select: text;
      -webkit-user-select: text;
    }

    .ayah-text {
      font-family: var(--km-font-arabic, 'UthmanicHafs', serif);
      font-size: 1.75rem;
      line-height: 2.4;
      color: var(--ion-text-color, rgba(255,255,255,0.92));
      text-align: right;
    }

    .ayah-translation {
      font-size: 0.88rem;
      color: rgba(255,255,255,0.55);
      margin-top: 10px;
      font-style: italic;
      line-height: 1.6;
      text-align: left;
    }

    .ayah-ref {
      font-size: 0.72rem;
      color: var(--km-gold, #c9a84c);
      margin-top: 6px;
      font-weight: 600;
      text-align: left;
    }
  `]
})
export class AyahEmbedComponent {
  @Input() attrs: Record<string, unknown> = {};
}

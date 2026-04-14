import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'km-ayah-embed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="km-block km-block--ayah" dir="rtl">
      <div class="ayah-text">{{ attrs['text_uthmani'] }}</div>
      @if (attrs['show_translation']) {
        <div class="ayah-translation">{{ attrs['translation'] }}</div>
      }
      <div class="ayah-ref">{{ attrs['surah'] }}:{{ attrs['ayah'] }}</div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .km-block--ayah {
      background: var(--km-surface);
      border-right: 3px solid var(--km-gold);
      border-radius: 8px;
      padding: 20px 24px;
      margin: 16px 0;
    }

    .ayah-text {
      font-family: var(--km-font-arabic);
      font-size: 1.8rem;
      line-height: 2.6;
      color: var(--km-text);
    }

    .ayah-translation {
      font-size: 0.9rem;
      color: var(--km-text-2);
      margin-top: 12px;
      font-style: italic;
    }

    .ayah-ref {
      font-size: 0.75rem;
      color: var(--km-gold);
      margin-top: 8px;
      font-weight: 600;
    }
  `]
})
export class AyahEmbedComponent {
  @Input() attrs: Record<string, unknown> = {};
}

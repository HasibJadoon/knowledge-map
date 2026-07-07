import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { LexiconData } from '../morph-block.types';

@Component({
  selector: 'km-mb-lexicon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (t(block.text)) { <p class="say muted" [dir]="isRtlText() ? 'rtl' : 'ltr'">{{ t(block.text) }}</p> }
    <div class="lexgrid">
      @for (e of d.entries; track e.source) {
        <div class="lexc">
          <div class="lexc__head"><b>{{ e.source }}</b><small>{{ e.death }}</small></div>
          <div class="lexc__ar ar" dir="rtl">{{ e.shade_ar }}</div>
          <p class="lexc__en" dir="ltr">{{ e.shade_en }}</p>
        </div>
      }
    </div>
  `,
  styles: `
    .lexgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .lexc { display: flex; flex-direction: column; border: 1px solid var(--edge); border-radius: 14px; overflow: hidden;
      background: linear-gradient(180deg, rgba(201,168,76,.045), rgba(20,20,20,0) 46%), var(--panel);
      &__head { display: flex; align-items: center; gap: 10px; padding: 13px 15px; border-bottom: 1px solid var(--edge2);
        b { flex: 1; font: 600 12.5px/1.25 var(--head); letter-spacing: .04em; color: var(--gold2); }
        small { font: 600 8.5px/1 var(--mono); text-transform: uppercase; color: var(--faint); border: 1px solid var(--edge); border-radius: 999px; padding: 4px 8px; white-space: nowrap; } }
      &__ar { font-family: var(--ar); font-size: 21px; line-height: 1.95; color: var(--ink); padding: 14px 16px 0; text-align: right; }
      &__en { font-size: calc(13px * var(--fscale,1)); line-height: 1.65; color: var(--muted); margin: 12px 16px 16px; padding-top: 12px; border-top: 1px solid var(--edge2); } }
  `,
})
export class LexiconBlock extends MorphBlockBase {
  get d(): LexiconData { return (this.block.data ?? {}) as LexiconData; }
}

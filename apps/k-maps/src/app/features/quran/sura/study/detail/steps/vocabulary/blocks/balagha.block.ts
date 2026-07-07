import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { BalaghaData } from '../morph-block.types';

@Component({
  selector: 'km-mb-balagha',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (d.formula_ar) {
      <div class="formula">
        <div class="formula__ar ar">{{ d.formula_ar }}</div>
        @if (d.formula_en) { <div class="formula__en" [innerHTML]="rich(d.formula_en)"></div> }
      </div>
    }
    @if (t(block.text)) { <p class="say" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
    @if (d.refs?.length) { <div class="refs">@for (r of d.refs; track r) { <span class="ref">{{ r }}</span> }</div> }
  `,
  styles: `
    .formula { text-align: center; padding: 14px; margin-bottom: 14px; border: 1px solid var(--golddim); border-radius: 10px; background: radial-gradient(400px 120px at 50% 0, rgba(201,168,76,.1), transparent);
      &__ar { font-family: var(--quran); font-size: 24px; color: var(--gold2); line-height: 1.5; }
      &__en { font: italic 500 13.5px/1.5 var(--en); color: var(--muted); margin-top: 9px; } }
    .refs { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 12px; }
    .ref { font: 500 10.5px/1 var(--mono); color: var(--gold2); border: 1px solid var(--golddim); border-radius: 6px; padding: 5px 9px; }
  `,
})
export class BalaghaBlock extends MorphBlockBase {
  get d(): BalaghaData { return (this.block.data ?? {}) as BalaghaData; }
}

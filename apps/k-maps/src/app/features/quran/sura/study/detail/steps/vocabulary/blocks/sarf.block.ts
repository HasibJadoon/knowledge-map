import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { SarfData } from '../morph-block.types';

@Component({
  selector: 'km-mb-sarf',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sarf">
      @if (d.pattern_ar) {
        <div class="sarf__pat"><div class="ar">{{ d.pattern_ar }}</div><small>PATTERN</small></div>
        <span class="sarf__arrow">→</span>
      }
      @if (d.from_ar) {
        <span class="sarf__from ar">{{ d.from_ar }}</span><span class="sarf__to-arrow">⇢</span>
        <span class="sarf__to ar">{{ d.to_ar }}</span>
      }
      @if (d.rule) { <span class="sarf__rule ar" dir="rtl">{{ d.rule }}</span> }
    </div>
    @if (d.features?.length) {
      <div class="featgrid">
        @for (f of d.features; track f.k) { <span class="feat"><u>{{ f.k }}</u><b class="ar">{{ f.v }}</b></span> }
      </div>
    }
    @if (t(block.text)) { <p class="say" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
  `,
  styles: `
    .sarf { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;
      &__pat { text-align: center; padding: 10px 16px; border: 1px dashed var(--golddim); border-radius: 10px; background: rgba(201,168,76,.05);
        .ar { font-size: 30px; color: var(--gold2); line-height: 1; } small { display: block; font: 600 9px/1 var(--mono); letter-spacing: .1em; color: var(--muted); margin-top: 6px; } }
      &__arrow { font-size: 22px; color: var(--faint); }
      &__from { font-family: var(--ar); font-size: 26px; color: var(--muted); text-decoration: line-through; text-decoration-color: rgba(224,100,95,.6); }
      &__to-arrow { font-size: 16px; color: var(--faint); }
      &__to { font-family: var(--ar); font-size: 28px; color: var(--gold2); }
      &__rule { font-family: var(--ar); font-size: 15px; line-height: 1.7; color: var(--ink2); direction: rtl; text-align: right; border: 1px solid var(--edge); border-radius: 6px; padding: 7px 12px; max-width: 320px; } }
    .featgrid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .feat { display: inline-flex; align-items: baseline; gap: 7px; padding: 7px 12px; border-radius: 6px; border: 1px solid var(--edge); background: var(--panel);
      u { font: 500 10px/1 var(--mono); color: var(--faint); text-decoration: none; } b { font-family: var(--ar); font-size: 15px; color: var(--ink); font-weight: 500; } }
  `,
})
export class SarfBlock extends MorphBlockBase {
  get d(): SarfData { return (this.block.data ?? {}) as SarfData; }
}

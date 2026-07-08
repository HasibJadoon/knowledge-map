import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { IrabData } from '../morph-block.types';

@Component({
  selector: 'km-mb-irab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="irow">
      @if (d.role_ar) { <span class="irole"><b class="ar">{{ d.role_ar }}</b>@if (d.role_en) { <small>{{ d.role_en }}</small> }</span> }
      @if (d.position_ar) { <span class="ipill"><b class="ar">{{ d.position_ar }}</b></span> }
      @if (d.sign_ar) { <span class="ipill gold"><b class="ar">بعلامة {{ d.sign_ar }}</b></span> }
    </div>
    @if (t(block.text)) { <p class="say" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
    @if (d.sources?.length) { <div class="srcs">@for (s of d.sources; track s) { <span class="src ar" dir="rtl">{{ s }}</span> }</div> }
  `,
  styles: `
    .irow { display: flex; flex-wrap: wrap; gap: 9px; align-items: center; margin-bottom: 12px; }
    .irole { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 8px; color: #12100a; background: linear-gradient(180deg, var(--gold2), var(--gold));
      b { font-family: var(--ar); font-size: 18px; } small { font: 600 10px/1 var(--mono); opacity: .7; } }
    .ipill { font-family: var(--ar); font-size: 16px; padding: 7px 13px; border-radius: 8px; color: var(--ink); border: 1px solid var(--edge); background: var(--panel); &.gold { color: var(--gold2); } }
    .srcs { display: flex; flex-direction: column; gap: 7px; margin-top: 12px; }
    .src { font-family: var(--ar); font-size: 14px; line-height: 1.7; color: var(--ink2); direction: rtl; text-align: right;
      border: 1px solid var(--edge); border-inline-start: 2px solid var(--golddim); border-radius: 8px; padding: 8px 13px; background: var(--panel); }
  `,
})
export class IrabBlock extends MorphBlockBase {
  get d(): IrabData { return (this.block.data ?? {}) as IrabData; }
}

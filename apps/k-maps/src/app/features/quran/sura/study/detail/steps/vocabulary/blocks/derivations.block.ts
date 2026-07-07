import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { DerivationsData } from '../morph-block.types';

@Component({
  selector: 'km-mb-derivations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (t(block.text)) { <p class="say muted" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
    <div class="fam">
      @for (g of d.groups; track g.form_ar) {
        <div class="famg">
          <span class="famg__lab ar">{{ g.form_ar }}</span>
          <div class="famg__items">
            @for (it of g.items; track it.ar) { <span class="ftok"><b class="ar">{{ it.ar }}</b><small>{{ it.en }}</small></span> }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .fam { display: flex; flex-direction: column; gap: 10px; }
    .famg { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 10px 4px; border-bottom: 1px solid var(--edge2);
      &__lab { flex: 0 0 128px; font-family: var(--ar); font-size: 15px; color: var(--gold); }
      &__items { display: flex; flex-wrap: wrap; gap: 7px; flex: 1; } }
    .ftok { display: inline-flex; align-items: baseline; gap: 6px; padding: 5px 11px; border-radius: 6px; border: 1px solid var(--edge); background: var(--panel);
      b { font-family: var(--ar); font-size: 17px; color: var(--ink); font-weight: 500; } small { font: 400 10.5px/1 var(--en); color: var(--faint); } }
  `,
})
export class DerivationsBlock extends MorphBlockBase {
  get d(): DerivationsData { return (this.block.data ?? {}) as DerivationsData; }
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { RootDnaData } from '../morph-block.types';

@Component({
  selector: 'km-mb-root-dna',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rootdna">
      <div class="rootdna__letters ar">
        @for (ltr of d.letters; track $index) { <span>{{ ltr }}</span> }
      </div>
      <div class="rootdna__meaning">
        @if (d.core_ar) { <div class="rootdna__core ar" dir="rtl">{{ d.core_ar }}</div> }
        @if (t(block.text)) { <p class="say" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
      </div>
    </div>
  `,
  styles: `
    .rootdna { display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
      &__letters { display: flex; gap: 9px; direction: rtl;
        span { width: 60px; height: 60px; display: grid; place-items: center; font-family: var(--ar); font-size: 36px; color: var(--gold2);
          border: 1px solid var(--golddim); border-radius: 12px; background: radial-gradient(circle at 50% 30%, rgba(201,168,76,.14), transparent); } }
      &__meaning { flex: 1; min-width: 240px; }
      &__core { font-family: var(--ar); font-size: 22px; color: var(--gold2); line-height: 1.5; } }
  `,
})
export class RootDnaBlock extends MorphBlockBase {
  get d(): RootDnaData { return (this.block.data ?? {}) as RootDnaData; }
}

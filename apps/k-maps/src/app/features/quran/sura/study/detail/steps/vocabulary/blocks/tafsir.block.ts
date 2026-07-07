import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { TafsirData } from '../morph-block.types';

@Component({
  selector: 'km-mb-tafsir',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="taf">
      @for (e of d.entries; track e.scholar) {
        <div class="taf__e">
          <div class="taf__who"><b>{{ e.scholar }}</b><small>{{ e.work }}</small></div>
          <p class="taf__txt">{{ e.text }}</p>
        </div>
      }
    </div>
  `,
  styles: `
    .taf { display: flex; flex-direction: column; gap: 12px; }
    .taf__e { border-inline-start: 2px solid var(--golddim); padding: 4px 0 4px 16px;
      .taf__who { display: flex; align-items: baseline; gap: 9px; margin-bottom: 5px; b { font: 600 13px/1 var(--head); letter-spacing: .04em; color: var(--gold2); } small { font: 500 9.5px/1 var(--mono); color: var(--faint); } }
      .taf__txt { font-size: calc(14.5px * var(--fscale,1)); line-height: 1.6; color: var(--ink2); margin: 0; } }
  `,
})
export class TafsirBlock extends MorphBlockBase {
  get d(): TafsirData { return (this.block.data ?? {}) as TafsirData; }
}

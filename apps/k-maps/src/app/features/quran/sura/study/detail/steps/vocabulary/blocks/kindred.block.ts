import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { KindredData } from '../morph-block.types';

@Component({
  selector: 'km-mb-kindred',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kin">
      <div class="kin__col">
        <div class="kin__lab syn">Near-synonyms · النظائر</div>
        @for (s of d.synonyms; track s.ar) { <div class="kin__item syn"><b class="ar">{{ s.ar }}</b> <small>{{ s.en }}</small><p>{{ s.note }}</p></div> }
      </div>
      <div class="kin__col">
        <div class="kin__lab con">Contrast · الأضداد</div>
        @for (c of d.contrast; track c.ar) { <div class="kin__item con"><b class="ar">{{ c.ar }}</b> <small>{{ c.en }}</small><p>{{ c.note }}</p></div> }
      </div>
    </div>
  `,
  styles: `
    .kin { display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
      &__lab { font: 600 10px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 10px; &.syn { color: var(--sky); } &.con { color: var(--red); } }
      &__item { padding: 9px 12px; border-radius: 8px; margin-bottom: 8px;
        b { font-family: var(--ar); font-size: 17px; color: var(--ink); font-weight: 500; } small { color: var(--faint); }
        p { font-size: 12px; line-height: 1.5; color: var(--muted); margin: 3px 0 0; }
        &.syn { border: 1px solid rgba(147,184,214,.22); background: rgba(147,184,214,.05); } &.con { border: 1px solid rgba(224,100,95,.22); background: rgba(224,100,95,.05); } } }
    @media (max-width: 620px) { .kin { grid-template-columns: 1fr; } }
  `,
})
export class KindredBlock extends MorphBlockBase {
  get d(): KindredData { return (this.block.data ?? {}) as KindredData; }
}

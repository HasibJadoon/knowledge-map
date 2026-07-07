import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { MetaphorData } from '../morph-block.types';

@Component({
  selector: 'km-mb-metaphor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="meta">
      <span class="meta__src ar">{{ d.source_ar }}</span>
      <span class="meta__is">IS</span>
      <span class="meta__tgt ar">{{ d.target_ar }}</span>
      @if (d.mapping) { <span class="meta__map">{{ d.mapping }}</span> }
    </div>
    @if (t(block.text)) { <p class="say italic" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
  `,
  styles: `
    .meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;
      &__src { padding: 9px 15px; border-radius: 8px; font-family: var(--ar); font-size: 17px; color: var(--sky); border: 1px solid rgba(147,184,214,.35); background: rgba(147,184,214,.08); }
      &__is { font-size: 15px; color: var(--faint); letter-spacing: .1em; }
      &__tgt { padding: 9px 15px; border-radius: 8px; font-family: var(--ar); font-size: 17px; color: var(--gold2); border: 1px solid var(--golddim); background: rgba(201,168,76,.08); }
      &__map { font: 600 10px/1 var(--mono); letter-spacing: .08em; color: var(--faint); text-transform: uppercase; } }
  `,
})
export class MetaphorBlock extends MorphBlockBase {
  get d(): MetaphorData { return (this.block.data ?? {}) as MetaphorData; }
}

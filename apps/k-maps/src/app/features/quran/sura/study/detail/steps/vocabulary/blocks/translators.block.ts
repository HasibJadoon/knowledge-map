import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { TranslatorsData } from '../morph-block.types';

// translator reading tag → colour
const READING: Record<string, { fg: string; bd: string }> = {
  partial:   { fg: '#93b8d6', bd: 'rgba(147,184,214,.4)' },
  causative: { fg: '#e8c96a', bd: 'rgba(201,168,76,.4)' },
  both:      { fg: '#b3a6f6', bd: 'rgba(136,120,226,.4)' },
};

@Component({
  selector: 'km-mb-translators',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (t(block.text)) { <p class="say muted" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
    <div class="trans">
      @for (r of renderings(); track r.translator) {
        <div class="trans__row">
          <span class="trans__who">{{ r.translator }}</span>
          <span class="trans__txt">“{{ r.text }}”</span>
          <span class="trans__tag" [style.color]="r.fg" [style.border-color]="r.bd">{{ r.reading }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .trans { display: flex; flex-direction: column; gap: 1px; border: 1px solid var(--edge); border-radius: 10px; overflow: hidden;
      &__row { display: flex; align-items: center; gap: 14px; padding: 12px 15px; background: var(--panel); }
      &__who { flex: 0 0 132px; font: 500 12px/1.3 var(--en); color: var(--muted); }
      &__txt { flex: 1; font: 500 15px/1.4 var(--en); color: var(--ink); }
      &__tag { flex: none; font: 600 9px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; padding: 5px 9px; border-radius: 999px; border: 1px solid; } }
  `,
})
export class TranslatorsBlock extends MorphBlockBase {
  get d(): TranslatorsData { return (this.block.data ?? {}) as TranslatorsData; }

  /** translator renderings with reading-tag colours. */
  renderings(): any[] {
    return (this.d.renderings ?? []).map((r: any) => {
      const tag = (r.reading || 'partial').toLowerCase();
      const c = READING[tag] ?? READING['partial'];
      return { ...r, reading: (r.reading || '').toUpperCase(), fg: c.fg, bd: c.bd };
    });
  }
}

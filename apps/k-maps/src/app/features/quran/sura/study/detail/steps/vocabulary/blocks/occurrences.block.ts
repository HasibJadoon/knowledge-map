import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MorphBlockBase } from '../morph-block-base.directive';
import { OccurrencesData } from '../morph-block.types';

@Component({
  selector: 'km-mb-occurrences',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (t(block.text)) { <p class="say muted" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
    <div class="occ">
      @for (it of items; track it.ayah_key) {
        <article class="occc" [class.focus]="it.focus">
          <span class="occc__ref">§ Q {{ it.ayah_key }}</span>
          <div class="occc__side">
            <div class="occc__motif"><lucide-icon [name]="it.icon || 'map-pin'" [size]="26"></lucide-icon></div>
            <span class="occc__en">{{ it.en }}</span>
          </div>
          <div class="occc__body">
            <div class="occc__top"><span class="occc__kind ar">{{ it.kind_ar }}</span>@if (it.focus) { <span class="occc__badge">study locus</span> }</div>
            <p class="occc__ar ar" dir="rtl">{{ it.text_ar }}</p>
            <p class="occc__note">{{ it.note }}</p>
          </div>
        </article>
      }
    </div>
  `,
  styles: `
    .occ { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 12px; }
    .occc { position: relative; display: grid; grid-template-columns: auto 1fr; gap: 15px; padding: 15px 16px; border: 1px solid var(--edge); border-radius: 12px; background: var(--panel);
      &.focus { border-color: var(--golddim); box-shadow: 0 0 0 1px rgba(201,168,76,.25); }
      &__ref { position: absolute; top: 11px; right: 13px; font: 600 9.5px/1 var(--mono); color: var(--gold); background: rgba(201,168,76,.06); border: 1px solid var(--golddim); border-radius: 999px; padding: 4px 9px; }
      &__side { display: flex; flex-direction: column; align-items: center; gap: 8px; }
      &__motif { width: 60px; height: 60px; border-radius: 15px; display: grid; place-items: center; color: var(--gold2); border: 1px solid var(--golddim); background: radial-gradient(circle at 50% 35%, rgba(201,168,76,.14), transparent); }
      &__en { font: 600 8.5px/1.2 var(--mono); letter-spacing: .05em; text-transform: uppercase; color: var(--muted); text-align: center; max-width: 72px; }
      &__body { min-width: 0; }
      &__top { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; margin-bottom: 8px; padding-inline-end: 70px; }
      &__kind { font-family: var(--ar); font-size: 15px; color: var(--gold); }
      &__badge { font: 600 8px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--gold2); border: 1px solid var(--golddim); border-radius: 999px; padding: 4px 8px; }
      &__ar { font-family: var(--quran); font-size: 20px; line-height: 1.9; color: var(--ink); margin: 0; text-align: right; }
      &__note { font-size: calc(12.5px * var(--fscale,1)); line-height: 1.55; color: var(--muted); margin: 9px 0 0; } }
  `,
})
export class OccurrencesBlock extends MorphBlockBase {
  get d(): OccurrencesData { return (this.block.data ?? {}) as OccurrencesData; }
  get items() { return this.block.data?.items ?? []; }
}

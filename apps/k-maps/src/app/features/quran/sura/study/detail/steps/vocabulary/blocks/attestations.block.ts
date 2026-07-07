import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MorphBlockBase } from '../morph-block-base.directive';
import { AttestationsData } from '../morph-block.types';

@Component({
  selector: 'km-mb-attestations',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (t(block.text)) { <p class="say muted" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
    <div class="att">
      @for (wt of d.witnesses; track wt.phrase_ar) {
        <div class="attw">
          <div class="attw__side">
            <div class="attw__motif"><lucide-icon [name]="wt.icon || 'quote'" [size]="28"></lucide-icon></div>
            <span class="attw__era">{{ wt.era_en }}</span>
          </div>
          <div class="attw__body">
            <div class="attw__top"><span class="attw__era-ar ar">{{ wt.era_ar }}</span><span class="attw__kind ar">{{ wt.kind_ar }}</span></div>
            <div class="attw__phrase ar" dir="rtl">{{ wt.phrase_ar }}</div>
            <p class="attw__gloss">{{ wt.gloss_en }}</p>
            @if (wt.lex_ar || wt.lex_en) {
              <div class="attw__line"><span class="attw__tag">Lexicon</span><span class="ar">{{ wt.lex_ar }}</span><i>{{ wt.lex_en }}</i></div>
            }
            @if (wt.image_ar || wt.image_en) {
              <div class="attw__line attw__line--img"><span class="attw__tag sky">The image</span><span class="ar sky">{{ wt.image_ar }}</span><i>{{ wt.image_en }}</i></div>
            }
          </div>
          @if (wt.lex_source) { <span class="attw__src">§ {{ wt.lex_source }}</span> }
        </div>
      }
    </div>
  `,
  styles: `
    .att { display: flex; flex-direction: column; gap: 12px; }
    .attw { position: relative; display: grid; grid-template-columns: auto 1fr; gap: 16px; padding: 15px 16px; border: 1px solid var(--edge); border-radius: 12px; background: var(--panel);
      &__side { display: flex; flex-direction: column; align-items: center; gap: 8px; }
      &__motif { width: 64px; height: 64px; border-radius: 15px; display: grid; place-items: center; font-size: 26px; color: var(--gold2); border: 1px solid var(--golddim); background: radial-gradient(circle at 50% 35%, rgba(201,168,76,.14), transparent); }
      &__era { font: 600 8.5px/1 var(--mono); letter-spacing: .09em; text-transform: uppercase; color: var(--muted); }
      &__body { min-width: 0; }
      &__top { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 7px; padding-inline-end: 150px;
        .attw__era-ar { font-family: var(--ar); font-size: 14px; color: var(--gold); }
        .attw__kind { font: 500 10.5px/1 var(--mono); color: var(--faint); } }
      &__phrase { font-family: var(--quran); font-size: 22px; line-height: 1.75; color: var(--ink); }
      &__gloss { font-size: calc(13px * var(--fscale,1)); line-height: 1.55; color: var(--muted); margin: 6px 0 0; }
      &__line { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; margin-top: 11px;
        .ar { font-family: var(--ar); font-size: 13.5px; color: var(--gold2); &.sky { color: var(--sky); } }
        i { font-size: 11.5px; color: var(--faint); font-style: italic; }
        &--img { padding-top: 10px; border-top: 1px dashed var(--edge); } }
      &__tag { font: 600 8.5px/1 var(--mono); letter-spacing: .09em; text-transform: uppercase; color: var(--golddim); flex: none; &.sky { color: var(--sky); } }
      &__src { position: absolute; top: 11px; right: 13px; display: inline-flex; align-items: center; gap: 5px; max-width: 44%;
        font-family: var(--ar); font-size: 10.5px; line-height: 1; color: var(--gold); background: rgba(201,168,76,.06);
        border: 1px solid var(--golddim); border-radius: 999px; padding: 4px 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } }

    @media (max-width: 620px) { .att .attw { grid-template-columns: 1fr; } }
  `,
})
export class AttestationsBlock extends MorphBlockBase {
  get d(): AttestationsData { return (this.block.data ?? {}) as AttestationsData; }
}

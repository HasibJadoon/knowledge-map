import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MorphBlockBase } from '../morph-block-base.directive';
import { MasterStoryData } from '../morph-block.types';

@Component({
  selector: 'km-mb-master-story',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="story">
      @if (block.illustration?.url) {
        <div class="story__banner">
          <img [src]="block.illustration!.url" [alt]="block.illustration!.alt || 'Master story'" loading="lazy" />
          <span class="story__scrim"></span>
          @if (block.illustration?.kind === 'animation') { <span class="story__play">▶</span> }
        </div>
      }
      <div class="story__inner">
        <div class="story__masthead">
          <span class="story__rule"></span>
          <span class="story__mast-mid">
            <span class="story__star"><lucide-icon [name]="block.icon || 'sparkles'" [size]="16"></lucide-icon></span>
            <span class="story__mast-en">The Complete Story</span>
            <span class="story__mast-ar ar">القصة الجامعة</span>
          </span>
          <span class="story__rule story__rule--r"></span>
        </div>

        @if (d.medallion_ar || d.dropcap) {
          <div class="story__medallion">
            <div class="story__med-ring"></div>
            <div class="story__med-text">
              <div class="story__med-word ar">{{ bare(d.medallion_ar || d.dropcap) }}</div>
              @if (d.medallion_root) { <div class="story__med-root ar">{{ d.medallion_root }}</div> }
            </div>
          </div>
        }

        @if (d.movements?.length) {
          <div class="story__movements">
            @for (m of d.movements; track m.no; let last = $last) {
              <div class="mv" [style.--c]="m.accent || '#c9a84c'">
                <div class="mv__rail">
                  <span class="mv__tile"><lucide-icon [name]="m.icon || 'star'" [size]="26"></lucide-icon><span class="mv__no">{{ m.no }}</span></span>
                  @if (!last) { <span class="mv__line"></span> }
                </div>
                <div class="mv__body">
                  <div class="mv__head"><span class="mv__en">{{ m.en }}</span><span class="mv__ar ar">{{ m.ar }}</span></div>
                  <p class="mv__text ar" dir="rtl" [innerHTML]="rich(m.text)"></p>
                  @if (m.text_en) { <p class="mv__text-en" dir="ltr" [innerHTML]="rich(m.text_en)"></p> }
                  @if (m.chips?.length) {
                    <div class="mv__chips">@for (c of m.chips; track c.ar) { <span class="mv__chip"><b class="ar">{{ c.ar }}</b><small>{{ c.en }}</small></span> }</div>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="story__prose" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p>
        }

        @if (d.threads?.length) {
          <div class="story__threads">
            <div class="story__wov">Woven from</div>
            <div class="story__chips">@for (th of d.threads; track th) { <span class="thread">{{ th }}</span> }</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .story { margin: -20px -22px; position: relative; overflow: hidden;
      background: radial-gradient(920px 320px at 50% -8%, rgba(201,168,76,.15), transparent 62%), linear-gradient(180deg, #100d07, #0a0a0a 58%);
      &__banner { position: relative;
        img { width: 100%; height: 230px; object-fit: cover; display: block; }
        .story__scrim { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 55%, rgba(16,13,7,.85)); border-bottom: 1px solid var(--golddim); } }
      &__scrim { pointer-events: none; }
      &__play { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 54px; height: 54px; display: grid; place-items: center;
        border-radius: 50%; color: var(--gold2); border: 1px solid var(--golddim); background: rgba(0,0,0,.5); font-size: 17px; padding-inline-start: 3px; }
      &__inner { padding: 32px clamp(24px, 6%, 64px) 38px; }
      &__masthead { display: flex; align-items: center; gap: 14px; justify-content: center; margin-bottom: 24px; }
      &__rule { flex: 1; height: 1px; max-width: 130px; background: linear-gradient(90deg, transparent, var(--golddim)); &--r { background: linear-gradient(270deg, transparent, var(--golddim)); } }
      &__mast-mid { display: flex; align-items: center; gap: 11px; }
      &__star { color: var(--gold2); display: inline-flex; }
      &__mast-en { font: 600 13px/1 var(--head); letter-spacing: .24em; text-transform: uppercase; color: var(--gold2); }
      &__mast-ar { font-family: var(--ar); font-size: 17px; color: var(--gold); }
      &__medallion { display: flex; justify-content: center; margin: 0 auto 30px; position: relative; width: 154px; height: 154px; place-items: center; align-items: center;
        border-radius: 50%;
        background: radial-gradient(circle at 50% 36%, rgba(201,168,76,.22), rgba(0,0,0,.25));
        box-shadow: 0 0 0 1px var(--golddim), inset 0 0 44px rgba(201,168,76,.14), 0 22px 54px -22px rgba(201,168,76,.55); }
      &__med-ring { position: absolute; inset: 9px; border-radius: 50%; border: 1px solid rgba(201,168,76,.28); }
      &__med-text { text-align: center; z-index: 1; }
      &__med-word { font-family: var(--quran); font-size: calc(52px * var(--fscale,1)); line-height: 1; color: var(--gold2); text-shadow: 0 4px 26px rgba(201,168,76,.55); }
      &__med-root { font-family: var(--ar); font-size: 13px; letter-spacing: 5px; color: var(--gold); margin-top: 9px; }
      &__prose { max-width: 640px; margin: 0 auto; font-family: var(--serif); font-size: calc(19px * var(--fscale,1)); line-height: 1.7; color: var(--ink2); text-wrap: pretty; }
      &__movements { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 6px; }
      &__threads { max-width: 66ch; margin: 28px auto 0; padding-top: 18px; border-top: 1px solid var(--edge2); }
      &__wov { font: 600 9px/1 var(--mono); letter-spacing: .18em; text-transform: uppercase; color: var(--faint); margin-bottom: 13px; text-align: center; }
      &__chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; } }
    .thread { font: 600 10px/1 var(--mono); letter-spacing: .04em; text-transform: uppercase; color: var(--gold2); border: 1px solid var(--golddim); border-radius: 999px; padding: 6px 12px; background: rgba(201,168,76,.06); }
    .mv { display: grid; grid-template-columns: 72px 1fr; gap: 20px; align-items: start;
      &__rail { display: flex; flex-direction: column; align-items: center; }
      &__tile { position: relative; width: 64px; height: 64px; border-radius: 17px; display: grid; place-items: center; color: var(--c);
        border: 1px solid color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); }
      &__no { position: absolute; top: -9px; left: -9px; min-width: 23px; height: 23px; padding: 0 5px; border-radius: 999px;
        font: 600 9px/1 var(--mono); display: grid; place-items: center; color: #12100a; background: var(--c); box-shadow: 0 3px 10px -3px #000; }
      &__line { width: 2px; flex: 1; min-height: 34px; margin-top: 8px; background: linear-gradient(180deg, var(--c), transparent); opacity: .6; }
      &__body { padding: 5px 0 14px; }
      &__head { display: flex; align-items: baseline; gap: 11px; margin-bottom: 8px; flex-wrap: wrap; }
      &__en { font: 600 12px/1 var(--head); letter-spacing: .17em; text-transform: uppercase; color: var(--c); }
      &__ar { font-family: var(--ar); font-size: 17px; color: var(--muted); }
      &__text { font-family: var(--ar); font-size: calc(20px * var(--fscale,1)); line-height: 1.95; color: var(--ink); margin: 0; text-align: right; }
      &__text-en { font-family: var(--serif); font-size: calc(15.5px * var(--fscale,1)); line-height: 1.6; color: var(--muted); margin: 9px 0 0; }
      &__chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
      &__chip { display: inline-flex; align-items: baseline; gap: 7px; padding: 6px 12px; border-radius: 7px; border: 1px solid var(--edge); background: var(--panel);
        b { font-family: var(--ar); font-size: 17px; color: var(--ink); font-weight: 500; } small { font: 400 11px/1 var(--en); color: var(--faint); } } }
  `,
})
export class MasterStoryBlock extends MorphBlockBase {
  get d(): MasterStoryData { return (this.block.data ?? {}) as MasterStoryData; }
}

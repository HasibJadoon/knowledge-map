import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MorphBlockBase } from '../morph-block-base.directive';
import { SynthesisData } from '../morph-block.types';

const STRAND_ACCENT: Record<string, string> = {
  lexicon: '#c9a84c', sinai: '#93b8d6', verbal_idiom: '#b3a6f6', tafsir: '#e8c96a',
};

@Component({
  selector: 'km-mb-synthesis',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (synWeave(); as sw) {
      <div class="synweave">
        <svg class="synweave__svg" viewBox="0 0 600 210" preserveAspectRatio="none" aria-hidden="true">
          @for (o of sw.origins; track o.concept) {
            <path [attr.d]="o.path" fill="none" [attr.stroke]="o.color" stroke-width="7" stroke-linecap="round" opacity="0.16"/>
            <path [attr.d]="o.path" fill="none" [attr.stroke]="o.color" stroke-width="2.2" stroke-linecap="round"/>
          }
          <path [attr.d]="sw.producePath" fill="none" stroke="#e8c96a" stroke-width="8" stroke-linecap="round" opacity="0.16"/>
          <path [attr.d]="sw.producePath" fill="none" stroke="#e8c96a" stroke-width="2.6" stroke-linecap="round"/>
        </svg>
        @for (o of sw.origins; track o.concept) {
          <div class="synweave__origin" [style.top]="o.topPct" [style.--c]="o.color">
            <span class="synweave__dot"></span>
            <b class="synweave__concept" [innerHTML]="rich(o.concept)"></b>
          </div>
        }
        <div class="synweave__center"><span class="ar">{{ sw.center }}</span></div>
        @if (sw.output) {
          <div class="synweave__produces">
            <span class="synweave__plabel">produces</span>
            <b class="synweave__output">{{ sw.output }}</b>
          </div>
        }
      </div>
    }
    <div class="synstrands">
      @for (s of strands(); track s.source) {
        <div class="synstrand" [style.--c]="s.accent">
          <div class="synstrand__head">
            <span class="synstrand__icon" [style.color]="s.accent"><lucide-icon [name]="s.icon || 'waypoints'" [size]="16"></lucide-icon></span>
            <span class="synstrand__badge ar">{{ s.badge }}</span>
            <span class="synstrand__src ar" dir="rtl">{{ s.source }}</span>
          </div>
          <div class="synstrand__ar ar" dir="rtl">{{ s.ar }}</div>
          <p class="synstrand__en" dir="ltr">{{ s.en }}</p>
        </div>
      }
    </div>
    @if (t(block.text)) { <p class="say synout" [innerHTML]="richText(block.text)"></p> }
  `,
  styles: `
    .synweave { position: relative; width: 100%; height: 210px; border-radius: 12px; overflow: hidden; margin-bottom: 16px;
      border: 1px solid var(--golddim);
      background: radial-gradient(460px 200px at 63% 50%, rgba(201,168,76,.13), transparent), linear-gradient(180deg, #100d07, #0a0a0a);
      &__svg { position: absolute; inset: 0; width: 100%; height: 100%; }
      &__origin { position: absolute; left: 16px; z-index: 2; }
      &__dot { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
      &__concept { position: absolute; left: 12px; bottom: 6px; white-space: nowrap; font: 600 12px/1.2 var(--en); letter-spacing: .01em; color: var(--c); text-shadow: 0 1px 5px #000, 0 0 9px #000; }
      &__center { position: absolute; left: 63%; top: 50%; transform: translate(-50%, -50%); width: 82px; height: 82px;
        border-radius: 50%; display: grid; place-items: center; z-index: 3;
        background: radial-gradient(circle at 50% 38%, rgba(201,168,76,.28), rgba(0,0,0,.5));
        box-shadow: 0 0 0 1px var(--golddim), inset 0 0 26px rgba(201,168,76,.18), 0 0 34px -6px rgba(201,168,76,.6);
        .ar { font-family: var(--quran); font-size: 24px; color: var(--gold2); text-shadow: 0 2px 14px rgba(201,168,76,.6); } }
      &__produces { position: absolute; left: 78%; bottom: calc(50% + 11px); display: flex; flex-direction: column; z-index: 2; max-width: 20%; }
      &__plabel { font: 600 8px/1 var(--mono); letter-spacing: .15em; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; }
      &__output { font: 600 13.5px/1.3 var(--en); color: var(--gold2); text-shadow: 0 1px 5px #000; } }
    .synstrands { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .synstrand { display: flex; flex-direction: column; border: 1px solid var(--edge); border-top: 2px solid var(--c); border-radius: 10px; padding: 14px 15px; background: var(--panel);
      &__head { display: flex; align-items: center; gap: 9px; margin-bottom: 11px; }
      &__icon { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; border: 1px solid currentColor; background: rgba(255,255,255,.03); flex: none; }
      &__badge { font-family: var(--ar); font-size: 15px; color: var(--c); }
      &__src { margin-inline-start: auto; font-family: var(--ar); font-size: 12px; color: var(--faint); }
      &__ar { font-family: var(--ar); font-size: 18px; line-height: 1.85; color: var(--ink); text-align: right; margin-bottom: 10px; }
      &__en { font-size: calc(12.5px * var(--fscale,1)); line-height: 1.6; color: var(--muted); margin: auto 0 0; padding-top: 10px; border-top: 1px solid var(--edge2); } }
    .say.synout { color: var(--ink); border-inline-start: 2px solid var(--golddim); padding-inline-start: 16px; }
  `,
})
export class SynthesisBlock extends MorphBlockBase {
  get d(): SynthesisData { return (this.block.data ?? {}) as SynthesisData; }

  strands(): any[] {
    return (this.d.strands ?? []).map(s => ({
      ...s, accent: STRAND_ACCENT[s.kind] ?? '#c9a84c',
    }));
  }

  synWeave(): { center: string; output: string; origins: { color: string; concept: string; topPct: string; path: string }[]; producePath: string } {
    const strands = this.strands();
    const W = 600, H = 210, cvx = 0.63 * W, cvy = 0.5 * H, rim = 50;
    const originX = 30, meetX = cvx - rim, exitX = cvx + rim;
    const n = strands.length || 1;
    const origins = strands.map((s, i) => {
      const yf = (i + 0.5) / n, y = yf * H;
      return {
        color: s.accent, concept: s.concept || s.en || '', topPct: (yf * 100).toFixed(1) + '%',
        path: `M${originX} ${y.toFixed(1)} C ${(0.34 * W).toFixed(0)} ${y.toFixed(1)}, ${(meetX - 66).toFixed(0)} ${(cvy + (y - cvy) * 0.14).toFixed(1)}, ${meetX.toFixed(0)} ${cvy.toFixed(1)}`,
      };
    });
    return { center: this.heroWord || 'مبين', output: this.d.output ?? '', origins, producePath: `M${exitX} ${cvy} L ${W} ${cvy}` };
  }
}

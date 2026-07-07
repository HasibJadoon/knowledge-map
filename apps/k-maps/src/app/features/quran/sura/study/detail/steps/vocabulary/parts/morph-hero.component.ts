import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MorphWordVm, MorphContextVm, Lang } from '../../../../../../../../shared/services/quran/quran-surah.service';
import { richMarkup } from '../morph-rich';

/**
 * Presentational hero for the Morph Display Layer — the giant lemma glyph,
 * occurrence pill, chip row, rich gloss, and reading-in-context line. Pure
 * renderer; emits `openRoot` when the root chip/glyph is tapped.
 */
@Component({
  selector: 'km-morph-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (word; as w) {
      <section class="mw-hero">
        <h1 class="mw-hero__word ar">{{ lemmaBare() }}</h1>
        <div class="mw-hero__occ">
          <span class="ar">{{ w.surface_ar }}</span>
          <span class="note">as it occurs · {{ w.ayah_key }}</span>
        </div>
        <div class="mw-hero__chips">
          @if (w.sarf.derived_en || w.pos.en) {
            <span class="chip chip--sky">{{ w.sarf.derived_en || w.pos.en }}</span>
          }
          @if (w.sarf.wazn_ar) { <span class="chip chip--gold ar">{{ w.sarf.wazn_ar }}</span> }
          @if (w.sarf.form_ar) { <span class="chip chip--gold ar">باب {{ w.sarf.form_ar }}</span> }
          @if (w.root_display) {
            <span class="chip chip--root ar" (click)="openRoot.emit()" title="Open root page">{{ w.root_display }} <span class="rk">root ›</span></span>
          }
          @if (w.frequency_quran) { <span class="chip">{{ w.frequency_quran }}× root in Qurʾān</span> }
          @if (w.is_anchor) { <span class="chip chip--anchor">✦ root anchor</span> }
        </div>
        @if (lang === 'ar' ? w.gloss.ar : (lang === 'ur' ? w.gloss.ur : w.gloss.en)) {
          <p class="mw-hero__gloss" [dir]="lang === 'en' ? 'ltr' : 'rtl'" [innerHTML]="glossHtml()"></p>
        }
        @if (activeContext; as ac) {
          <div class="mw-hero__reading">
            reading in context — <span class="ar">{{ ac.kind_ar }} {{ lemmaBare() }}</span> · Qurʾān {{ ac.ayah_key }}
          </div>
        }
      </section>
    }
  `,
  styles: `
    :host { display: block; }

    .mw-hero {
      text-align: center; padding: clamp(30px,4vw,54px) 24px 32px;
      background: radial-gradient(680px 260px at 50% -10%, rgba(201,168,76,.16), transparent 70%);
      border-bottom: 1px solid var(--edge2);

      &__word {
        margin: 0; font-family: var(--ar); font-weight: 700;
        font-size: calc(clamp(52px,8.5vw,96px) * var(--fscale,1)); line-height: 1.15; color: var(--gold2);
        text-shadow: 0 2px 0 rgba(0,0,0,.55), 0 8px 46px rgba(201,168,76,.32);
      }
      &__occ {
        display: inline-flex; align-items: baseline; gap: 10px; margin-top: 22px; padding: 6px 16px;
        border-radius: 999px; border: 1px solid var(--edge); background: rgba(255,255,255,.02);
        .ar { font-family: var(--quran); font-size: 22px; color: var(--ink2); }
        .note { font: italic 11px/1 var(--en); letter-spacing: .04em; color: var(--faint); }
      }
      &__chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 18px; }
      &__gloss {
        max-width: 720px; margin: 18px auto 0; font-style: italic;
        font-size: calc(17px * var(--fscale,1)); line-height: 1.6; color: var(--ink2);
      }
      &__reading {
        margin-top: 16px; font: 500 11px/1 var(--mono); letter-spacing: .04em; color: var(--faint);
        .ar { font-family: var(--ar); font-size: 14px; color: var(--sky); }
      }
    }

    .chip {
      font-size: 12px; padding: 6px 13px; border-radius: 5px; color: var(--muted); border: 1px solid var(--edge);
      &.ar { font-family: var(--ar); font-size: 15px; }
      &--sky { color: #cfe4f5; border-color: rgba(147,184,214,.4); background: linear-gradient(180deg, rgba(147,184,214,.16), rgba(147,184,214,.05)); }
      &--gold { color: var(--gold2); background: linear-gradient(180deg, var(--panel3), var(--panel)); }
      &--root { color: var(--gold2); border-color: var(--golddim); background: linear-gradient(180deg, var(--panel3), var(--panel)); letter-spacing: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 9px;
        .rk { font: 600 8px/1 var(--mono); letter-spacing: .09em; text-transform: uppercase; color: var(--muted); }
        &:hover { border-color: var(--gold2); } }
      &--anchor { color: var(--indigo2); border-color: var(--indigo); background: linear-gradient(180deg, rgba(136,120,226,.2), rgba(136,120,226,.06)); }
    }
  `,
})
export class MorphHeroComponent {
  @Input() word: MorphWordVm | null = null;
  @Input() lang: Lang = 'en';
  @Input() activeContext: MorphContextVm | null = null;
  @Output() openRoot = new EventEmitter<void>();

  private readonly sanitizer = inject(DomSanitizer);

  lemmaBare(): string {
    return (this.word?.lemma_ar || this.word?.surface_ar || '').replace(/[ً-ْٰـ]/g, '');
  }

  glossHtml(): SafeHtml {
    const w = this.word;
    const g = this.lang === 'ar' ? w?.gloss.ar : (this.lang === 'ur' ? w?.gloss.ur : w?.gloss.en);
    return this.sanitizer.bypassSecurityTrustHtml(richMarkup(g, this.lang));
  }
}

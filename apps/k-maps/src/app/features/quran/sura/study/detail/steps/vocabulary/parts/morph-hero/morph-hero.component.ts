import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MorphWordVm, MorphContextVm } from '../../../../../../../../../shared/services/quran/quran-surah.service';
import { LangSel } from '../../morph-block.types';
import { richMarkup } from '../../morph-rich';

/**
 * Presentational hero for the Morph Display Layer — the giant lemma glyph,
 * occurrence pill, chip row, rich gloss, and reading-in-context line. Pure
 * renderer; emits `openRoot` when the root chip/glyph is tapped.
 */
@Component({
  selector: 'km-morph-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './morph-hero.component.html',
  styleUrl: './morph-hero.component.scss',
})
export class MorphHeroComponent {
  @Input() word: MorphWordVm | null = null;
  @Input() lang: LangSel = 'all';
  @Input() activeContext: MorphContextVm | null = null;
  @Output() openRoot = new EventEmitter<void>();

  private readonly sanitizer = inject(DomSanitizer);

  lemmaBare(): string {
    return (this.word?.lemma_ar || this.word?.surface_ar || '').replace(/[ً-ْٰـ]/g, '');
  }

  /** Gloss variants to render — 'all' stacks the three; single mode shows its own (with fallback). */
  glosses(): { text: SafeHtml; cls: 'en' | 'ar' | 'ur' }[] {
    const g = this.word?.gloss;
    if (!g) return [];
    const mk = (s: string | null | undefined, cls: 'en' | 'ar' | 'ur') =>
      ({ text: this.sanitizer.bypassSecurityTrustHtml(richMarkup(s, cls)), cls });
    if (this.lang === 'all') {
      const out: { text: SafeHtml; cls: 'en' | 'ar' | 'ur' }[] = [];
      if (g.en) out.push(mk(g.en, 'en'));
      if (g.ar) out.push(mk(g.ar, 'ar'));
      if (g.ur) out.push(mk(g.ur, 'ur'));
      return out;
    }
    const v = this.lang === 'ar' ? (g.ar || g.en) : this.lang === 'ur' ? (g.ur || g.en) : g.en;
    return v ? [mk(v, this.lang)] : [];
  }
}

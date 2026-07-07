// Shared base for every per-layer block component: the inputs contract + the small set of
// helpers the layers actually use. Extends via @Directive() so @Input inheritance works.
import { Directive, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MorphBlockVm, Tri, Lang } from '../../../../../../../shared/services/quran/quran-surah.service';
import { MorphBlockBody } from './morph-block.types';
import { richMarkup } from './morph-rich';

@Directive()
export abstract class MorphBlockBase implements MorphBlockBody {
  @Input({ required: true }) block!: MorphBlockVm;
  @Input() lang: Lang = 'en';
  @Input() heroWord = '';

  protected readonly sanitizer = inject(DomSanitizer);

  /** Trilingual pick (lang → en → ar). */
  t(tri: Tri | null | undefined): string {
    if (!tri) return '';
    return (tri[this.lang] ?? tri.en ?? tri.ar ?? '') as string;
  }
  isRtlText(): boolean { return this.lang !== 'en'; }
  /** Strip harakāt for display-size Arabic (e.g. the master-story medallion). */
  bare(s: string | null | undefined): string { return (s ?? '').replace(/[ً-ْٰـ]/g, ''); }
  /** Rich inline markup (==critical== / **key** / arrows) → sanitized HTML. */
  rich(str: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(richMarkup(str, this.lang));
  }
  richText(tri: Tri | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(richMarkup(this.t(tri), this.lang));
  }
}

// Shared base for every per-layer block component: the inputs contract + the small set of
// helpers the layers actually use. Extends via @Directive() so @Input inheritance works.
import { Directive, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MorphBlockVm, Tri, Lang } from '../../../../../../../shared/services/quran/quran-surah.service';
import { MorphBlockBody, LangSel } from './morph-block.types';
import { richMarkup } from './morph-rich';
import { safeMorphIcon } from './morph-icons';

@Directive()
export abstract class MorphBlockBase implements MorphBlockBody {
  @Input({ required: true }) block!: MorphBlockVm;
  @Input() lang: LangSel = 'all';
  @Input() heroWord = '';

  protected readonly sanitizer = inject(DomSanitizer);

  /** Trilingual pick (lang → en → ar); 'all' mode resolves to English (primary). */
  t(tri: Tri | null | undefined): string {
    if (!tri) return '';
    const l = this.lang === 'all' ? 'en' : this.lang;
    return (tri[l] ?? tri.en ?? tri.ar ?? '') as string;
  }
  isRtlText(): boolean { return this.lang === 'ar' || this.lang === 'ur'; }

  // ── language-visibility trio ──────────────────────────────────────────────
  // A field group is (ar, en, ur). 'all' stacks every non-empty variant; a single
  // language shows ONLY its own variant, falling back (ur→en→ar / en→ar / ar→en)
  // when the selected variant is missing so the layer never goes blank.
  showAr(ar?: string | null, en?: string | null, ur?: string | null): boolean {
    if (!ar) return false;
    if (this.lang === 'all' || this.lang === 'ar') return true;
    if (this.lang === 'en') return !en;
    return !ur && !en; // 'ur'
  }
  showEn(ar?: string | null, en?: string | null, ur?: string | null): boolean {
    if (!en) return false;
    if (this.lang === 'all' || this.lang === 'en') return true;
    if (this.lang === 'ar') return !ar;
    return !ur; // 'ur'
  }
  showUr(ar?: string | null, en?: string | null, ur?: string | null): boolean {
    return !!ur && (this.lang === 'all' || this.lang === 'ur');
  }
  /** Split a mixed 'primary' field: its Arabic half (when the string IS Arabic). */
  priAr(text?: string | null): string { return this.isAr(text) ? (text ?? '') : ''; }
  /** …and its English half (the string itself when not Arabic, else the _en companion). */
  priEn(text?: string | null, en?: string | null): string { return this.isAr(text) ? (en ?? '') : (text ?? ''); }
  // Block intro line (block.text) convenience wrappers.
  txAr(): string { return this.block?.text?.ar ?? ''; }
  txEn(): string { return this.block?.text?.en ?? ''; }
  txUr(): string { return this.block?.text?.ur ?? ''; }
  showTextAr(): boolean { return this.showAr(this.txAr(), this.txEn(), this.txUr()); }
  showTextEn(): boolean { return this.showEn(this.txAr(), this.txEn(), this.txUr()); }
  showTextUr(): boolean { return this.showUr(this.txAr(), this.txEn(), this.txUr()); }
  richTextAr(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(richMarkup(this.txAr(), 'ar')); }
  richTextEn(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(richMarkup(this.txEn(), 'en')); }
  richTextUr(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(richMarkup(this.txUr(), 'ur')); }
  /** Content-based script test: Arabic-dominant strings render RTL + Arabic font,
   *  otherwise LTR + Latin font. Lets a block hold Arabic-primary (كتاب/نزل) or
   *  English-primary (مبين) `text` fields and render each correctly. */
  isAr(s: string | null | undefined): boolean {
    const str = String(s ?? '');
    const ar = (str.match(/[؀-ۿ]/g) || []).length;
    const la = (str.match(/[A-Za-z]/g) || []).length;
    return ar > la;
  }
  /** Payload pick: the Urdu variant when the toggle is UR and Urdu exists, else English. */
  pick(en: string | null | undefined, ur: string | null | undefined): string {
    return (this.lang === 'ur' && ur) ? ur : (en ?? '');
  }
  /** Reading direction for a picked (en,ur) pair. */
  pickDir(en: string | null | undefined, ur: string | null | undefined): 'rtl' | 'ltr' {
    return this.isUr(ur) ? 'rtl' : 'ltr';
  }
  /** True when pick() would surface the Urdu variant — drives RTL + the Urdu font. */
  isUr(ur: string | null | undefined): boolean { return this.lang === 'ur' && !!ur; }
  /** True when t(block.text) is about to surface Urdu — styles the block intro line. */
  isUrText(): boolean { return this.lang === 'ur' && !!this.block?.text?.ur; }
  /** Content test for Urdu script — letters Urdu has and Arabic doesn't (ٹ ڈ ڑ ں ھ ہ ے …). */
  isUrduScript(s: string | null | undefined): boolean { return /[ٹڈڑںھہۂۃےۓ]/.test(String(s ?? '')); }
  /** Data-driven lucide icon name, clamped to the pool so bad data can't abort render. */
  icon(name: string | null | undefined, fallback = 'circle'): string {
    return safeMorphIcon(name, fallback);
  }
  /** Strip harakāt for display-size Arabic (e.g. the master-story medallion). */
  bare(s: string | null | undefined): string { return (s ?? '').replace(/[ً-ْٰـ]/g, ''); }
  /** Rich inline markup (==critical== / **key** / arrows) → sanitized HTML. */
  rich(str: string | null | undefined): SafeHtml {
    const l = this.lang === 'all' ? 'en' : this.lang;
    return this.sanitizer.bypassSecurityTrustHtml(richMarkup(str, l));
  }
  richText(tri: Tri | null | undefined): SafeHtml {
    const l = this.lang === 'all' ? 'en' : this.lang;
    return this.sanitizer.bypassSecurityTrustHtml(richMarkup(this.t(tri), l));
  }
}

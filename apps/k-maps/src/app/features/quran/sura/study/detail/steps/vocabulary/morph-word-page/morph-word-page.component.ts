import {
  ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  QuranSurahService, MorphWordView, MorphBlockVm, MorphContextVm,
} from '../../../../../../../../shared/services/quran/quran-surah.service';
import { MorphBlockHostComponent } from '../morph-block-host/morph-block-host.component';
import { LangSel } from '../morph-block.types';
import { MorphHeroComponent } from '../parts/morph-hero/morph-hero.component';
import { MorphTocRailComponent, TocItem, RegOption } from '../parts/morph-toc-rail/morph-toc-rail.component';
import { MorphContextSwitcherComponent } from '../parts/morph-context-switcher/morph-context-switcher.component';
import { provideMorphIcons } from '../morph-icons';

const REG_LABELS: Record<string, string> = {
  quran: 'Qurʾān', classical: 'Classical', msa: 'MSA',
  linguistic: 'Linguistic', modern: 'Modern', tafsir: 'Tafsīr',
};
const REG_ORDER = ['quran', 'classical', 'msa', 'linguistic', 'modern', 'tafsir'];

/**
 * Full-page WORD study — the "Morph Display Layer". Header (back · word · font ·
 * lang · pager) + TOC rail (register filter · Core/Temporal sections) + main
 * reader (hero · Core band · context switcher · Temporal band). Layer class is
 * data-driven off each block's `tier`: root → Core (static), occurrence/ayah →
 * Temporal (this verse). Pure presentation; no content logic.
 */
@Component({
  selector: 'km-morph-word-page',
  standalone: true,
  imports: [MorphBlockHostComponent, MorphHeroComponent, MorphTocRailComponent, MorphContextSwitcherComponent],
  providers: [provideMorphIcons()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './morph-word-page.component.html',
  styleUrl: './morph-word-page.component.scss',
})
export class MorphWordPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(QuranSurahService);
  /** The one real scroll container (.mw-main) — window never scrolls on this page. */
  @ViewChild('mwMain') private mwMain?: ElementRef<HTMLElement>;
  readonly view = signal<MorphWordView | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly lang = signal<LangSel>('all');
  readonly fontScale = signal(this.readScale());
  readonly tocHidden = signal(false);
  readonly reg = signal<string>('all');
  readonly coreOpen = signal(true);
  readonly ctxOpen = signal(true);
  readonly ctxKey = signal<string>('');   // selected context (ayah_key); '' = focus/default

  private surahId = 0; private passageNo = 1; private fromGrid = false;

  readonly word = computed(() => this.view()?.word ?? null);
  readonly nav = computed(() => this.view()?.nav ?? null);
  readonly langs: { key: LangSel; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'en', label: 'EN' }, { key: 'ar', label: 'ع' }, { key: 'ur', label: 'UR' },
  ];

  /** Bare lemma (harakāt stripped) for the giant hero glyph. */
  readonly lemmaBare = computed(() => {
    const w = this.word();
    return (w?.lemma_ar || w?.surface_ar || '').replace(/[ً-ْٰـ]/g, '');
  });

  private regsOf(b: MorphBlockVm): string[] {
    return (b.registers && b.registers.length) ? b.registers : (b.register ? [b.register] : []);
  }

  /** Register options — language-worlds present in this word (+ "All"). */
  readonly regOptions = computed<RegOption[]>(() => {
    const v = this.view();
    const present = new Set<string>(v?.registers_available ?? []);
    if (!present.size) {
      for (const b of v?.blocks ?? []) for (const r of this.regsOf(b)) present.add(r);
    }
    const sorted = [...present].sort((a, b) => REG_ORDER.indexOf(a) - REG_ORDER.indexOf(b));
    return [{ key: 'all', label: 'All' }, ...sorted.map(r => ({ key: r, label: REG_LABELS[r] ?? r }))];
  });

  private regOk(b: MorphBlockVm): boolean {
    return this.reg() === 'all' || this.regsOf(b).includes(this.reg());
  }

  /** CORE band — root-scope blocks (shared by every context), register-filtered. */
  readonly coreBlocks = computed<MorphBlockVm[]>(() =>
    (this.view()?.blocks ?? []).filter(b => this.regOk(b)),
  );

  /** Every Qurʾānic occurrence of the word — the context switcher. */
  readonly contexts = computed(() => this.view()?.contexts ?? []);

  /** The selected context (defaults to the focus occurrence). */
  readonly activeContext = computed<MorphContextVm | null>(() => {
    const cs = this.contexts();
    const key = this.ctxKey();
    return cs.find(c => c.ayah_key === key) ?? cs.find(c => c.focus) ?? cs[0] ?? null;
  });

  /** TEMPORAL band — the active context's verse-bound blocks (iʿrāb, balāgha …). */
  readonly temporalBlocks = computed<MorphBlockVm[]>(() =>
    (this.activeContext()?.blocks ?? []).filter(b => this.regOk(b)),
  );

  /** The active verse that heads the Temporal band. */
  readonly contextVerse = computed<{ text_ar: string; note: string; ayah_key: string } | null>(() => {
    const c = this.activeContext();
    return c ? { text_ar: c.text_ar, note: c.note, ayah_key: c.ayah_key } : null;
  });

  readonly tocCore = computed<TocItem[]>(() => this.coreBlocks().map((b, i) => this.toc(b, 'core', i)));
  readonly tocTemporal = computed<TocItem[]>(() => this.temporalBlocks().map((b, i) => this.toc(b, 'temp', i)));

  private toc(b: MorphBlockVm, band: string, i: number): TocItem {
    const hot = b.type === 'usage_map' || b.type === 'master_story' || b.type === 'constellation';
    const l = this.lang();
    const title = (l === 'ar' ? b.title.ar : l === 'ur' ? b.title.ur : b.title.en)
      || b.title.en || b.title.ar || b.type;   // 'all' → English caption (Arabic shown beneath)
    return {
      ord: String(i + 1).padStart(2, '0'),
      title,
      isUr: l === 'ur' && !!b.title.ur,
      titleAr: b.title.ar || '',
      domId: `blk-${band}-${b.type}-${b.order}`,
      hot,
    };
  }

  domId(band: 'core' | 'temp', b: MorphBlockVm): string { return `blk-${band}-${b.type}-${b.order}`; }

  ngOnInit(): void {
    this.surahId = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.fromGrid = !this.route.snapshot.paramMap.has('passageNo');
    this.passageNo = Number(this.route.snapshot.paramMap.get('passageNo')) || 1;
    this.route.paramMap.subscribe(pm => {
      const a = Number(pm.get('ayah')) || 0, w = Number(pm.get('wordIndex')) || 0;
      if (a && w) this.load(a, w);
    });
  }

  private load(ayah: number, wordIndex: number): void {
    this.loading.set(true); this.error.set(false); this.reg.set('all'); this.ctxKey.set('');
    this.svc.getMorphWord(this.surahId, ayah, wordIndex).subscribe({
      next: v => { this.view.set(v); this.loading.set(false); this.scrollTop(); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  setLang(l: LangSel): void { this.lang.set(l); }
  setReg(r: string): void { this.reg.set(r); }
  setContext(ayahKey: string): void { this.ctxKey.set(ayahKey); }
  toggleToc(): void { this.tocHidden.update(v => !v); }
  toggleCore(): void { this.coreOpen.update(v => !v); }
  toggleCtx(): void { this.ctxOpen.update(v => !v); }

  private readScale(): number {
    const v = Number(localStorage?.getItem('km.morph.fontScale'));
    return v >= 0.8 && v <= 1.8 ? v : 1;
  }
  stepFont(dir: 1 | -1): void {
    const next = Math.min(1.8, Math.max(0.8, +(this.fontScale() + dir * 0.1).toFixed(2)));
    this.fontScale.set(next);
    try { localStorage?.setItem('km.morph.fontScale', String(next)); } catch { /* ignore */ }
  }

  back(): void {
    if (this.fromGrid) { this.router.navigate(['/quran/surahs', this.surahId, 'morphology']); return; }
    this.router.navigate(['/quran/surahs', this.surahId, 'study', this.passageNo], { queryParams: { step: 'morphology' } });
  }
  openRoot(): void {
    const r = (this.word()?.root_ar ?? '').replace(/\s+/g, '').trim();
    if (r) this.router.navigate(['/quran/lexicon'], { queryParams: { root: r } });
  }

  goTo(n: { ayah: number; word_index: number } | null | undefined): void {
    if (!n) return;
    this.router.navigate(['/quran/surahs', this.surahId, 'study', this.passageNo, 'word', n.ayah, n.word_index]);
  }

  /** Reset the reader to the top — .mw-main scrolls, never the window. */
  private scrollTop(): void {
    this.mwMain?.nativeElement.scrollTo({ top: 0 });
  }

  scrollTo(domId: string): void {
    document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

}

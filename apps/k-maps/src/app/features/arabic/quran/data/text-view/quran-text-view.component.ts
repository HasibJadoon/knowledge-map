import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AppHeaderbarComponent } from '../../../../../shared/components';
import { QuranDataService } from '../../../../../shared/services/quran-data.service';
import {
  QuranAyah,
  QuranAyahWord,
  QuranSurah,
  QuranTranslationSource,
  QuranTranslationPassage,
} from '../../../../../shared/models/arabic/quran-data.model';

type QuranAyahWithPage = QuranAyah & { page?: number | null };
type ReadingToken = { text: string; type: 'word' | 'mark' };
type ReadingPage = { page: number | null; tokens: ReadingToken[] };

@Component({
  selector: 'app-quran-text-view',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent],
  templateUrl: './quran-text-view.component.html',
  styleUrls: ['./quran-text-view.component.scss'],
})
export class QuranTextViewComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dataService = inject(QuranDataService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly subs = new Subscription();
  private readonly arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  readonly bismillah = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
  readonly bismillahTranslation = 'In the Name of Allah—the Most Compassionate, Most Merciful';

  surahId: number | null = null;
  surah: QuranSurah | null = null;
  ayahs: QuranAyahWithPage[] = [];
  translationSource: QuranTranslationSource | null = null;
  translationPassages: QuranTranslationPassage[] = [];
  translationSegmentsByPassage = new Map<string, { number: number; text: string }[]>();
  passageHtmlPartsByKey = new Map<string, { intro: SafeHtml | null; body: SafeHtml | null }>();
  expandedFootnotes = new Set<string>();
  viewMode: 'verse' | 'reading' | 'translation' = 'verse';
  lemmaTokensByAyah = new Map<number, string[]>();
  lemmaTokensLoaded = false;
  loadingLemmaTokens = false;
  lemmaTokensError = '';
  readingPages: ReadingPage[] = [];
  readingText = '';
  readingHtml: SafeHtml | null = null;
  readingTranslation = '';

  loadingSurah = false;
  loadingAyahs = false;
  error = '';

  ngOnInit() {
    this.subs.add(
      this.route.paramMap.subscribe((params) => {
        const raw = params.get('surah');
        const id = Number.parseInt(String(raw ?? ''), 10);
        if (!Number.isFinite(id) || id < 1 || id > 114) {
          this.error = 'Invalid surah id.';
          this.surah = null;
          this.ayahs = [];
          return;
        }
        this.surahId = id;
        void this.loadSurah(id);
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  async loadSurah(id: number) {
    this.loadingSurah = true;
    this.error = '';
    try {
      await this.loadAyahs(id);
      this.lemmaTokensByAyah.clear();
      this.lemmaTokensLoaded = false;
      this.lemmaTokensError = '';
    } catch (err: any) {
      console.error('surah load error', err);
      this.error = err?.message ?? 'Unable to load surah.';
    } finally {
      this.loadingSurah = false;
    }
  }

  async loadAyahs(surah: number) {
    this.loadingAyahs = true;
    this.ayahs = [];
    try {
      const response = await this.dataService.listAyahs({ surah, pageSize: 400 });
      this.surah = response.surah ?? this.surah;
      this.translationSource = response.translation_source ?? null;
      this.translationPassages = response.translation_passages ?? [];
      this.ayahs = response.verses ?? response.results ?? [];
      this.hydrateLemmaTokensFromAyahs();
      this.buildTranslationSegments();
      if (this.viewMode !== 'verse') {
        this.buildReadingPages();
      }
    } catch (err: any) {
      console.error('ayah load error', err);
      this.error = err?.message ?? 'Unable to load ayahs.';
    } finally {
      this.loadingAyahs = false;
    }
  }

  hydrateLemmaTokensFromAyahs() {
    this.lemmaTokensByAyah.clear();
    let hasLemmaData = false;
    for (const ayah of this.ayahs) {
      const wordRows = Array.isArray(ayah.words) ? ayah.words : [];
      const lemmas = Array.isArray(ayah.lemmas) ? ayah.lemmas : [];
      const source = wordRows.length ? wordRows : lemmas;
      if (!source.length) continue;
      hasLemmaData = true;
      const tokens = source
        .map((lemma) =>
          'text_uthmani' in lemma || 'text_imlaei_simple' in lemma
            ? (lemma as QuranAyahWord).text_uthmani ||
              (lemma as QuranAyahWord).word_diacritic ||
              (lemma as QuranAyahWord).text_imlaei_simple ||
              (lemma as QuranAyahWord).word_simple ||
              ''
            : (lemma as any).word_diacritic || (lemma as any).word_simple || ''
        )
        .filter(Boolean);
      if (tokens.length) {
        this.lemmaTokensByAyah.set(ayah.ayah, tokens);
      }
    }
    this.lemmaTokensLoaded = hasLemmaData;
  }

  get shouldShowBismillah() {
    return !!this.surah && this.surah.surah !== 9;
  }

  get headerTitle() {
    if (!this.surah) return 'Quran Text';
    const englishName = this.surah.name_en || `Surah ${this.surah.surah}`;
    return `${this.surah.surah}. ${englishName}`;
  }

  get translationSourceMeta() {
    if (!this.translationSource) return '';
    const parts: string[] = [];
    if (this.translationSource.translator) parts.push(this.translationSource.translator);
    if (this.translationSource.edition) parts.push(this.translationSource.edition);
    if (this.translationSource.year) parts.push(String(this.translationSource.year));
    return parts.join(' · ');
  }

  get translationPassageList() {
    return (this.translationPassages ?? []).filter((passage) => (passage.text ?? '').trim().length > 0);
  }

  formatTranslationRange(passage: QuranTranslationPassage) {
    const start = passage.ayah_from;
    const end = passage.ayah_to;
    if (!this.surah) return `${start}-${end}`;
    if (start === end) return `${this.surah.surah}:${start}`;
    return `${this.surah.surah}:${start}–${end}`;
  }

  getPassageKey(passage: QuranTranslationPassage) {
    return String(
      passage.id ?? `${passage.surah}:${passage.ayah_from}-${passage.ayah_to}-${passage.passage_index}`
    );
  }

  buildTranslationSegments() {
    this.translationSegmentsByPassage.clear();
    this.passageHtmlPartsByKey.clear();
    if (!this.translationPassages.length || !this.ayahs.length) return;

    const textByAyah = new Map<number, string>();
    for (const ayah of this.ayahs) {
      const translation = this.getTranslationText(ayah);
      if (!translation) continue;
      const cleaned = this.formatPassageText(translation);
      if (!cleaned) continue;
      textByAyah.set(ayah.ayah, cleaned);
    }

    for (const passage of this.translationPassages) {
      const segments: { number: number; text: string }[] = [];
      for (let ayah = passage.ayah_from; ayah <= passage.ayah_to; ayah += 1) {
        const text = textByAyah.get(ayah);
        if (!text) continue;
        segments.push({ number: ayah, text });
      }
      this.translationSegmentsByPassage.set(this.getPassageKey(passage), segments);
    }
  }

  getPassageSegments(passage: QuranTranslationPassage) {
    return this.translationSegmentsByPassage.get(this.getPassageKey(passage)) ?? [];
  }

  getPassagePdfText(passage: QuranTranslationPassage) {
    const meta = passage.meta as Record<string, unknown> | null | undefined;
    const text = typeof meta?.['text_pdf'] === 'string' ? meta?.['text_pdf'] : '';
    return text.trim();
  }

  hasPassagePdfText(passage: QuranTranslationPassage) {
    return this.getPassagePdfText(passage).length > 0;
  }

  getPassageHtmlParts(passage: QuranTranslationPassage) {
    const key = this.getPassageKey(passage);
    const cached = this.passageHtmlPartsByKey.get(key);
    if (cached) return cached;

    const text = this.getPassagePdfText(passage);
    if (!text) return null;

    const footnoteMap = new Map(
      this.getFootnotes(passage).map((note) => [note.marker.toLowerCase(), note.text])
    );

    const splitIndex = this.findIntroSplitIndex(text, passage.ayah_from);
    const introText = splitIndex > 0 ? text.slice(0, splitIndex).trim() : '';
    const bodyText = splitIndex > 0 ? text.slice(splitIndex).trim() : text.trim();

    const usedFootnotes = new Set<string>();
    const introHtml = introText
      ? this.buildPassageHtml(introText, footnoteMap, usedFootnotes, false)
      : null;
    const bodyHtml = bodyText
      ? this.buildPassageHtml(bodyText, footnoteMap, usedFootnotes, true)
      : null;

    const result = { intro: introHtml, body: bodyHtml };
    this.passageHtmlPartsByKey.set(key, result);
    return result;
  }

  getFootnotes(passage: QuranTranslationPassage) {
    const meta = passage.meta as Record<string, unknown> | null | undefined;
    const footnotes = Array.isArray(meta?.['footnotes']) ? meta?.['footnotes'] : [];
    return footnotes
      .map((entry: any) => ({
        marker: String(entry?.marker ?? '').trim(),
        text: String(entry?.text ?? '').trim(),
      }))
      .filter((entry) => entry.marker && entry.text);
  }

  isFootnotesOpen(passage: QuranTranslationPassage) {
    return this.expandedFootnotes.has(this.getPassageKey(passage));
  }

  toggleFootnotes(passage: QuranTranslationPassage) {
    const key = this.getPassageKey(passage);
    if (this.expandedFootnotes.has(key)) {
      this.expandedFootnotes.delete(key);
    } else {
      this.expandedFootnotes.add(key);
    }
  }

  formatPassageText(text: string | null | undefined) {
    if (!text) return '';
    let cleaned = text.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/^"+/, '').replace(/"+$/, '');
    cleaned = cleaned.replace(/"\s+"/g, ' ');
    cleaned = cleaned.replace(/\s+"/g, ' ');
    cleaned = cleaned.replace(/"\s*/g, ' ');
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  escapeHtml(value: string) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  buildPassageHtml(
    text: string,
    footnoteMap: Map<string, string>,
    usedFootnotes: Set<string>,
    markVerseNumbers: boolean
  ) {
    let html = this.escapeHtml(text);
    html = html.replace(/\s+/g, ' ').trim();

    if (markVerseNumbers) {
      html = html.replace(/(^|\s)(\d{1,3})(?=\s)/g, (_m, prefix, number) => {
        return `${prefix}<sup class=\"translation-number\">${number}</sup>`;
      });
    }

    html = html.replace(/(\S)\s([a-z])(?=[\s,;:!?.])/g, (_m, prev, marker) => {
      const key = marker.toLowerCase();
      const note = footnoteMap.get(key);
      if (!note) return `${prev} ${marker}`;
      if (usedFootnotes.has(key)) return `${prev} ${marker}`;
      usedFootnotes.add(key);
      const title = this.escapeHtml(note);
      return `${prev}<sup class=\"footnote-inline\" title=\"${title}\" aria-label=\"${title}\">${marker}</sup>`;
    });

    html = html.replace(/(^|\s)([a-z])(?=[\s,;:!?.])/g, (_m, prefix, marker) => {
      const key = marker.toLowerCase();
      const note = footnoteMap.get(key);
      if (!note) return `${prefix}${marker}`;
      if (usedFootnotes.has(key)) return `${prefix}${marker}`;
      usedFootnotes.add(key);
      const title = this.escapeHtml(note);
      return `${prefix}<sup class=\"footnote-inline\" title=\"${title}\" aria-label=\"${title}\">${marker}</sup>`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  findIntroSplitIndex(text: string, startAyah: number) {
    if (!text) return 0;
    const ayahRegex = new RegExp(`\\\\b${startAyah}\\\\b\\\\s+[A-Za-z\\[]`, 'm');
    const match = ayahRegex.exec(text);
    if (!match) return 0;
    let splitIndex = match.index;

    const basmalaIndex = text.lastIndexOf('In the name of God', splitIndex);
    if (basmalaIndex !== -1) {
      splitIndex = basmalaIndex;
    }

    return splitIndex;
  }

  get showVerse() {
    return this.viewMode === 'verse';
  }

  get showReading() {
    return this.viewMode === 'reading';
  }

  get showTranslation() {
    return this.viewMode === 'translation';
  }

  setViewMode(mode: 'verse' | 'reading' | 'translation') {
    this.viewMode = mode;
    if (mode !== 'verse') {
      this.buildReadingPages();
    }
  }

  goBack() {
    this.router.navigate(['/arabic/quran/data/text']);
  }

  trackByAyah = (_: number, ayah: QuranAyahWithPage) => `${ayah.surah}:${ayah.ayah}`;
  trackByAyahWord = (_: number, word: QuranAyahWord) =>
    word.word_location || word.location || word.id || word.lemma_id || word.token_index || word.position || _;
  trackByPassage = (_: number, passage: QuranTranslationPassage) =>
    passage.id || `${passage.surah}:${passage.ayah_from}-${passage.ayah_to}-${passage.passage_index}`;

  showPageDivider(index: number) {
    if (index <= 0) return false;
    const currentPage = this.ayahs[index]?.page ?? null;
    const previousPage = this.ayahs[index - 1]?.page ?? null;
    if (!currentPage) return false;
    return currentPage !== previousPage;
  }

  getAyahMark(ayah: QuranAyahWithPage) {
    return this.formatAyahNumber(ayah.ayah);
  }

  getTranslationText(ayah: QuranAyahWithPage) {
    return (
      ayah.translations?.haleem ||
      ayah.translation ||
      ''
    );
  }

  formatAyahNumber(value: number | null | undefined) {
    if (value == null) return '';
    return String(value).replace(/\d/g, (digit) => this.arabicDigits[Number(digit)] || digit);
  }

  getWordText(word: QuranAyahWord) {
    return (
      word.text_uthmani ||
      word.word_diacritic ||
      word.text_imlaei_simple ||
      word.word_simple ||
      ''
    );
  }

  splitAyahWords(text: string) {
    const cleaned = String(text ?? '')
      .replace(/﴿[^﴾]*﴾/g, ' ')
      .replace(/۝/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .filter((token) => !/^[0-9٠-٩]+$/.test(token));
  }

  async loadLemmaTokens(surah: number) {
    this.loadingLemmaTokens = true;
    this.lemmaTokensError = '';
    this.lemmaTokensByAyah.clear();
    this.readingPages = [];

    let page = 1;
    let hasMore = true;
    try {
      while (hasMore) {
        const response = await this.dataService.listLemmaLocations({ surah, page, pageSize: 200 });
        const rows = response.results ?? [];
        for (const row of rows) {
          const ayah = row.ayah;
          if (!ayah) continue;
          const word = row.word_diacritic || row.word_simple || '';
          if (!word) continue;
          if (!this.lemmaTokensByAyah.has(ayah)) {
            this.lemmaTokensByAyah.set(ayah, []);
          }
          this.lemmaTokensByAyah.get(ayah)?.push(word);
        }
        hasMore = !!response.hasMore;
        page += 1;
      }
      this.lemmaTokensLoaded = true;
      this.buildReadingPages();
    } catch (err: any) {
      console.error('lemma token load error', err);
      this.lemmaTokensError = err?.message ?? 'Unable to load lemma tokens.';
    } finally {
      this.loadingLemmaTokens = false;
    }
  }

  getReadingTokens(ayah: QuranAyahWithPage): string[] {
    const tokens = this.lemmaTokensByAyah.get(ayah.ayah);
    if (tokens && tokens.length) return tokens;
    return this.splitAyahWords(ayah.text_uthmani || ayah.text || '');
  }

  buildReadingPages() {
    const pages: ReadingPage[] = [];
    const pageMap = new Map<number, ReadingPage>();
    const tokens: string[] = [];
    const htmlParts: string[] = [];
    const translationParts: string[] = [];

    for (const ayah of this.ayahs) {
      const pageKey = ayah.page ?? 0;
      let page = pageMap.get(pageKey);
      if (!page) {
        page = { page: ayah.page ?? null, tokens: [] };
        pageMap.set(pageKey, page);
        pages.push(page);
      }

      const words = this.getReadingTokens(ayah);
      for (const word of words) {
        page.tokens.push({ text: word, type: 'word' });
        tokens.push(word);
        htmlParts.push(this.escapeHtml(word));
      }
      const marker = this.getAyahMark(ayah);
      if (marker) {
        page.tokens.push({ text: marker, type: 'mark' });
        tokens.push(marker);
        htmlParts.push(`<span class=\"reading-mark\">${this.escapeHtml(marker)}</span>`);
      }

      const translation = this.getTranslationText(ayah);
      if (translation) {
        translationParts.push(translation.trim());
      }
    }

    this.readingPages = pages;
    this.readingText = tokens.join(' ').replace(/\s+/g, ' ').trim();
    const html = htmlParts.join(' ').replace(/\s+/g, ' ').trim();
    this.readingHtml = html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
    const passageText = this.translationPassages
      .map((passage) => passage.text ?? '')
      .map((text) => text.trim())
      .filter(Boolean)
      .join('\n\n');
    this.readingTranslation = passageText || translationParts.join(' ').replace(/\s+/g, ' ').trim();
  }
}

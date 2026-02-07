import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
type LemmaEditorRow = {
  id?: number | null;
  lemma_id?: number | null;
  lemma_text?: string | null;
  lemma_text_clean?: string | null;
  word_location?: string | null;
  surah?: number | null;
  ayah?: number | null;
  token_index?: number | null;
  word_simple?: string | null;
  word_diacritic?: string | null;
  ar_u_token?: string | null;
  ar_token_occ_id?: string | null;
};

@Component({
  selector: 'app-quran-text-view',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderbarComponent],
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
  private readonly arabicDiacriticsRe = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

  readonly bismillah = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
  readonly bismillahTranslation = 'In the Name of Allah—the Most Compassionate, Most Merciful';

  surahId: number | null = null;
  surah: QuranSurah | null = null;
  ayahs: QuranAyahWithPage[] = [];
  translationSource: QuranTranslationSource | null = null;
  translationPassages: QuranTranslationPassage[] = [];
  translationSegmentsByPassage = new Map<string, { number: number; text: string }[]>();
  expandedFootnotes = new Set<string>();
  viewMode: 'verse' | 'reading' | 'translation' = 'verse';
  editingAyahKey: string | null = null;
  lemmaEditorRows: LemmaEditorRow[] = [];
  lemmaEditorLoading = false;
  lemmaEditorSaving = false;
  lemmaEditorError = '';
  lemmaTokensByAyah = new Map<number, string[]>();
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
    this.closeLemmaEditor();
    try {
      await this.loadAyahs(id);
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
    for (const ayah of this.ayahs) {
      const wordRows = Array.isArray(ayah.words) ? ayah.words : [];
      const lemmas = Array.isArray(ayah.lemmas) ? ayah.lemmas : [];
      const source = wordRows.length ? wordRows : lemmas;
      if (!source.length) continue;
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
    return (this.translationPassages ?? []).filter((passage) => {
      const hasSegments = this.getPassageSegments(passage).length > 0;
      const hasText = (passage.text ?? '').trim().length > 0;
      return hasSegments || hasText;
    });
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
  trackByLemmaRow = (_: number, row: LemmaEditorRow) =>
    row.id ?? `${row.surah}:${row.ayah}:${row.token_index ?? _}`;

  getAyahMark(ayah: QuranAyahWithPage) {
    return this.formatAyahNumber(ayah.ayah);
  }

  getAyahKey(ayah: QuranAyahWithPage) {
    return `${ayah.surah}:${ayah.ayah}`;
  }

  isEditingAyah(ayah: QuranAyahWithPage) {
    return this.editingAyahKey === this.getAyahKey(ayah);
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

  stripArabicDiacritics(text: string) {
    return String(text ?? '').normalize('NFKC').replace(this.arabicDiacriticsRe, '').trim();
  }

  async openLemmaEditor(ayah: QuranAyahWithPage) {
    const key = this.getAyahKey(ayah);
    if (this.editingAyahKey === key) {
      this.closeLemmaEditor();
      return;
    }
    this.editingAyahKey = key;
    await this.loadLemmaEditorRows(ayah);
  }

  closeLemmaEditor() {
    this.editingAyahKey = null;
    this.lemmaEditorRows = [];
    this.lemmaEditorError = '';
    this.lemmaEditorLoading = false;
    this.lemmaEditorSaving = false;
  }

  async loadLemmaEditorRows(ayah: QuranAyahWithPage) {
    this.lemmaEditorLoading = true;
    this.lemmaEditorError = '';
    try {
      const response = await this.dataService.listLemmaLocations({
        surah: ayah.surah,
        ayah: ayah.ayah,
        pageSize: 500,
      });
      const rows = response.results ?? [];
      if (rows.length) {
        this.lemmaEditorRows = rows.map((row) => ({
          id: row.id,
          lemma_id: row.lemma_id,
          lemma_text: row.lemma_text ?? '',
          lemma_text_clean: row.lemma_text_clean ?? '',
          word_location: row.word_location,
          surah: row.surah,
          ayah: row.ayah,
          token_index: row.token_index,
          word_simple: row.word_simple ?? '',
          word_diacritic: row.word_diacritic ?? '',
          ar_u_token: row.ar_u_token ?? null,
          ar_token_occ_id: row.ar_token_occ_id ?? null,
        }));
        return;
      }

      const tokens = this.getReadingTokens(ayah);
      this.lemmaEditorRows = tokens.map((token, index) => ({
        lemma_id: null,
        lemma_text: '',
        lemma_text_clean: '',
        word_location: `${ayah.surah}:${ayah.ayah}:${index + 1}`,
        surah: ayah.surah,
        ayah: ayah.ayah,
        token_index: index + 1,
        word_simple: this.stripArabicDiacritics(token),
        word_diacritic: token,
      }));
    } catch (err: any) {
      console.error('lemma editor load error', err);
      this.lemmaEditorError = err?.message ?? 'Unable to load lemma data.';
      this.lemmaEditorRows = [];
    } finally {
      this.lemmaEditorLoading = false;
    }
  }

  addLemmaEditorRow(ayah: QuranAyahWithPage) {
    const nextIndex = Math.max(0, ...this.lemmaEditorRows.map((row) => Number(row.token_index) || 0)) + 1;
    this.lemmaEditorRows = [
      ...this.lemmaEditorRows,
      {
        id: null,
        lemma_id: null,
        lemma_text: '',
        lemma_text_clean: '',
        word_location: `${ayah.surah}:${ayah.ayah}:${nextIndex}`,
        surah: ayah.surah,
        ayah: ayah.ayah,
        token_index: nextIndex,
        word_simple: '',
        word_diacritic: '',
      },
    ];
  }

  getEditorWordLocation(row: LemmaEditorRow, ayah: QuranAyahWithPage) {
    if (row.word_location?.trim()) return row.word_location;
    const tokenIndex = Number(row.token_index) || 0;
    if (!tokenIndex) return '';
    return `${ayah.surah}:${ayah.ayah}:${tokenIndex}`;
  }

  async saveLemmaEditorRows(ayah: QuranAyahWithPage) {
    if (this.lemmaEditorSaving) return;
    this.lemmaEditorSaving = true;
    this.lemmaEditorError = '';

    try {
      const entries = [];
      for (const row of this.lemmaEditorRows) {
        const tokenIndex = Number(row.token_index);
        const lemmaId = row.lemma_id != null ? Number(row.lemma_id) : null;
        const lemmaText = (row.lemma_text ?? '').trim();
        const lemmaClean = (row.lemma_text_clean ?? '').trim();
        const wordSimple = (row.word_simple ?? '').trim();
        const wordDiacritic = (row.word_diacritic ?? '').trim();

        const hasAny =
          Number.isFinite(tokenIndex) ||
          !!lemmaId ||
          !!lemmaText ||
          !!lemmaClean ||
          !!wordSimple ||
          !!wordDiacritic;

        if (!hasAny) continue;
        if (!Number.isFinite(tokenIndex) || tokenIndex <= 0) {
          this.lemmaEditorError = 'Each token needs a valid token index.';
          return;
        }
        if (!lemmaId && !lemmaText && !lemmaClean) {
          this.lemmaEditorError = 'Provide a lemma id or lemma text for each token.';
          return;
        }

        entries.push({
          id: row.id ?? undefined,
          lemma_id: lemmaId ?? undefined,
          lemma_text: lemmaText || undefined,
          lemma_text_clean: lemmaClean || undefined,
          word_location: this.getEditorWordLocation(row, ayah) || undefined,
          surah: ayah.surah,
          ayah: ayah.ayah,
          token_index: tokenIndex,
          word_simple: wordSimple || undefined,
          word_diacritic: wordDiacritic || undefined,
          ar_u_token: row.ar_u_token ?? undefined,
          ar_token_occ_id: row.ar_token_occ_id ?? undefined,
        });
      }

      if (!entries.length) {
        this.lemmaEditorError = 'Nothing to save yet.';
        return;
      }

      await this.dataService.upsertLemmaLocations(entries);
      if (this.surahId) {
        await this.loadAyahs(this.surahId);
      }
      this.closeLemmaEditor();
    } catch (err: any) {
      console.error('lemma editor save error', err);
      this.lemmaEditorError = err?.message ?? 'Unable to save lemma edits.';
    } finally {
      this.lemmaEditorSaving = false;
    }
  }

  getReadingTokens(ayah: QuranAyahWithPage): string[] {
    const tokens = this.lemmaTokensByAyah.get(ayah.ayah);
    if (tokens && tokens.length) return tokens;
    return this.splitAyahWords(ayah.text_uthmani || ayah.text || '');
  }

  buildReadingPages() {
    const htmlParts: string[] = [];
    const translationParts: string[] = [];

    for (const ayah of this.ayahs) {
      const words = this.getReadingTokens(ayah);
      for (const word of words) {
        htmlParts.push(this.escapeHtml(word));
      }
      const marker = this.getAyahMark(ayah);
      if (marker) {
        htmlParts.push(`<span class=\"reading-mark\">${this.escapeHtml(marker)}</span>`);
      }

      const translation = this.getTranslationText(ayah);
      if (translation) {
        translationParts.push(translation.trim());
      }
    }

    const html = htmlParts.join(' ').replace(/\s+/g, ' ').trim();
    this.readingHtml = html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
    this.readingTranslation = translationParts.join(' ').replace(/\s+/g, ' ').trim();
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { TargetedNotesModalService } from '../../../../shared/targeting/targeted-notes-modal.service';
import { makeAyahTarget, makeWordTarget } from '../../../../shared/targeting/targeting.models';
import { LongPressDirective } from '../../../../shared/directives/long-press.directive';
import {
  QuranReaderFallbackVerseViewModel,
  QuranReaderPageAyahSliceViewModel,
  QuranReaderPageLineViewModel,
  QuranReaderPageViewModel,
  QuranReaderWordViewModel,
} from '../../models/quran-reader-view.model';

type QuranReadingWordViewModel = {
  id: string;
  tokenIndex: number;
  text: string;
};

type QuranReadingVerseViewModel = {
  id: string;
  text: string;
  surah: number;
  ayah: number;
  words: QuranReadingWordViewModel[];
  marker: string;
};

type QuranReadingSectionViewModel = {
  id: string;
  heading: string | null;
  basmallah: string | null;
  verses: QuranReadingVerseViewModel[];
};

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;
const ARABIC_DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const BISMILLAH = 'بسم الله الرحمن الرحيم';

@Component({
  selector: 'app-quran-page-renderer',
  standalone: true,
  imports: [CommonModule, LongPressDirective],
  templateUrl: './quran-page-renderer.component.html',
  styleUrl: './quran-page-renderer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranPageRendererComponent {
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly targetedNotesModal = inject(TargetedNotesModalService);

  @Input({ required: true }) page!: QuranReaderPageViewModel;
  @Input() showDiacritics = false;

  get passageSections(): QuranReadingSectionViewModel[] {
    const structured = this.buildStructuredSections();
    if (structured.length) {
      return structured;
    }

    return this.buildFallbackSections();
  }

  get pageNumberLabel(): string {
    return this.toArabicDigits(this.page.meta.pageNumber);
  }

  trackBySection(_: number, section: QuranReadingSectionViewModel): string {
    return section.id;
  }

  trackByVerse(_: number, verse: QuranReadingVerseViewModel): string {
    return verse.id;
  }

  trackByWord(_: number, word: QuranReadingWordViewModel): string {
    return word.id;
  }

  async openTargetMenu(event: Event, verse: QuranReadingVerseViewModel, word?: QuranReadingWordViewModel): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const subHeaderParts = [this.page.header.title, `${verse.surah}:${verse.ayah}`];
    if (word?.text.trim()) {
      subHeaderParts.push(word.text.trim());
    }

    const buttons = [
      word
        ? {
          text: 'Word Note',
          icon: 'text-outline',
          handler: () => {
            void this.openWordNotes(verse, word);
          },
        }
        : null,
      {
        text: 'Verse Note',
        icon: 'book-outline',
        handler: () => {
          void this.openVerseNotes(verse);
        },
      },
      {
        text: 'Cancel',
        icon: 'close-outline',
        role: 'cancel' as const,
      },
    ].filter((button) => button !== null);

    const actionSheet = await this.actionSheetController.create({
      header: 'Add Targeted Note',
      subHeader: subHeaderParts.filter(Boolean).join(' • '),
      cssClass: 'note-target-action-sheet',
      buttons,
    });

    await actionSheet.present();
  }

  private readSurahNumber(verseKey: string): number | null {
    const value = Number.parseInt(verseKey.split(':')[0] ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private readAyahNumber(verseKey: string): number | null {
    const value = Number.parseInt(verseKey.split(':')[1] ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private buildStructuredSections(): QuranReadingSectionViewModel[] {
    const lines = this.page.layout.slots
      .map((slot) => slot.line)
      .filter((line): line is NonNullable<typeof line> => line !== null);

    if (!lines.length) {
      return [];
    }

    const sections: QuranReadingSectionViewModel[] = [];
    let sectionCounter = 0;
    let currentSection: QuranReadingSectionViewModel | null = null;

    const createSection = (seed: Partial<QuranReadingSectionViewModel> = {}): QuranReadingSectionViewModel => {
      currentSection = {
        id: `section-${sectionCounter++}`,
        heading: seed.heading ?? null,
        basmallah: seed.basmallah ?? null,
        verses: seed.verses ?? [],
      };
      sections.push(currentSection);
      return currentSection;
    };

    const ensureSection = (): QuranReadingSectionViewModel => currentSection ?? createSection();

    for (const line of lines) {
      if (line.lineType === 'surah_name') {
        createSection({ heading: this.resolveLineText(line) || null });
        continue;
      }

      if (line.lineType === 'basmallah') {
        const lastSection = sections[sections.length - 1];
        const section = lastSection && lastSection.verses.length === 0 ? lastSection : createSection();
        currentSection = section;
        section.basmallah = this.resolveLineText(line) || BISMILLAH;
        continue;
      }

      if (!line.ayahs.length) {
        continue;
      }

      const section = ensureSection();
      for (const ayah of line.ayahs) {
        const text = this.resolveAyahText(ayah);
        if (!text) {
          continue;
        }

        const ayahNumber = this.readAyahNumber(ayah.verseKey);
        const surahNumber = this.readSurahNumber(ayah.verseKey);
        const lastVerse = section.verses[section.verses.length - 1];

        if (lastVerse && lastVerse.id === ayah.verseKey) {
          lastVerse.text = `${lastVerse.text} ${text}`.replace(/\s+/g, ' ').trim();
          lastVerse.words = this.mergeWords(lastVerse.words, this.resolveWords(ayah.words));
          if (ayahNumber != null) {
            lastVerse.marker = this.normalizeMarker(ayah.marker, ayahNumber);
          }
          continue;
        }

        if (surahNumber == null || ayahNumber == null) {
          continue;
        }

        section.verses.push({
          id: ayah.verseKey,
          text,
          surah: surahNumber,
          ayah: ayahNumber,
          words: this.resolveWords(ayah.words),
          marker: ayahNumber != null ? this.normalizeMarker(ayah.marker, ayahNumber) : '',
        });
      }

      this.stripDuplicateBismillah(section);
    }

    return sections.filter((section) => section.heading || section.basmallah || section.verses.length > 0);
  }

  private buildFallbackSections(): QuranReadingSectionViewModel[] {
    if (!this.page.fallbackVerses.length) {
      return [];
    }

    const verses: QuranReadingVerseViewModel[] = [];

    for (const verse of this.page.fallbackVerses) {
      const ayah = this.readAyahNumber(verse.verseKey);
      const text = this.resolveVerseText(verse);
      if (ayah == null || !text) {
        continue;
      }

      const surah = this.readSurahNumber(verse.verseKey);
      if (surah == null) {
        continue;
      }

      verses.push({
        id: verse.verseKey,
        text,
        surah,
        ayah,
        words: this.resolveWords(verse.words),
        marker: this.normalizeMarker(verse.marker, ayah),
      });
    }

    return verses.length
      ? [{
        id: `fallback-${this.page.meta.pageNumber}`,
        heading: null,
        basmallah: null,
        verses,
      }]
      : [];
  }

  private toArabicDigits(value: number): string {
    return String(value)
      .split('')
      .map((digit) => ARABIC_DIGITS[Number(digit)] ?? digit)
      .join('');
  }

  private normalizeMarker(marker: string | null, ayah: number): string {
    const raw = (marker ?? '').trim();
    const digitsOnly = raw.match(/[0-9\u0660-\u0669]+/g)?.join('') ?? '';
    return digitsOnly || this.toArabicDigits(ayah);
  }

  private resolveLineText(line: QuranReaderPageLineViewModel): string {
    return (this.showDiacritics ? line.textDiacritics : line.text).trim();
  }

  private resolveAyahText(ayah: QuranReaderPageAyahSliceViewModel): string {
    return (this.showDiacritics ? ayah.textDiacritics : ayah.text).trim();
  }

  private resolveVerseText(verse: QuranReaderFallbackVerseViewModel): string {
    return (this.showDiacritics ? verse.textDiacritics : verse.text).trim();
  }

  private resolveWords(words: QuranReaderWordViewModel[]): QuranReadingWordViewModel[] {
    return words
      .map((word) => ({
        id: word.id,
        tokenIndex: word.tokenIndex,
        text: (this.showDiacritics ? word.textDiacritics : word.text).trim(),
      }))
      .filter((word) => word.text.length > 0)
      .sort((left, right) => left.tokenIndex - right.tokenIndex);
  }

  private mergeWords(
    existing: QuranReadingWordViewModel[],
    incoming: QuranReadingWordViewModel[]
  ): QuranReadingWordViewModel[] {
    if (!incoming.length) {
      return existing;
    }

    const seen = new Set(existing.map((word) => word.id));
    return [...existing, ...incoming.filter((word) => !seen.has(word.id))]
      .sort((left, right) => left.tokenIndex - right.tokenIndex);
  }

  private stripDuplicateBismillah(section: QuranReadingSectionViewModel): void {
    if (!section.basmallah || section.verses.length === 0) {
      return;
    }

    const firstVerse = section.verses[0];
    const strippedWords = this.stripLeadingBismillahWords(firstVerse.words, section.basmallah);
    if (strippedWords.length > 0 && strippedWords.length !== firstVerse.words.length) {
      firstVerse.words = strippedWords;
      firstVerse.text = strippedWords.map((word) => word.text).join(' ').trim();
      return;
    }

    const strippedText = this.stripLeadingBismillah(firstVerse.text, section.basmallah);
    if (strippedText.length > 0 && strippedText !== firstVerse.text) {
      firstVerse.text = strippedText;
    }
  }

  private stripLeadingBismillahWords(
    words: QuranReadingWordViewModel[],
    basmallah: string
  ): QuranReadingWordViewModel[] {
    if (words.length < 4) {
      return words;
    }

    const targetTokens = this.tokenizeArabicText(basmallah);
    if (targetTokens.length < 4 || words.length <= targetTokens.length) {
      return words;
    }

    const wordTokens = words.slice(0, targetTokens.length).map((word) => this.normalizeArabicWord(word.text));
    const matches = targetTokens.every((token, index) => token === wordTokens[index]);
    return matches ? words.slice(targetTokens.length) : words;
  }

  private stripLeadingBismillah(text: string, basmallah: string): string {
    const trimmedText = text.trim();
    const trimmedBasmallah = basmallah.trim();
    if (!trimmedText || !trimmedBasmallah) {
      return trimmedText;
    }

    const patterns = [
      this.buildWhitespacePattern(trimmedBasmallah),
      this.buildFlexibleArabicPattern(trimmedBasmallah),
      this.buildFlexibleArabicPattern(BISMILLAH),
    ].filter((pattern, index, list) => pattern.length > 0 && list.indexOf(pattern) === index);

    const stripped = trimmedText.replace(new RegExp(`^(?:${patterns.join('|')})\\s*`), '').trim();
    if (!stripped || stripped === trimmedText) {
      return trimmedText;
    }

    return stripped;
  }

  private buildWhitespacePattern(value: string): string {
    return this.escapeRegExp(value).replace(/\s+/g, '\\s+');
  }

  private buildFlexibleArabicPattern(value: string): string {
    const normalized = this.stripArabicDiacritics(value).replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }

    return normalized
      .split('')
      .map((char) => char === ' ' ? '\\s+' : `${this.escapeRegExp(char)}${ARABIC_DIACRITICS_RE.source}*`)
      .join('');
  }

  private stripArabicDiacritics(value: string): string {
    return value.replace(ARABIC_DIACRITICS_RE, '');
  }

  private tokenizeArabicText(value: string): string[] {
    return this.stripArabicDiacritics(value)
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((token) => this.normalizeArabicWord(token))
      .filter((token) => token.length > 0);
  }

  private normalizeArabicWord(value: string): string {
    return this.stripArabicDiacritics(value)
      .replace(/\u0640/g, '')
      .replace(/[^\u0621-\u063A\u0641-\u064A]/g, '')
      .trim();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async openVerseNotes(verse: QuranReadingVerseViewModel): Promise<void> {
    const target = makeAyahTarget(verse.surah, verse.ayah);
    await this.targetedNotesModal.open({
      target,
      title: 'Verse Notes',
      subtitle: `${this.page.header.title} • ${verse.surah}:${verse.ayah}`,
      placeholder: 'Capture morphology, exegesis, source links, video links, or any note for this ayah...',
      contextText: verse.text,
      contextTextLabel: 'Verse',
    });
  }

  private async openWordNotes(verse: QuranReadingVerseViewModel, word: QuranReadingWordViewModel): Promise<void> {
    const target = makeWordTarget(verse.surah, verse.ayah, word.tokenIndex);
    await this.targetedNotesModal.open({
      target,
      title: 'Word Notes',
      subtitle: `${this.page.header.title} • ${verse.surah}:${verse.ayah}:${word.tokenIndex} • ${word.text}`,
      placeholder: 'Capture morphology, lexicon notes, source links, video links, or any note for this word...',
      contextText: verse.text,
      contextTextLabel: 'Verse',
      contextFocus: `Word • ${word.text}`,
    });
  }
}

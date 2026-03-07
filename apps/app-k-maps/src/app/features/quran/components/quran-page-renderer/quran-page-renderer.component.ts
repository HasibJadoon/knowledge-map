import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  QuranReaderFallbackVerseViewModel,
  QuranReaderPageAyahSliceViewModel,
  QuranReaderPageLineViewModel,
  QuranReaderPageViewModel,
} from '../../models/quran-reader-view.model';

type QuranReadingVerseViewModel = {
  id: string;
  text: string;
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
  imports: [CommonModule],
  templateUrl: './quran-page-renderer.component.html',
  styleUrl: './quran-page-renderer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranPageRendererComponent {
  @Input({ required: true }) page!: QuranReaderPageViewModel;
  @Input() showDiacritics = false;

  get passageSections(): QuranReadingSectionViewModel[] {
    const structured = this.buildStructuredSections();
    if (structured.length) {
      return structured;
    }

    return this.buildFallbackSections();
  }

  trackBySection(_: number, section: QuranReadingSectionViewModel): string {
    return section.id;
  }

  trackByVerse(_: number, verse: QuranReadingVerseViewModel): string {
    return verse.id;
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
        const lastVerse = section.verses[section.verses.length - 1];

        if (lastVerse && lastVerse.id === ayah.verseKey) {
          lastVerse.text = `${lastVerse.text} ${text}`.replace(/\s+/g, ' ').trim();
          if (ayahNumber != null) {
            lastVerse.marker = this.normalizeMarker(ayah.marker, ayahNumber);
          }
          continue;
        }

        section.verses.push({
          id: ayah.verseKey,
          text,
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

      verses.push({
        id: verse.verseKey,
        text,
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

  private stripDuplicateBismillah(section: QuranReadingSectionViewModel): void {
    if (!section.basmallah || section.verses.length === 0) {
      return;
    }

    const firstVerse = section.verses[0];
    const strippedText = this.stripLeadingBismillah(firstVerse.text, section.basmallah);
    if (strippedText.length > 0) {
      firstVerse.text = strippedText;
    }
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

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

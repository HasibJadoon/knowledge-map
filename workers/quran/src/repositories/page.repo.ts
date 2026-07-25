// ─── PageRepo — Mushaf page rendering ──────────────────────────────────────────
// Loads one mushaf page: ayahs, words, surahs, layout lines, default translation.
// Tables: qr_ayah, qr_word_occurrence, qr_surah, qr_mushaf_layout_line,
//         qr_translation, qr_translation_source

import { query, queryOne } from '../../../shared/src/db';
import {
  QR_MAX_PAGE,
  type QrPage,
  type QrPageLayoutAyah,
  type QrPageLayoutLine,
  type QrPageLineKind,
  type QrPageSurah,
  type QrPageWord,
} from '../schemas/page.schema';

// ─── constants ─────────────────────────────────────────────────────────────────

const BISMILLAH_ARABIC = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const BISMILLAH_CLEAN  = 'بسم الله الرحمن الرحيم';
const ARABIC_DIGITS    = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicNum(n: number): string {
  return String(n).split('').map(d => ARABIC_DIGITS[+d] ?? d).join('');
}

function toLineKind(raw: string): QrPageLineKind {
  if (raw === 'surah_name' || raw === 'basmallah') return raw;
  return 'ayah';
}

// ─── DB row shapes ──────────────────────────────────────────────────────────────

interface PageAyah {
  surah: number;
  ayah: number;
  text_arabic: string;
  verse_mark: string | null;
  page_number: number;
}

type PageWord = QrPageWord;
type PageSurah = QrPageSurah;

interface LayoutLineRow {
  line_number: number;
  line_type?: string | null;
  is_centered?: number | null;
  first_word_id?: string | null;
  last_word_id?: string | null;
  surah_number?: number | null;
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  word_from_index?: number | null;
  word_to_index?: number | null;
}

// ─── PageRepo ───────────────────────────────────────────────────────────────────

export class PageRepo {
  constructor(private db: D1Database) {}

  /**
   * Load a complete mushaf page with ayahs, words, surahs, and layout lines.
   * Returns null if the page number has no ayahs.
   */
  async byPageNumber(pageNo: number): Promise<QrPage | null> {
    // 1. Ayahs on this page — drives everything else
    const ayahs = await query<PageAyah>(
      this.db,
      `SELECT surah, ayah,
              COALESCE(text_uthmani_clean, text_uthmani, text_bare, text) AS text_arabic,
              verse_mark, page_number
       FROM qr_ayah
       WHERE page_number = ?
       ORDER BY surah, ayah`,
      [pageNo],
    );
    if (!ayahs.length) return null;

    const surahIds = [...new Set(ayahs.map(r => r.surah))];
    const surahPh  = surahIds.map(() => '?').join(', ');

    // 2. Parallel: words (JOIN on page so we get all words for all ayahs in one query),
    //    surahs present on this page, layout lines, default translation source
    const [words, surahs, layoutRows, defaultSrc] = await Promise.all([
      query<PageWord>(
        this.db,
        `SELECT w.id,
                w.surah,
                w.ayah,
                w.word_index AS word_position,
                w.word_text AS text_uthmani,
                w.word_text_bare AS text_clean,
                w.lemma AS lx_lemma_ref,
                w.root AS root_text,
                w.pos AS pos_tag,
                w.morphology_tag,
                w.morphology_tag_json
         FROM qr_word_occurrence w
         JOIN qr_ayah a ON a.surah = w.surah AND a.ayah = w.ayah
         WHERE a.page_number = ?
         ORDER BY w.surah, w.ayah, w.word_position`,
        [pageNo],
      ).catch(() => []),
      query<PageSurah>(
        this.db,
        `SELECT id, name_ar, name_en, name_transliteration,
                revelation_type, ayah_count, juz_start, page_start
         FROM qr_surah
         WHERE id IN (${surahPh})
         ORDER BY id`,
        surahIds,
      ).catch(() => []),
      query<LayoutLineRow>(
        this.db,
        `SELECT line_number,
                'ayah' AS line_type,
                0 AS is_centered,
                NULL AS first_word_id,
                NULL AS last_word_id,
                surah AS surah_number,
                surah,
                ayah_from,
                ayah_to,
                word_from_index,
                word_to_index
         FROM qr_mushaf_layout_line
         WHERE page_number = ?
         ORDER BY line_number`,
        [pageNo],
      ).catch(() => []),
      queryOne<{ id: string }>(
        this.db,
        `SELECT id FROM qr_translation_source WHERE is_default = 1 LIMIT 1`,
      ).catch(() => null),
    ]);

    // 3. Load default translations (may be empty if no default source is configured)
    const translations = defaultSrc
      ? await query<{ surah: number; ayah: number; text: string }>(
          this.db,
          `SELECT t.surah, t.ayah, t.text
           FROM qr_translation t
           JOIN qr_ayah a ON a.surah = t.surah AND a.ayah = t.ayah
           WHERE a.page_number = ? AND t.source_id = ?
           ORDER BY t.surah, t.ayah`,
          [pageNo, defaultSrc.id],
        ).catch(() => [])
      : [];

    // 4. Build lookup maps
    const wordsByVerse = new Map<string, PageWord[]>();
    for (const w of words) {
      const k = `${w.surah}:${w.ayah}`;
      if (!wordsByVerse.has(k)) wordsByVerse.set(k, []);
      wordsByVerse.get(k)!.push(w);
    }

    // maxPosByAyah lets us detect the true last word of each ayah on this page.
    // Because qr_ayah.page_number identifies which page an ayah belongs to,
    // ALL words of each ayah on this page appear in `words`. This means
    // the maximum word_position we see for each ayah is the genuine last word.
    const maxPosByAyah = new Map<string, number>();
    for (const w of words) {
      const k = `${w.surah}:${w.ayah}`;
      if ((maxPosByAyah.get(k) ?? 0) < w.word_position) maxPosByAyah.set(k, w.word_position);
    }

    const transByVerse  = new Map<string, string>(translations.map(t => [`${t.surah}:${t.ayah}`, t.text]));
    const ayahByVerse   = new Map<string, PageAyah>(ayahs.map(a => [`${a.surah}:${a.ayah}`, a]));
    const surahById     = new Map<number, PageSurah>(surahs.map(s => [s.id, s]));

    // 5. Build ayah response objects
    const ayahObjs = ayahs.map(a => {
      const k = `${a.surah}:${a.ayah}`;
      return {
        surah:       a.surah,
        ayah:        a.ayah,
        verse_key:   k,
        text_arabic: a.text_arabic,
        verse_mark:  a.verse_mark ?? toArabicNum(a.ayah),
        translation: transByVerse.get(k) ?? null,
        words:       wordsByVerse.get(k) ?? [],
      };
    });

    // 6. Build layout lines
    const layout: QrPageLayoutLine[] = layoutRows
      .map(line => {
        const kind = line.line_type ? toLineKind(line.line_type) : 'ayah';
        let text_arabic = '';
        let text_clean: string | null = null;
        let lineWords: PageWord[] = [];

        if (kind === 'surah_name') {
          const s     = surahById.get(line.surah_number ?? 0);
          text_arabic = s ? `سورة ${s.name_ar}` : '';
          text_clean  = text_arabic || null;
        } else if (kind === 'basmallah') {
          text_arabic = BISMILLAH_ARABIC;
          text_clean  = BISMILLAH_CLEAN;
        } else if (line.first_word_id && line.last_word_id) {
          // ULID range comparison works because word ULIDs are inserted in
          // corpus order (surah → ayah → word_position) and ULIDs encode
          // timestamp monotonically — lexicographic >= / <= is correct.
          lineWords   = words.filter(
            w => w.id >= line.first_word_id! && w.id <= line.last_word_id!,
          );
          [text_arabic, text_clean] = this._lineText(lineWords, ayahByVerse, maxPosByAyah);
        } else if (line.surah && line.ayah_from && line.ayah_to) {
          lineWords = words.filter(w =>
            w.surah === line.surah &&
            w.ayah >= line.ayah_from! &&
            w.ayah <= line.ayah_to! &&
            (line.word_from_index == null || w.word_position >= line.word_from_index) &&
            (line.word_to_index == null || w.word_position <= line.word_to_index)
          );
          [text_arabic, text_clean] = this._lineText(lineWords, ayahByVerse, maxPosByAyah);
        }

        if (!text_arabic && !lineWords.length) return null;

        return {
          line_number:  line.line_number,
          line_type:    kind,
          is_centered:  line.is_centered === 1,
          surah_number: line.surah_number ?? null,
          text_arabic,
          text_clean,
          ayahs: kind === 'ayah'
            ? this._lineAyahs(lineWords, ayahByVerse, maxPosByAyah)
            : [],
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    return {
      page: {
        number:     pageNo,
        prev_page:  pageNo > 1 ? pageNo - 1 : null,
        next_page:  pageNo < QR_MAX_PAGE ? pageNo + 1 : null,
        ayah_count: ayahs.length,
        start_ref:  `${ayahs[0].surah}:${ayahs[0].ayah}`,
        end_ref:    `${ayahs[ayahs.length - 1].surah}:${ayahs[ayahs.length - 1].ayah}`,
      },
      surahs,
      ayahs: ayahObjs,
      layout_lines: layout,
    };
  }

  /**
   * Distinct, ordered page numbers for every ayah in a surah.
   * Use for "surah pages" navigation.
   */
  pagesBySurah(surahId: number): Promise<{ page_number: number }[]> {
    return query<{ page_number: number }>(
      this.db,
      `SELECT DISTINCT page_number
       FROM qr_ayah
       WHERE surah = ? AND page_number IS NOT NULL
       ORDER BY page_number`,
      [surahId],
    );
  }

  // ─── private helpers ──────────────────────────────────────────────────────────

  /**
   * Build the diacritical and clean text for a layout line.
   * Verse markers are appended only after the TRUE last word of each ayah
   * (detected via maxPosByAyah).
   */
  private _lineText(
    lineWords: PageWord[],
    ayahByVerse: Map<string, PageAyah>,
    maxPosByAyah: Map<string, number>,
  ): [string, string | null] {
    const arabic: string[] = [];
    const clean: string[]  = [];

    for (let i = 0; i < lineWords.length; i++) {
      const w    = lineWords[i];
      const next = lineWords[i + 1];

      if (w.text_uthmani) arabic.push(w.text_uthmani);
      clean.push(w.text_clean ?? w.text_uthmani);

      // Append verse marker only when this is the last word of its ayah
      // AND it is truly the final word (not mid-ayah at end of line).
      const endOfAyahInLine = !next || next.surah !== w.surah || next.ayah !== w.ayah;
      const isLastWord      = endOfAyahInLine &&
        w.word_position === maxPosByAyah.get(`${w.surah}:${w.ayah}`);

      if (isLastWord) {
        const a      = ayahByVerse.get(`${w.surah}:${w.ayah}`);
        const marker = a ? (a.verse_mark ?? toArabicNum(a.ayah)) : '';
        if (marker) { arabic.push(marker); clean.push(marker); }
      }
    }

    const t = arabic.join(' ').replace(/\s+/g, ' ').trim();
    const c = clean.join(' ').replace(/\s+/g, ' ').trim();
    return [t, c !== t ? c : null];
  }

  /**
   * Group the words of a layout line into per-ayah segments.
   * Used by the frontend to render word-level tooltips and tapable words.
   */
  private _lineAyahs(
    lineWords: PageWord[],
    ayahByVerse: Map<string, PageAyah>,
    maxPosByAyah: Map<string, number>,
  ): QrPageLayoutAyah[] {
    const grouped = new Map<string, PageWord[]>();
    for (const w of lineWords) {
      const k = `${w.surah}:${w.ayah}`;
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k)!.push(w);
    }

    return [...grouped.entries()].map(([k, ws]) => {
      const a        = ayahByVerse.get(k);
      const lastWord = ws[ws.length - 1];
      const isEnd    = lastWord &&
        lastWord.word_position === maxPosByAyah.get(k);

      return {
        surah:     ws[0].surah,
        ayah:      ws[0].ayah,
        verse_key: k,
        marker:    isEnd && a ? (a.verse_mark ?? toArabicNum(a.ayah)) : null,
        words:     ws,
      };
    });
  }
}

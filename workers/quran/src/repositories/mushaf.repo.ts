import { query } from '../../../shared/src/db';
import {
  QR_MUSHAF_DEFAULT_LAYOUT,
  QR_MUSHAF_MAX_PAGE,
  type QrMushafLineAyah,
  type QrMushafPage,
  type QrMushafToken,
} from '../schemas/mushaf.schema';

interface MushafLineRow {
  line_number: number;
  line_type: 'ayah' | 'surah_name' | 'basmallah';
  is_centered: number;
  first_token_id: number | null;
  last_token_id: number | null;
  surah_number: number | null;
  text_qpc_hafs: string;
  tokens_json: string;
}

interface SurahRow {
  id: number;
  name_ar: string;
  name_en: string | null;
  name_transliteration: string | null;
  revelation_type: string | null;
  ayah_count: number;
  juz_start: number | null;
  page_start: number | null;
}

const BISMILLAH = '﷽';

export class MushafRepo {
  constructor(private db: D1Database) {}

  async byPageNumber(pageNo: number, layoutKey = QR_MUSHAF_DEFAULT_LAYOUT): Promise<QrMushafPage | null> {
    const rows = await query<MushafLineRow>(
      this.db,
      `SELECT line_number, line_type, is_centered, first_token_id, last_token_id,
              surah_number, text_qpc_hafs, tokens_json
       FROM qr_mushaf_layout_lines
       WHERE layout_key = ? AND page_number = ?
       ORDER BY line_number`,
      [layoutKey, pageNo],
    );

    if (!rows.length) return null;

    const allTokens = rows.flatMap(row => this.parseTokens(row.tokens_json));
    const tokenSurahIds = new Set(allTokens.map(token => token.surah));
    for (const row of rows) {
      if (row.surah_number) tokenSurahIds.add(row.surah_number);
    }

    const surahIds = [...tokenSurahIds].sort((a, b) => a - b);
    const surahs = surahIds.length
      ? await query<SurahRow>(
          this.db,
          `SELECT id, name_ar, name_en, name_transliteration,
                  revelation_type, ayah_count, juz_start, page_start
           FROM qr_surahs
           WHERE id IN (${surahIds.map(() => '?').join(',')})
           ORDER BY id`,
          surahIds,
        )
      : [];

    const ayahMap = new Map<string, { surah: number; ayah: number; marker: string | null; words: QrMushafLineAyah['words'] }>();
    for (const token of allTokens) {
      const key = `${token.surah}:${token.ayah}`;
      const entry = ayahMap.get(key) ?? { surah: token.surah, ayah: token.ayah, marker: null, words: [] };
      if (token.char_type === 'end') {
        entry.marker = token.text_qpc_hafs;
      } else {
        entry.words.push(this.toWord(token));
      }
      ayahMap.set(key, entry);
    }

    const ayahs = [...ayahMap.values()].sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
    const start = ayahs[0];
    const end = ayahs[ayahs.length - 1];

    return {
      page: {
        number: pageNo,
        prev_page: pageNo > 1 ? pageNo - 1 : null,
        next_page: pageNo < QR_MUSHAF_MAX_PAGE ? pageNo + 1 : null,
        ayah_count: ayahs.length,
        start_ref: start ? `${start.surah}:${start.ayah}` : '',
        end_ref: end ? `${end.surah}:${end.ayah}` : '',
      },
      layout: {
        key: layoutKey,
        source: 'data/quran-layouts/digital-khatt-15-lines.db',
        lines_per_page: 15,
      },
      surahs,
      ayahs: ayahs.map(ayah => ({
        surah: ayah.surah,
        ayah: ayah.ayah,
        verse_key: `${ayah.surah}:${ayah.ayah}`,
        text_arabic: [...ayah.words.map(word => word.text_uthmani), ayah.marker].filter(Boolean).join(' '),
        verse_mark: ayah.marker,
        translation: null,
        words: ayah.words,
      })),
      layout_lines: rows.map(row => this.toLine(row)),
    };
  }

  private toLine(row: MushafLineRow) {
    const tokens = this.parseTokens(row.tokens_json);
    const grouped = new Map<string, QrMushafLineAyah>();

    for (const token of tokens) {
      const key = `${token.surah}:${token.ayah}`;
      const ayah = grouped.get(key) ?? {
        surah: token.surah,
        ayah: token.ayah,
        verse_key: key,
        marker: null,
        words: [],
      };

      if (token.char_type === 'end') ayah.marker = token.text_qpc_hafs;
      else ayah.words.push(this.toWord(token));
      grouped.set(key, ayah);
    }

    return {
      line_number: row.line_number,
      line_type: row.line_type,
      is_centered: row.is_centered === 1,
      surah_number: row.surah_number,
      first_token_id: row.first_token_id,
      last_token_id: row.last_token_id,
      text_arabic: row.line_type === 'basmallah' ? BISMILLAH : row.text_qpc_hafs,
      text_clean: null,
      ayahs: [...grouped.values()],
    };
  }

  private toWord(token: QrMushafToken): QrMushafLineAyah['words'][number] {
    return {
      id: String(token.token_id),
      surah: token.surah,
      ayah: token.ayah,
      word_position: token.position,
      text_uthmani: token.text_qpc_hafs,
      text_clean: null,
      lx_lemma_ref: null,
      root_text: null,
      pos_tag: null,
      morphology_tag: null,
      morphology_tag_json: null,
    };
  }

  private parseTokens(raw: string): QrMushafToken[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as QrMushafToken[] : [];
    } catch {
      return [];
    }
  }
}

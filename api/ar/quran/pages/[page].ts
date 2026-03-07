import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

type VerseRow = {
  id: number;
  surah: number;
  ayah: number;
  surah_ayah: number;
  page: number | null;
  juz: number | null;
  hizb: number | null;
  ruku: number | null;
  text: string;
  text_simple: string | null;
  verse_mark: string | null;
  verse_full: string | null;
  word_count: number | null;
  char_count: number | null;
  translation_haleem: string | null;
  translation_asad: string | null;
  translation_sahih: string | null;
  translation_usmani: string | null;
};

type WordRow = {
  surah: number;
  ayah: number;
  position: number;
  text: string | null;
  simple: string | null;
  translation: string | null;
  lemma: string | null;
  root: string | null;
  page: number | null;
  line: number | null;
};

type SurahPageRow = {
  surah: number;
  name_ar: string;
  name_en: string | null;
  ayah_count: number | null;
  meta_json: unknown;
  start_page: number | null;
  start_juz: number | null;
};

type MaxPageRow = {
  max_page: number | null;
};

function safeJson(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function textValue(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function intValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function summarizeSurahMeta(value: unknown) {
  const meta = safeJson(value);
  const revelationRaw = meta['revelation'];
  const revelation =
    revelationRaw && typeof revelationRaw === 'object' && !Array.isArray(revelationRaw)
      ? (revelationRaw as Record<string, unknown>)
      : {};

  return {
    name_simple: textValue(meta['nameSimple']),
    revelation_place: textValue(revelation['place']),
    revelation_order: intValue(revelation['order']),
    bismillah_pre: boolValue(revelation['bismillahPre']),
  };
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const pageNo = Number.parseInt(String(ctx.params?.page ?? ''), 10);
  if (!Number.isFinite(pageNo) || pageNo < 1) {
    return new Response(JSON.stringify({ ok: false, error: 'Page number must be a positive integer.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  try {
    const verseStmt = ctx.env.DB.prepare(
      `
      SELECT
        a.id,
        a.surah,
        a.ayah,
        a.surah_ayah,
        a.page,
        a.juz,
        a.hizb,
        a.ruku,
        a.text,
        a.text_simple,
        a.verse_mark,
        a.verse_full,
        a.word_count,
        a.char_count,
        t.translation_haleem,
        t.translation_asad,
        t.translation_sahih,
        t.translation_usmani
      FROM ar_quran_ayah a
      LEFT JOIN ar_quran_translations t
        ON t.surah = a.surah
       AND t.ayah = a.ayah
      WHERE a.page = ?1
      ORDER BY a.surah ASC, a.ayah ASC
    `
    );

    const wordStmt = ctx.env.DB.prepare(
      `
      SELECT
        surah,
        ayah,
        position,
        text,
        simple,
        translation,
        lemma,
        root,
        page,
        line
      FROM ar_u_quran_ayah_words
      WHERE page = ?1
      ORDER BY surah ASC, ayah ASC, position ASC
    `
    );

    const maxPageStmt = ctx.env.DB.prepare(`
      SELECT MAX(page) AS max_page
      FROM ar_quran_ayah
    `);

    const [{ results: verseRowsRaw = [] }, { results: wordRowsRaw = [] }, maxPageRow] = await Promise.all([
      verseStmt.bind(pageNo).all<VerseRow>(),
      wordStmt.bind(pageNo).all<WordRow>(),
      maxPageStmt.first<MaxPageRow>(),
    ]);

    const verseRows = (verseRowsRaw ?? []) as VerseRow[];
    if (!verseRows.length) {
      return new Response(JSON.stringify({ ok: false, error: `Quran page ${pageNo} not found.` }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const surahIds = Array.from(new Set(verseRows.map((row) => row.surah)));
    const surahPlaceholders = surahIds.map((_, index) => `?${index + 1}`).join(', ');
    const surahStmt = ctx.env.DB.prepare(
      `
      SELECT
        s.surah,
        s.name_ar,
        s.name_en,
        s.ayah_count,
        s.meta_json,
        a.page AS start_page,
        a.juz AS start_juz
      FROM ar_quran_surahs s
      LEFT JOIN ar_quran_ayah a
        ON a.surah = s.surah
       AND a.ayah = 1
      WHERE s.surah IN (${surahPlaceholders})
      ORDER BY s.surah ASC
    `
    );
    const { results: surahRowsRaw = [] } = await surahStmt.bind(...surahIds).all<SurahPageRow>();

    const wordRows = (wordRowsRaw ?? []) as WordRow[];
    const wordsByVerse = new Map<string, WordRow[]>();
    for (const row of wordRows) {
      const key = `${row.surah}:${row.ayah}`;
      const words = wordsByVerse.get(key) ?? [];
      words.push(row);
      wordsByVerse.set(key, words);
    }

    const surahs = (surahRowsRaw ?? []).map((row) => ({
      surah: row.surah,
      name_ar: row.name_ar,
      name_en: row.name_en ?? null,
      ayah_count: row.ayah_count ?? null,
      start_page: row.start_page ?? null,
      start_juz: row.start_juz ?? null,
      meta: summarizeSurahMeta(row.meta_json),
    }));

    const juzs = Array.from(
      new Set(verseRows.map((row) => row.juz).filter((value): value is number => value != null))
    ).sort((a, b) => a - b);
    const hizbs = Array.from(
      new Set(verseRows.map((row) => row.hizb).filter((value): value is number => value != null))
    ).sort((a, b) => a - b);

    const verses = verseRows.map((row) => {
      const verseKey = `${row.surah}:${row.ayah}`;
      const words = (wordsByVerse.get(verseKey) ?? []).map((word) => ({
        position: word.position,
        text: word.text ?? null,
        simple: word.simple ?? null,
        translation: word.translation ?? null,
        lemma: word.lemma ?? null,
        root: word.root ?? null,
        page: word.page ?? null,
        line: word.line ?? null,
      }));

      return {
        id: row.id,
        surah: row.surah,
        ayah: row.ayah,
        surah_ayah: row.surah_ayah,
        verse_key: verseKey,
        page: row.page ?? null,
        juz: row.juz ?? null,
        hizb: row.hizb ?? null,
        ruku: row.ruku ?? null,
        text: row.text,
        text_simple: row.text_simple ?? null,
        verse_mark: row.verse_mark ?? null,
        verse_full: row.verse_full ?? null,
        word_count: row.word_count ?? null,
        char_count: row.char_count ?? null,
        translation:
          row.translation_haleem ??
          row.translation_asad ??
          row.translation_sahih ??
          row.translation_usmani ??
          null,
        words,
      };
    });

    return new Response(
      JSON.stringify({
        ok: true,
        page: {
          number: pageNo,
          prev_page: pageNo > 1 ? pageNo - 1 : null,
          next_page: pageNo < (maxPageRow?.max_page ?? pageNo) ? pageNo + 1 : null,
          verse_count: verses.length,
          start_ref: `${verseRows[0]!.surah}:${verseRows[0]!.ayah}`,
          end_ref: `${verseRows[verseRows.length - 1]!.surah}:${verseRows[verseRows.length - 1]!.ayah}`,
          juzs,
          hizbs,
        },
        surahs,
        verses,
      }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    console.error('quran page load error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load Quran page.' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

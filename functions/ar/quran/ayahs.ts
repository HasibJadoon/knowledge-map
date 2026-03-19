import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeJson(value: unknown) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  return null;
}

type SurahRow = {
  surah: number;
  name_ar: string;
  name_en: string | null;
  ayah_count: number | null;
  meta_json: unknown;
};

type AyahRow = {
  id: number;
  surah: number;
  ayah: number;
  surah_ayah: number;
  page: number | null;
  juz: number | null;
  hizb: number | null;
  ruku: number | null;

  surah_name_ar: string | null;
  surah_name_en: string | null;

  text: string;
  text_simple: string | null;
  text_normalized: string | null;

  text_diacritics: string | null;
  text_no_diacritics: string | null;

  verse_mark: string | null;
  verse_full: string | null;

  word_count: number | null;
  char_count: number | null;
  words: string | null;
};

type TranslationRow = {
  surah: number;
  ayah: number;
  translation_haleem: string | null;
  footnotes_haleem: string | null;
  translation_asad: string | null;
  translation_sahih: string | null;
  translation_usmani: string | null;
  footnotes_sahih: string | null;
  footnotes_usmani: string | null;
  meta_json: unknown;
};

type TranslationSourceRow = {
  source_key: string;
  title: string;
  translator: string | null;
  language: string | null;
  publisher: string | null;
  year: number | null;
  isbn: string | null;
  edition: string | null;
  rights: string | null;
  source_path: string | null;
  meta_json: unknown;
};

type TranslationPassageRow = {
  id: number;
  source_key: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  passage_index: number;
  page_pdf: number | null;
  page_book: number | null;
  text: string | null;
  meta_json: unknown;
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const url = new URL(ctx.request.url);
  const surah = Number.parseInt(String(url.searchParams.get('surah') ?? ''), 10);
  if (!Number.isFinite(surah) || surah < 1 || surah > 114) {
    return new Response(JSON.stringify({ ok: false, error: 'surah query param is required (1-114).' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const page = Math.max(1, toInt(url.searchParams.get('page'), 1));
  const pageSizeDefault = Math.min(500, Math.max(25, toInt(url.searchParams.get('pageSize'), 300)));

  let limit = pageSizeDefault;
  let offset = (page - 1) * pageSizeDefault;

  const offsetParam = url.searchParams.get('offset');
  const limitParam = url.searchParams.get('limit');
  if (offsetParam !== null || limitParam !== null) {
    limit = Math.min(500, Math.max(1, toInt(limitParam, pageSizeDefault)));
    offset = Math.max(0, toInt(offsetParam, 0));
  }

  try {
    // 1) Surah header (top envelope)
    const surahStmt = ctx.env.DB
      .prepare(
        `
        SELECT surah, name_ar, name_en, ayah_count, meta_json
        FROM ar_quran_surahs
        WHERE surah = ?1
      `
      )
      .bind(surah);

    const surahRow = (await surahStmt.first()) as SurahRow | null;
    if (!surahRow) {
      return new Response(JSON.stringify({ ok: false, error: `Surah ${surah} not found.` }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // 2) Total verses count (for pagination UI)
    const countStmt = ctx.env.DB.prepare(`SELECT COUNT(*) AS total FROM ar_quran_ayah WHERE surah = ?1`).bind(surah);
    const countRes = await countStmt.first();
    const total = Number(countRes?.total ?? 0);

    // 3) Fetch the verse window
    const ayahStmt = ctx.env.DB.prepare(
      `
      SELECT
        id,
        surah,
        ayah,
        surah_ayah,
        page,
        juz,
        hizb,
        ruku,
        surah_name_ar,
        surah_name_en,
        text,
        text_simple,
        text_normalized,
        text_diacritics,
        text_no_diacritics,
        verse_mark,
        verse_full,
        word_count,
        char_count,
        words
      FROM ar_quran_ayah
      WHERE surah = ?1
      ORDER BY ayah ASC
      LIMIT ?2
      OFFSET ?3
    `
    );

    const { results: ayahRowsRaw = [] } = await ayahStmt.bind(surah, limit, offset).all<AyahRow>();
    const ayahRows = (ayahRowsRaw ?? []) as AyahRow[];

    // If no verses, still return envelope
    if (!ayahRows.length) {
      return new Response(
        JSON.stringify({
          ok: true,
          surah: {
            surah: surahRow.surah,
            name_ar: surahRow.name_ar,
            name_en: surahRow.name_en ?? null,
            ayah_count: surahRow.ayah_count ?? null,
            meta: safeJson(surahRow.meta_json),
          },
          total,
          page,
          pageSize: limit,
          verses: [],
        }),
        { headers: jsonHeaders }
      );
    }

    // Compute min/max ayah in the window so we can fetch words+translations by range
    let minAyah = ayahRows[0]!.ayah;
    let maxAyah = ayahRows[ayahRows.length - 1]!.ayah;

    // 4) Fetch translations for the window
    const trStmt = ctx.env.DB.prepare(
      `
      SELECT
        surah,
        ayah,
        translation_haleem,
        footnotes_haleem,
        translation_asad,
        translation_sahih,
        translation_usmani,
        footnotes_sahih,
        footnotes_usmani,
        meta_json
      FROM ar_quran_translations
      WHERE surah = ?1
        AND ayah BETWEEN ?2 AND ?3
      ORDER BY ayah ASC
    `
    );

    const { results: trRowsRaw = [] } = await trStmt.bind(surah, minAyah, maxAyah).all<TranslationRow>();
    const trRows = (trRowsRaw ?? []) as TranslationRow[];

    const trByAyah = new Map<number, TranslationRow>();
    for (const t of trRows) trByAyah.set(t.ayah, t);

    const translationSourceKey = 'haleem-2004';
    const sourceStmt = ctx.env.DB.prepare(
      `
      SELECT
        source_key,
        title,
        translator,
        language,
        publisher,
        year,
        isbn,
        edition,
        rights,
        source_path,
        meta_json
      FROM ar_quran_translation_sources
      WHERE source_key = ?1
    `
    );
    const sourceRow = (await sourceStmt.bind(translationSourceKey).first()) as TranslationSourceRow | null;

    const passageStmt = ctx.env.DB.prepare(
      `
      SELECT
        id,
        source_key,
        surah,
        ayah_from,
        ayah_to,
        passage_index,
        page_pdf,
        page_book,
        text,
        meta_json
      FROM ar_quran_translation_passages
      WHERE source_key = ?1
        AND surah = ?2
      ORDER BY passage_index ASC
    `
    );
    const { results: passageRowsRaw = [] } = await passageStmt
      .bind(translationSourceKey, surah)
      .all<TranslationPassageRow>();
    const passageRows = (passageRowsRaw ?? []) as TranslationPassageRow[];

    const translationSource = sourceRow
      ? {
          source_key: sourceRow.source_key,
          title: sourceRow.title,
          translator: sourceRow.translator ?? null,
          language: sourceRow.language ?? null,
          publisher: sourceRow.publisher ?? null,
          year: sourceRow.year ?? null,
          isbn: sourceRow.isbn ?? null,
          edition: sourceRow.edition ?? null,
          rights: sourceRow.rights ?? null,
          source_path: sourceRow.source_path ?? null,
          meta: safeJson(sourceRow.meta_json),
        }
      : null;

    const translationPassages = passageRows.map((row) => ({
      id: row.id,
      source_key: row.source_key,
      surah: row.surah,
      ayah_from: row.ayah_from,
      ayah_to: row.ayah_to,
      passage_index: row.passage_index,
      page_pdf: row.page_pdf ?? null,
      page_book: row.page_book ?? null,
      text: row.text ?? null,
      meta: safeJson(row.meta_json),
    }));

    // 5) Build final envelope
    const verses = ayahRows.map((v) => {
      const t = trByAyah.get(v.ayah) ?? null;

      const translations = t
        ? {
            haleem: t.translation_haleem ?? null,
            footnotes_haleem: t.footnotes_haleem ? safeJson(t.footnotes_haleem) ?? t.footnotes_haleem : null,
            asad: t.translation_asad ?? null,
            sahih: t.translation_sahih ?? null,
            usmani: t.translation_usmani ?? null,
            footnotes_sahih: t.footnotes_sahih ?? null,
            footnotes_usmani: t.footnotes_usmani ?? null,
            meta: safeJson(t.meta_json),
          }
        : null;

      const translation =
        t?.translation_haleem ??
        t?.translation_asad ??
        t?.translation_sahih ??
        t?.translation_usmani ??
        null;

      const words = (safeJson(v.words) as any[]) ?? [];

      return {
        id: v.id,
        surah: v.surah,
        ayah: v.ayah,
        surah_ayah: v.surah_ayah,

        page: v.page ?? null,
        juz: v.juz ?? null,
        hizb: v.hizb ?? null,
        ruku: v.ruku ?? null,

        surah_name_ar: v.surah_name_ar ?? surahRow.name_ar,
        surah_name_en: v.surah_name_en ?? surahRow.name_en ?? null,

        text: v.text,
        text_simple: v.text_simple ?? null,
        text_normalized: v.text_normalized ?? null,
        text_diacritics: v.text_diacritics ?? null,
        text_no_diacritics: v.text_no_diacritics ?? null,

        verse_mark: v.verse_mark ?? null,
        verse_full: v.verse_full ?? null,

        word_count: v.word_count ?? null,
        char_count: v.char_count ?? null,

        verse_key: `${v.surah}:${v.ayah}`,
        verse_number: v.ayah,
        chapter_id: v.surah,

        text_uthmani: v.text,
        text_imlaei_simple: v.text_simple ?? null,

        page_number: v.page ?? null,
        juz_number: v.juz ?? null,
        hizb_number: v.hizb ?? null,
        ruku_number: v.ruku ?? null,

        translation,
        translations,
        words,
      };
    });

    return new Response(
      JSON.stringify({
        ok: true,
        surah: {
          surah: surahRow.surah,
          name_ar: surahRow.name_ar,
          name_en: surahRow.name_en ?? null,
          ayah_count: surahRow.ayah_count ?? null,
          meta: safeJson(surahRow.meta_json),
        },
        translation_source: translationSource,
        translation_passages: translationPassages,
        total,
        page,
        pageSize: limit,
        verses,
      }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    console.error('surah envelope error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load surah envelope' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

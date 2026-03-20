import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
interface Env {
  DB: D1Database;
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
  text_diacritics: string | null;
  text_non_diacritics: string | null;
  text_no_diacritics: string | null;
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
  word_id: number | null;
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

type LayoutRow = {
  page_number: number;
  line_number: number;
  line_type: string;
  is_centered: number | null;
  first_word_id: number | null;
  last_word_id: number | null;
  surah_number: number | null;
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

const BISMILLAH_DIACRITIC = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const BISMILLAH_PLAIN = 'بسم الله الرحمن الرحيم';
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

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

function toArabicDigits(value: number): string {
  return String(value)
    .split('')
    .map((digit) => ARABIC_DIGITS[Number(digit)] ?? digit)
    .join('');
}

function formatVerseMarker(verse: Pick<VerseRow, 'ayah' | 'verse_mark'>): string {
  const marker = textValue(verse.verse_mark);
  return marker ?? toArabicDigits(verse.ayah);
}

function normalizeLayoutLineType(value: unknown): 'ayah' | 'surah_name' | 'basmallah' {
  if (value === 'surah_name' || value === 'basmallah') return value;
  return 'ayah';
}

function buildSurahLineText(name: string | null): string {
  if (!name) return '';
  return `سورة ${name}`;
}

function toPageWord(word: WordRow) {
  return {
    word_id: word.word_id ?? null,
    surah: word.surah,
    ayah: word.ayah,
    position: word.position,
    text: word.text ?? null,
    simple: word.simple ?? null,
    translation: word.translation ?? null,
    lemma: word.lemma ?? null,
    root: word.root ?? null,
    page: word.page ?? null,
    line: word.line ?? null,
  };
}

function buildLayoutAyahs(words: WordRow[], versesByKey: Map<string, VerseRow>) {
  const ayahs: Array<{
    surah: number;
    ayah: number;
    verse_key: string;
    marker: string | null;
    is_complete: boolean;
    words: ReturnType<typeof toPageWord>[];
  }> = [];

  let currentKey = '';
  let currentWords: WordRow[] = [];

  const flush = () => {
    if (!currentWords.length) return;

    const firstWord = currentWords[0]!;
    const verseKey = `${firstWord.surah}:${firstWord.ayah}`;
    const verse = versesByKey.get(verseKey);
    const lastWord = currentWords[currentWords.length - 1]!;
    const isComplete = verse?.word_count != null ? lastWord.position >= verse.word_count : false;

    ayahs.push({
      surah: firstWord.surah,
      ayah: firstWord.ayah,
      verse_key: verseKey,
      marker: isComplete && verse ? formatVerseMarker(verse) : null,
      is_complete: isComplete,
      words: currentWords.map(toPageWord),
    });

    currentWords = [];
    currentKey = '';
  };

  for (const word of words) {
    const key = `${word.surah}:${word.ayah}`;
    if (currentKey && key !== currentKey) {
      flush();
    }

    currentKey = key;
    currentWords.push(word);
  }

  flush();
  return ayahs;
}

function buildLayoutLineText(
  words: WordRow[],
  versesByKey: Map<string, VerseRow>,
  useSimpleText: boolean
): string {
  const parts: string[] = [];

  for (const word of words) {
    const token = textValue(useSimpleText ? word.simple : word.text);
    if (token) {
      parts.push(token);
    }

    const verse = versesByKey.get(`${word.surah}:${word.ayah}`);
    if (verse && verse.word_count != null && word.position >= verse.word_count) {
      parts.push(formatVerseMarker(verse));
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
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
        a.text_diacritics,
        a.text_non_diacritics,
        a.text_no_diacritics,
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

    const maxPageStmt = ctx.env.DB.prepare(`
      SELECT MAX(page) AS max_page
      FROM ar_quran_ayah
    `);

    const [{ results: verseRowsRaw = [] }, maxPageRow] = await Promise.all([
      verseStmt.bind(pageNo).all<VerseRow>(),
      maxPageStmt.first<MaxPageRow>(),
    ]);

    const verseRows = (verseRowsRaw ?? []) as VerseRow[];
    if (!verseRows.length) {
      return new Response(JSON.stringify({ ok: false, error: `Quran page ${pageNo} not found.` }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const canonicalPageNo = verseRows[0]?.page ?? pageNo;
    const surahIds = Array.from(new Set(verseRows.map((row) => row.surah)));
    const surahPlaceholders = surahIds.map((_, index) => `?${index + 1}`).join(', ');
    const wordConditions = verseRows
      .map((_, index) => `(surah = ?${index * 2 + 1} AND ayah = ?${index * 2 + 2})`)
      .join(' OR ');
    const wordStmt = ctx.env.DB.prepare(
      `
      SELECT
        word_id,
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
      WHERE ${wordConditions}
      ORDER BY word_id ASC, surah ASC, ayah ASC, position ASC
    `
    );
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
    const layoutStmt = ctx.env.DB.prepare(
      `
      SELECT
        page_number,
        line_number,
        line_type,
        is_centered,
        first_word_id,
        last_word_id,
        surah_number
      FROM ar_quran_page_layout_lines
      WHERE page_number = ?1
      ORDER BY line_number ASC
    `
    );

    const wordParams = verseRows.flatMap((row) => [row.surah, row.ayah]);
    const [{ results: wordRowsRaw = [] }, { results: surahRowsRaw = [] }, layoutResult] = await Promise.all([
      wordStmt.bind(...wordParams).all<WordRow>(),
      surahStmt.bind(...surahIds).all<SurahPageRow>(),
      layoutStmt.bind(canonicalPageNo).all<LayoutRow>().catch(() => ({ results: [] as LayoutRow[] })),
    ]);

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
    const surahByNumber = new Map(surahs.map((surah) => [surah.surah, surah]));
    const verseByKey = new Map(verseRows.map((row) => [`${row.surah}:${row.ayah}`, row] as const));

    const juzs = Array.from(
      new Set(verseRows.map((row) => row.juz).filter((value): value is number => value != null))
    ).sort((a, b) => a - b);
    const hizbs = Array.from(
      new Set(verseRows.map((row) => row.hizb).filter((value): value is number => value != null))
    ).sort((a, b) => a - b);

    const verses = verseRows.map((row) => {
      const verseKey = `${row.surah}:${row.ayah}`;
      const words = (wordsByVerse.get(verseKey) ?? []).map(toPageWord);

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
        text_diacritics: row.text_diacritics ?? row.text,
        text_no_diacritics: row.text_no_diacritics ?? row.text_non_diacritics ?? row.text_simple ?? null,
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
    const layoutRows = ((layoutResult?.results ?? []) as LayoutRow[]) ?? [];
    const layoutLines = layoutRows
      .map((row) => {
        const lineType = normalizeLayoutLineType(row.line_type);
        const lineWords =
          lineType === 'ayah' && row.first_word_id != null && row.last_word_id != null
            ? wordRows.filter(
                (word) =>
                  word.word_id != null
                  && word.word_id >= row.first_word_id!
                  && word.word_id <= row.last_word_id!
              )
            : [];
        const ayahs = lineType === 'ayah' ? buildLayoutAyahs(lineWords, verseByKey) : [];

        let text = '';
        let textSimple: string | null = null;

        if (lineType === 'surah_name') {
          text = buildSurahLineText(surahByNumber.get(row.surah_number ?? 0)?.name_ar ?? null);
          textSimple = text || null;
        } else if (lineType === 'basmallah') {
          text = BISMILLAH_DIACRITIC;
          textSimple = BISMILLAH_PLAIN;
        } else {
          text = buildLayoutLineText(lineWords, verseByKey, false);
          textSimple = buildLayoutLineText(lineWords, verseByKey, true) || null;
        }

        return {
          line_number: row.line_number,
          line_type: lineType,
          is_centered: row.is_centered === 1,
          surah_number: row.surah_number ?? null,
          text,
          text_simple: textSimple,
          ayahs,
        };
      })
      .filter((line) => line.text.length > 0 || line.ayahs.length > 0);
    return new Response(
      JSON.stringify({
        ok: true,
        page: {
          number: canonicalPageNo,
          prev_page: canonicalPageNo > 1 ? canonicalPageNo - 1 : null,
          next_page: canonicalPageNo < (maxPageRow?.max_page ?? canonicalPageNo) ? canonicalPageNo + 1 : null,
          verse_count: verses.length,
          start_ref: `${verseRows[0]!.surah}:${verseRows[0]!.ayah}`,
          end_ref: `${verseRows[verseRows.length - 1]!.surah}:${verseRows[verseRows.length - 1]!.ayah}`,
          juzs,
          hizbs,
        },
        surahs,
        verses,
        layout_lines: layoutRows.length ? layoutLines : [],
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

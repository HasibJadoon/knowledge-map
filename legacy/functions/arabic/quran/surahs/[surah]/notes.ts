import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { json, mapNoteRow, readParam, readString } from '../../../../_utils/notes';

interface Env {
  DB: D1Database;
}

type QuranSurahNotesMode = 'draft' | 'flag' | 'published';

type NoteLinkRow = Record<string, unknown> & {
  target_type?: string;
  target_id?: string;
  ref?: string | null;
};

type VerseRow = Record<string, unknown> & {
  ayah?: number;
  text?: string | null;
  text_simple?: string | null;
  text_diacritics?: string | null;
  text_no_diacritics?: string | null;
};

function parseMode(value: string | null): QuranSurahNotesMode {
  if (value === 'flag' || value === 'published') {
    return value;
  }

  return 'draft';
}

function parseSurah(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 114) {
    return null;
  }

  return parsed;
}

function parseAyahTarget(targetType: unknown, targetId: unknown, surah: number): { ayah: number; wordIndex: number | null } | null {
  const kind = typeof targetType === 'string' ? targetType.trim() : '';
  const id = typeof targetId === 'string' ? targetId.trim() : '';

  const verseMatch = kind === 'quran_ayah' ? id.match(new RegExp(`^Q:${surah}:(\\d{1,3})$`)) : null;
  if (verseMatch) {
    return { ayah: Number(verseMatch[1]), wordIndex: null };
  }

  const wordMatch = kind === 'quran_word' ? id.match(new RegExp(`^QW:${surah}:(\\d{1,3}):(\\d{1,3})$`)) : null;
  if (wordMatch) {
    return { ayah: Number(wordMatch[1]), wordIndex: Number(wordMatch[2]) };
  }

  return null;
}

function verseText(row: VerseRow): string {
  const preferred = [
    readString(row['text_diacritics']),
    readString(row['text']),
    readString(row['text_simple']),
    readString(row['text_no_diacritics']),
  ].find((value) => value && value.trim().length > 0);

  return preferred?.trim() ?? '';
}

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

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const surah = parseSurah(readParam(ctx.params, 'surah'));
    if (surah == null) {
      return json({ ok: false, error: 'Surah must be between 1 and 114.' }, 400);
    }

    const url = new URL(ctx.request.url);
    const mode = parseMode(url.searchParams.get('mode'));
    const versePattern = `Q:${surah}:%`;
    const wordPattern = `QW:${surah}:%`;

    const { results = [] } = await ctx.env.DB
      .prepare(
        `
        SELECT
          n.id,
          n.user_id,
          n.status,
          n.body_md,
          n.title,
          n.created_at,
          n.updated_at,
          l.target_type,
          l.target_id,
          l.ref,
          l.created_at AS link_created_at
        FROM note_links l
        JOIN ar_capture_notes n ON n.id = l.note_id
        WHERE n.user_id = ?1
          AND (
            (l.target_type = 'quran_ayah' AND l.target_id LIKE ?2)
            OR
            (l.target_type = 'quran_word' AND l.target_id LIKE ?3)
          )
        ORDER BY n.updated_at DESC, l.created_at DESC
        LIMIT 800
        `
      )
      .bind(user.id, versePattern, wordPattern)
      .all<NoteLinkRow>();

    const filtered = (results ?? [])
      .map((row) => {
        const note = mapNoteRow(row);
        if (note.status !== mode) {
          return null;
        }

        const parsed = parseAyahTarget(row['target_type'], row['target_id'], surah);
        if (!parsed) {
          return null;
        }

        return {
          ...note,
          target_type: row['target_type'] === 'quran_word' ? 'quran_word' : 'quran_ayah',
          target_id: readString(row['target_id']) ?? '',
          ref: readString(row['ref']) ?? null,
          ayah: parsed.ayah,
          word_index: parsed.wordIndex,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const ayahs = Array.from(new Set(filtered.map((row) => row.ayah))).sort((left, right) => left - right);

    const surahRow = await ctx.env.DB
      .prepare(
        `
        SELECT surah, name_ar, name_en, meta_json
        FROM ar_quran_surahs
        WHERE surah = ?1
        LIMIT 1
        `
      )
      .bind(surah)
      .first<Record<string, unknown>>();

    const versesByAyah = new Map<number, string>();
    if (ayahs.length > 0) {
      const placeholders = ayahs.map((_, index) => `?${index + 2}`).join(', ');
      const verseQuery = await ctx.env.DB
        .prepare(
          `
          SELECT ayah, text, text_simple, text_diacritics, text_no_diacritics
          FROM ar_quran_ayah
          WHERE surah = ?1
            AND ayah IN (${placeholders})
          ORDER BY ayah ASC
          `
        )
        .bind(surah, ...ayahs)
        .all<VerseRow>();

      for (const row of verseQuery.results ?? []) {
        const ayah = typeof row['ayah'] === 'number' ? row['ayah'] : Number(row['ayah']);
        if (Number.isFinite(ayah)) {
          versesByAyah.set(Math.trunc(ayah), verseText(row));
        }
      }
    }

    const notesByAyah = new Map<number, typeof filtered>();
    for (const note of filtered) {
      const group = notesByAyah.get(note.ayah) ?? [];
      group.push(note);
      notesByAyah.set(note.ayah, group);
    }

    const meta = safeJson(surahRow?.['meta_json']);
    const verses = ayahs.map((ayah) => ({
      ayah,
      verse_key: `${surah}:${ayah}`,
      text: versesByAyah.get(ayah) ?? '',
      notes: notesByAyah.get(ayah) ?? [],
    }));

    return json({
      ok: true,
      surah: {
        surah,
        name_ar: readString(surahRow?.['name_ar']) ?? '',
        name_en: readString(surahRow?.['name_en']) ?? '',
        name_simple: readString(meta['nameSimple']) ?? readString(meta['name_simple']) ?? readString(surahRow?.['name_en']) ?? '',
      },
      mode,
      verses,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load surah notes.';
    return json({ ok: false, error: message }, 500);
  }
};

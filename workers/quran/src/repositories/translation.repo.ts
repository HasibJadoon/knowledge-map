// ─── TranslationRepo — all SQL for qr_translations + qr_translation_sources ──

import { query, queryOne } from '../../../shared/src/db';

export interface TranslationSource {
  id: string;          // QR:ULID
  slug: string;
  language: string;
  author: string;
  title: string;
  is_default: number;  // 1 | 0
}

export interface Translation {
  id: string;          // QR:ULID
  surah: number;
  ayah: number;
  source_id: string;
  text: string;
}

export class TranslationRepo {
  constructor(private db: D1Database) {}

  listSources(): Promise<TranslationSource[]> {
    return query<TranslationSource>(
      this.db,
      `SELECT id, slug, language, author, title, is_default
       FROM qr_translation_sources
       ORDER BY language, author`,
    );
  }

  findSource(id: string): Promise<TranslationSource | null> {
    return queryOne<TranslationSource>(
      this.db,
      `SELECT id, slug, language, author, title, is_default
       FROM qr_translation_sources WHERE id = ?`,
      [id],
    );
  }

  /** All translations for a single ayah. */
  byAyah(surahId: number, ayahNum: number): Promise<Translation[]> {
    return query<Translation>(
      this.db,
      `SELECT t.id, t.surah, t.ayah, t.source_id, t.text
       FROM qr_translations t
       WHERE t.surah = ? AND t.ayah = ?`,
      [surahId, ayahNum],
    );
  }

  /** A specific source's translation for a surah range. */
  bySourceAndRange(
    sourceId: string,
    surahId: number,
    from: number,
    to: number,
  ): Promise<Translation[]> {
    return query<Translation>(
      this.db,
      `SELECT id, surah, ayah, source_id, text
       FROM qr_translations
       WHERE source_id = ? AND surah = ? AND ayah BETWEEN ? AND ?
       ORDER BY ayah`,
      [sourceId, surahId, from, to],
    );
  }
}

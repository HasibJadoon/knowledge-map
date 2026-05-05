// ─── LexiconRepo — ar_ling_lexicon_entries + senses + semantic_fields ─────────

import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';

export interface LexiconEntry {
  id: string;
  lemma_id: string;
  entry_text: string;
  heading_norm: string | null;
  title_ar: string | null;
  title_en: string | null;
  display_heading_ar: string | null;
  display_heading_en: string | null;
  definition_ar: string | null;
  definition_en: string;
  definition_source: string | null;
  usage_register: string;
  root_id: string | null;
  source_id: string | null;
  source_slug: string | null;
  source_chunk_id: string | null;
  entry_kind: string | null;
  page_no: number | null;
  volume_no: number | null;
  gloss_ar: string | null;
  gloss_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  ui_json: string | null;
  ai_json: string | null;
  status: string | null;
  ai_fill_state: string | null;
}

export interface LexiconSense {
  id: string;           // AL:ULID
  entry_id: string;     // AL:ULID
  sense_number: number;
  definition_ar: string | null;
  definition_en: string | null;
  domain: string | null;
  example_ar: string | null;
}

export class LexiconRepo {
  constructor(private db: D1Database) {}

  findById(id: string): Promise<LexiconEntry | null> {
    return queryOne<LexiconEntry>(
      this.db,
      `SELECT id, lemma_id, entry_text, heading_norm, title_ar, title_en,
              display_heading_ar, display_heading_en,
              definition_ar, definition_en, definition_source, usage_register,
              root_id, source_id, source_slug, source_chunk_id, entry_kind,
              page_no, volume_no, gloss_ar, gloss_en, summary_ar, summary_en,
              ui_json, ai_json, status, ai_fill_state
       FROM ar_ling_lexicon_entries WHERE id = ?`,
      [id],
    );
  }

  byLemma(lemmaId: string): Promise<LexiconEntry[]> {
    return query<LexiconEntry>(
      this.db,
      `SELECT id, lemma_id, entry_text, heading_norm, title_ar, title_en,
              display_heading_ar, display_heading_en,
              definition_ar, definition_en, definition_source, usage_register,
              root_id, source_id, source_slug, source_chunk_id, entry_kind,
              page_no, volume_no, gloss_ar, gloss_en, summary_ar, summary_en,
              ui_json, ai_json, status, ai_fill_state
       FROM ar_ling_lexicon_entries
       WHERE lemma_id = ?
       ORDER BY sort_key, source_slug, source_entry_seq`,
      [lemmaId],
    );
  }

  sensesByEntry(entryId: string): Promise<LexiconSense[]> {
    return query<LexiconSense>(
      this.db,
      `SELECT id, entry_id, sense_number, definition_ar, definition_en, domain, example_ar
       FROM ar_ling_senses WHERE entry_id = ? ORDER BY sense_number`,
      [entryId],
    );
  }

  search(q: string, opts: PaginateOptions = {}) {
    const pattern = `%${q}%`;
    return paginate<LexiconEntry>(
      this.db,
      `SELECT id, lemma_id, entry_text, heading_norm, title_ar, title_en,
              display_heading_ar, display_heading_en,
              definition_ar, definition_en, definition_source, usage_register,
              root_id, source_id, source_slug, source_chunk_id, entry_kind,
              page_no, volume_no, gloss_ar, gloss_en, summary_ar, summary_en,
              ui_json, ai_json, status, ai_fill_state
       FROM ar_ling_lexicon_entries
       WHERE entry_text LIKE ?
          OR heading_norm LIKE ?
          OR title_ar LIKE ?
          OR title_en LIKE ?
          OR gloss_ar LIKE ?
          OR gloss_en LIKE ?
          OR summary_ar LIKE ?
          OR summary_en LIKE ?
       ORDER BY heading_norm, source_slug, source_entry_seq`,
      `SELECT COUNT(*) AS count
       FROM ar_ling_lexicon_entries
       WHERE entry_text LIKE ?
          OR heading_norm LIKE ?
          OR title_ar LIKE ?
          OR title_en LIKE ?
          OR gloss_ar LIKE ?
          OR gloss_en LIKE ?
          OR summary_ar LIKE ?
          OR summary_en LIKE ?`,
      [pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern],
      opts,
    );
  }
}

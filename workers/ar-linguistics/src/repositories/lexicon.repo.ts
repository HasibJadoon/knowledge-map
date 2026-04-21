// ─── LexiconRepo — ar_ling_lexicon_entries + senses + semantic_fields ─────────

import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';

export interface LexiconEntry {
  id: string;           // AL:ULID
  lemma_id: string;     // AL:ULID
  headword_ar: string;
  pos: string | null;
  register: string | null;   // classical | modern | quranic
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
      `SELECT id, lemma_id, headword_ar, pos, register
       FROM ar_ling_lexicon_entries WHERE id = ?`,
      [id],
    );
  }

  byLemma(lemmaId: string): Promise<LexiconEntry[]> {
    return query<LexiconEntry>(
      this.db,
      `SELECT id, lemma_id, headword_ar, pos, register
       FROM ar_ling_lexicon_entries WHERE lemma_id = ?`,
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
      `SELECT id, lemma_id, headword_ar, pos, register
       FROM ar_ling_lexicon_entries
       WHERE headword_ar LIKE ?
       ORDER BY headword_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_lexicon_entries WHERE headword_ar LIKE ?`,
      [pattern],
      opts,
    );
  }
}

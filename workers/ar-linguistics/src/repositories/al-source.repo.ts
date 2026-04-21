// ─── AlSourceRepo — ar_ling_sources + editions + chunks + toc + index + evidence
//                   + tokens + sentences + token_lexicon_link ──────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AlSource {
  id: string;
  title_ar: string;
  title_en: string | null;
  source_type: string;
  author_ref: string | null;
  author_name: string | null;
  period_label: string | null;
  note_md: string | null;
  created_at: string;
}

export interface AlSourceCreate {
  title_ar: string;
  title_en?: string | null;
  source_type?: string;
  author_ref?: string | null;
  author_name?: string | null;
  period_label?: string | null;
  note_md?: string | null;
}

export type AlSourcePatch = Partial<AlSourceCreate>;

export interface AlSourceEdition {
  id: string;
  source_id: string;
  edition_label: string;
  publisher: string | null;
  year: string | null;
  volume_count: number | null;
  note_md: string | null;
}

export interface AlSourceEditionCreate {
  source_id: string;
  edition_label: string;
  publisher?: string | null;
  year?: string | null;
  volume_count?: number | null;
  note_md?: string | null;
}

export interface AlSourceChunk {
  id: string;
  source_id: string;
  edition_id: string | null;
  chunk_kind: string | null;
  chunk_seq: number;
  heading_norm: string | null;
  text_ar: string;
  text_en: string | null;
  page_no: number | null;
  volume_no: number | null;
  tokens_approx: number | null;
  is_embedded: number;
  qdrant_id: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface AlSourceChunkCreate {
  source_id: string;
  edition_id?: string | null;
  chunk_kind?: string | null;
  chunk_seq: number;
  heading_norm?: string | null;
  text_ar: string;
  text_en?: string | null;
  page_no?: number | null;
  volume_no?: number | null;
  tokens_approx?: number | null;
  meta_json?: string | null;
}

export interface AlSourceToc {
  id: string;
  source_id: string;
  parent_id: string | null;
  title_ar: string;
  title_en: string | null;
  level: number;
  seq: number;
  page_start: number | null;
}

export interface AlSourceTocCreate {
  source_id: string;
  parent_id?: string | null;
  title_ar: string;
  title_en?: string | null;
  level?: number;
  seq: number;
  page_start?: number | null;
}

export interface AlEvidenceItem {
  id: string;
  evidence_type: string;
  text_ar: string;
  text_en: string | null;
  qr_ref: string | null;
  source_ref: string | null;
  locator_json: string | null;
  note_md: string | null;
  created_at: string;
}

export interface AlEvidenceItemCreate {
  evidence_type: string;
  text_ar: string;
  text_en?: string | null;
  qr_ref?: string | null;
  source_ref?: string | null;
  locator_json?: string | null;
  note_md?: string | null;
}

export interface AlToken {
  id: string;
  token_text: string;
  token_text_bare: string | null;
  lemma_id: string | null;
  part_of_speech: string | null;
  source_ref: string | null;
  page_no: number | null;
  note_md: string | null;
  created_at: string;
}

export interface AlTokenCreate {
  token_text: string;
  token_text_bare?: string | null;
  lemma_id?: string | null;
  part_of_speech?: string | null;
  source_ref?: string | null;
  page_no?: number | null;
  note_md?: string | null;
}

export interface AlSentence {
  id: string;
  source_ref: string;
  sentence_text: string;
  sentence_text_bare: string | null;
  sentence_type: string;
  irab_json: string | null;
  tree_json: string | null;
  page_no: number | null;
  tokens_json: string | null;
  created_at: string;
}

export interface AlSentenceCreate {
  source_ref: string;
  sentence_text: string;
  sentence_text_bare?: string | null;
  sentence_type?: string;
  irab_json?: string | null;
  tree_json?: string | null;
  page_no?: number | null;
  tokens_json?: string | null;
}

export interface TokenLexiconLink {
  id: string;
  token_id: string;
  lexicon_entry_id: string;
  confidence: number;
}

// ── Repo ─────────────────────────────────────────────────────────────────────

export class AlSourceRepo {
  constructor(private db: D1Database) {}

  // ── Sources ────────────────────────────────────────────────────────────────

  list(opts: PaginateOptions = {}) {
    return paginate<AlSource>(
      this.db,
      `SELECT id, title_ar, title_en, source_type, author_ref,
              author_name, period_label, note_md, created_at
       FROM ar_ling_sources
       ORDER BY title_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_sources`,
      [],
      opts,
    );
  }

  findById(id: string): Promise<AlSource | null> {
    return queryOne<AlSource>(
      this.db,
      `SELECT id, title_ar, title_en, source_type, author_ref,
              author_name, period_label, note_md, created_at
       FROM ar_ling_sources WHERE id = ?`,
      [id],
    );
  }

  findByType(sourceType: string, opts: PaginateOptions = {}) {
    return paginate<AlSource>(
      this.db,
      `SELECT id, title_ar, title_en, source_type, author_ref,
              author_name, period_label, note_md, created_at
       FROM ar_ling_sources
       WHERE source_type = ?
       ORDER BY title_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_sources WHERE source_type = ?`,
      [sourceType],
      opts,
    );
  }

  async create(input: AlSourceCreate): Promise<AlSource> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_sources
         (id, title_ar, title_en, source_type, author_ref,
          author_name, period_label, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title_ar,
        input.title_en ?? null,
        input.source_type ?? 'classical_grammar',
        input.author_ref ?? null,
        input.author_name ?? null,
        input.period_label ?? null,
        input.note_md ?? null,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: AlSourcePatch): Promise<AlSource | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const cols: (keyof AlSourcePatch)[] = [
      'title_ar', 'title_en', 'source_type', 'author_ref',
      'author_name', 'period_label', 'note_md',
    ];
    for (const col of cols) {
      if (patch[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(patch[col]);
      }
    }

    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await execute(
      this.db,
      `UPDATE ar_ling_sources SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  }

  // ── Editions ───────────────────────────────────────────────────────────────

  editions(sourceId: string): Promise<AlSourceEdition[]> {
    return query<AlSourceEdition>(
      this.db,
      `SELECT id, source_id, edition_label, publisher, year, volume_count, note_md
       FROM ar_ling_source_editions
       WHERE source_id = ?
       ORDER BY year`,
      [sourceId],
    );
  }

  async createEdition(input: AlSourceEditionCreate): Promise<AlSourceEdition> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_source_editions
         (id, source_id, edition_label, publisher, year, volume_count, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.source_id,
        input.edition_label,
        input.publisher ?? null,
        input.year ?? null,
        input.volume_count ?? null,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<AlSourceEdition>(
      this.db,
      `SELECT id, source_id, edition_label, publisher, year, volume_count, note_md
       FROM ar_ling_source_editions WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Chunks ─────────────────────────────────────────────────────────────────

  chunks(sourceId: string, opts: PaginateOptions = {}) {
    return paginate<AlSourceChunk>(
      this.db,
      `SELECT id, source_id, edition_id, chunk_kind, chunk_seq,
              heading_norm, text_ar, text_en, page_no, volume_no,
              tokens_approx, is_embedded, qdrant_id, meta_json, created_at
       FROM ar_ling_source_chunks
       WHERE source_id = ?
       ORDER BY chunk_seq`,
      `SELECT COUNT(*) AS count FROM ar_ling_source_chunks WHERE source_id = ?`,
      [sourceId],
      opts,
    );
  }

  pendingEmbeds(limit = 50): Promise<AlSourceChunk[]> {
    return query<AlSourceChunk>(
      this.db,
      `SELECT id, source_id, edition_id, chunk_kind, chunk_seq,
              heading_norm, text_ar, text_en, page_no, volume_no,
              tokens_approx, is_embedded, qdrant_id, meta_json, created_at
       FROM ar_ling_source_chunks
       WHERE is_embedded = 0
       ORDER BY source_id, chunk_seq
       LIMIT ?`,
      [limit],
    );
  }

  async markEmbedded(chunkId: string, qdrantId: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE ar_ling_source_chunks
       SET is_embedded = 1, qdrant_id = ?
       WHERE id = ?`,
      [qdrantId, chunkId],
    );
  }

  async createChunk(input: AlSourceChunkCreate): Promise<AlSourceChunk> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_source_chunks
         (id, source_id, edition_id, chunk_kind, chunk_seq,
          heading_norm, text_ar, text_en, page_no, volume_no,
          tokens_approx, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.source_id,
        input.edition_id ?? null,
        input.chunk_kind ?? null,
        input.chunk_seq,
        input.heading_norm ?? null,
        input.text_ar,
        input.text_en ?? null,
        input.page_no ?? null,
        input.volume_no ?? null,
        input.tokens_approx ?? null,
        input.meta_json ?? null,
      ],
    );
    return (await queryOne<AlSourceChunk>(
      this.db,
      `SELECT id, source_id, edition_id, chunk_kind, chunk_seq,
              heading_norm, text_ar, text_en, page_no, volume_no,
              tokens_approx, is_embedded, qdrant_id, meta_json, created_at
       FROM ar_ling_source_chunks WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Table of Contents ──────────────────────────────────────────────────────

  toc(sourceId: string): Promise<AlSourceToc[]> {
    return query<AlSourceToc>(
      this.db,
      `SELECT id, source_id, parent_id, title_ar, title_en, level, seq, page_start
       FROM ar_ling_source_toc
       WHERE source_id = ?
       ORDER BY seq`,
      [sourceId],
    );
  }

  async createTocEntry(input: AlSourceTocCreate): Promise<AlSourceToc> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_source_toc
         (id, source_id, parent_id, title_ar, title_en, level, seq, page_start)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.source_id,
        input.parent_id ?? null,
        input.title_ar,
        input.title_en ?? null,
        input.level ?? 1,
        input.seq,
        input.page_start ?? null,
      ],
    );
    return (await queryOne<AlSourceToc>(
      this.db,
      `SELECT id, source_id, parent_id, title_ar, title_en, level, seq, page_start
       FROM ar_ling_source_toc WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Evidence Items ─────────────────────────────────────────────────────────

  evidence(
    opts: { conceptRef?: string | null; lemmaRef?: string | null } & PaginateOptions = {},
  ) {
    const { conceptRef, lemmaRef, ...page } = opts;

    // evidence_items doesn't have a concept_ref column; filter by source_ref or qr_ref
    // The instruction says conceptRef/lemmaRef are optional filters — map to source_ref / qr_ref heuristics
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (conceptRef) {
      conditions.push('source_ref = ?');
      params.push(conceptRef);
    }
    if (lemmaRef) {
      conditions.push('source_ref = ?');
      params.push(lemmaRef);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';

    return paginate<AlEvidenceItem>(
      this.db,
      `SELECT id, evidence_type, text_ar, text_en, qr_ref,
              source_ref, locator_json, note_md, created_at
       FROM ar_ling_evidence_items
       ${where}
       ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM ar_ling_evidence_items ${where}`,
      params,
      page,
    );
  }

  async createEvidence(input: AlEvidenceItemCreate): Promise<AlEvidenceItem> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_evidence_items
         (id, evidence_type, text_ar, text_en, qr_ref,
          source_ref, locator_json, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.evidence_type,
        input.text_ar,
        input.text_en ?? null,
        input.qr_ref ?? null,
        input.source_ref ?? null,
        input.locator_json ?? null,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<AlEvidenceItem>(
      this.db,
      `SELECT id, evidence_type, text_ar, text_en, qr_ref,
              source_ref, locator_json, note_md, created_at
       FROM ar_ling_evidence_items WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Tokens ─────────────────────────────────────────────────────────────────

  tokens(sourceRef: string, opts: PaginateOptions = {}) {
    return paginate<AlToken>(
      this.db,
      `SELECT id, token_text, token_text_bare, lemma_id,
              part_of_speech, source_ref, page_no, note_md, created_at
       FROM ar_ling_tokens
       WHERE source_ref = ?
       ORDER BY rowid`,
      `SELECT COUNT(*) AS count FROM ar_ling_tokens WHERE source_ref = ?`,
      [sourceRef],
      opts,
    );
  }

  async createToken(input: AlTokenCreate): Promise<AlToken> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_tokens
         (id, token_text, token_text_bare, lemma_id,
          part_of_speech, source_ref, page_no, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.token_text,
        input.token_text_bare ?? null,
        input.lemma_id ?? null,
        input.part_of_speech ?? null,
        input.source_ref ?? null,
        input.page_no ?? null,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<AlToken>(
      this.db,
      `SELECT id, token_text, token_text_bare, lemma_id,
              part_of_speech, source_ref, page_no, note_md, created_at
       FROM ar_ling_tokens WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Sentences ──────────────────────────────────────────────────────────────

  sentences(sourceRef: string): Promise<AlSentence[]> {
    return query<AlSentence>(
      this.db,
      `SELECT id, source_ref, sentence_text, sentence_text_bare,
              sentence_type, irab_json, tree_json, page_no, tokens_json, created_at
       FROM ar_ling_sentences
       WHERE source_ref = ?
       ORDER BY rowid`,
      [sourceRef],
    );
  }

  async createSentence(input: AlSentenceCreate): Promise<AlSentence> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_sentences
         (id, source_ref, sentence_text, sentence_text_bare,
          sentence_type, irab_json, tree_json, page_no, tokens_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.source_ref,
        input.sentence_text,
        input.sentence_text_bare ?? null,
        input.sentence_type ?? 'prose',
        input.irab_json ?? null,
        input.tree_json ?? null,
        input.page_no ?? null,
        input.tokens_json ?? null,
      ],
    );
    return (await queryOne<AlSentence>(
      this.db,
      `SELECT id, source_ref, sentence_text, sentence_text_bare,
              sentence_type, irab_json, tree_json, page_no, tokens_json, created_at
       FROM ar_ling_sentences WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Token ↔ Lexicon Links ──────────────────────────────────────────────────

  tokenLexiconLinks(tokenId: string): Promise<TokenLexiconLink[]> {
    return query<TokenLexiconLink>(
      this.db,
      `SELECT id, token_id, lexicon_entry_id, confidence
       FROM ar_ling_token_lexicon_link
       WHERE token_id = ?
       ORDER BY confidence DESC`,
      [tokenId],
    );
  }

  async linkToLexicon(
    tokenId: string,
    lexiconEntryId: string,
    confidence = 1.0,
  ): Promise<TokenLexiconLink> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_token_lexicon_link
         (id, token_id, lexicon_entry_id, confidence)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (token_id, lexicon_entry_id) DO UPDATE SET confidence = excluded.confidence`,
      [id, tokenId, lexiconEntryId, confidence],
    );
    return (await queryOne<TokenLexiconLink>(
      this.db,
      `SELECT id, token_id, lexicon_entry_id, confidence
       FROM ar_ling_token_lexicon_link
       WHERE token_id = ? AND lexicon_entry_id = ?`,
      [tokenId, lexiconEntryId],
    ))!;
  }
}

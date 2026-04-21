// ─── CorpusRepo — L2 scriptural corpora + corpus units ───────────────────────
// Covers: wv_scriptural_corpora, wv_corpus_units
// Canonical columns per 001_wv_schema.sql §2.1-§2.2

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WvScripturalCorpus {
  id: string;              // WV:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_id: string | null;
  corpus_type: string;     // scripture|hadith|commentary|creed|liturgy|apocrypha|other
  language: string | null;
  canon_status: string | null; // canonical|deuterocanonical|disputed|rejected
  date_range: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvCorpusUnit {
  id: string;
  corpus_id: string;
  parent_id: string | null;
  unit_type: string;       // book|chapter|passage|pericope|episode|scene|verse_range|other
  title: string | null;
  unit_index: number | null;
  start_ref: string | null;
  end_ref: string | null;
  text_excerpt: string | null;
  description_md: string | null;
  qr_scope_ref: string | null; // 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  meta_json: string | null;
  created_at: string;
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface CorpusCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  tradition_id?: string | null;
  corpus_type?: string;
  language?: string | null;
  canon_status?: string | null;
  date_range?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface CorpusPatch {
  title?: string;
  title_ar?: string | null;
  tradition_id?: string | null;
  corpus_type?: string;
  language?: string | null;
  canon_status?: string | null;
  date_range?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface CorpusUnitCreate {
  corpus_id: string;
  parent_id?: string | null;
  unit_type?: string;
  title?: string | null;
  unit_index?: number | null;
  start_ref?: string | null;
  end_ref?: string | null;
  text_excerpt?: string | null;
  description_md?: string | null;
  qr_scope_ref?: string | null;
  meta_json?: string | null;
}

export interface CorpusUnitPatch {
  unit_type?: string;
  title?: string | null;
  unit_index?: number | null;
  start_ref?: string | null;
  end_ref?: string | null;
  text_excerpt?: string | null;
  description_md?: string | null;
  qr_scope_ref?: string | null;
  meta_json?: string | null;
}

// ── Column lists ─────────────────────────────────────────────────────────────

const CORPUS_COLS =
  `id, slug, title, title_ar, tradition_id, corpus_type, language, ` +
  `canon_status, date_range, description_md, meta_json, created_at`;

const UNIT_COLS =
  `id, corpus_id, parent_id, unit_type, title, unit_index, ` +
  `start_ref, end_ref, text_excerpt, description_md, qr_scope_ref, meta_json, created_at`;

// ── Repo ─────────────────────────────────────────────────────────────────────

export class CorpusRepo {
  constructor(private db: D1Database) {}

  // ── wv_scriptural_corpora ─────────────────────────────────────────────────

  list(opts: {
    tradition_id?: string | null;
    corpus_type?: string | null;
  } & PaginateOptions = {}) {
    const { tradition_id, corpus_type } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (tradition_id) { conds.push('tradition_id = ?'); params.push(tradition_id); }
    if (corpus_type)  { conds.push('corpus_type = ?');  params.push(corpus_type); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvScripturalCorpus>(
      this.db,
      `SELECT ${CORPUS_COLS} FROM wv_scriptural_corpora ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_scriptural_corpora ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<WvScripturalCorpus | null> {
    return queryOne<WvScripturalCorpus>(
      this.db,
      `SELECT ${CORPUS_COLS} FROM wv_scriptural_corpora WHERE id = ?`,
      [id],
    );
  }

  findBySlug(slug: string): Promise<WvScripturalCorpus | null> {
    return queryOne<WvScripturalCorpus>(
      this.db,
      `SELECT ${CORPUS_COLS} FROM wv_scriptural_corpora WHERE slug = ?`,
      [slug],
    );
  }

  async create(input: CorpusCreate): Promise<WvScripturalCorpus> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_scriptural_corpora
         (id, slug, title, title_ar, tradition_id, corpus_type, language,
          canon_status, date_range, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.title_ar ?? null,
        input.tradition_id ?? null,
        input.corpus_type ?? 'scripture',
        input.language ?? null,
        input.canon_status ?? null,
        input.date_range ?? null,
        input.description_md ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: CorpusPatch): Promise<WvScripturalCorpus | null> {
    const sets: string[]   = [];
    const vals: unknown[]  = [];

    const MAP: [keyof CorpusPatch, string][] = [
      ['title',          'title = ?'],
      ['title_ar',       'title_ar = ?'],
      ['tradition_id',   'tradition_id = ?'],
      ['corpus_type',    'corpus_type = ?'],
      ['language',       'language = ?'],
      ['canon_status',   'canon_status = ?'],
      ['date_range',     'date_range = ?'],
      ['description_md', 'description_md = ?'],
      ['meta_json',      'meta_json = ?'],
    ];
    for (const [key, sql] of MAP) {
      if (key in patch) { sets.push(sql); vals.push(patch[key] ?? null); }
    }
    if (!sets.length) return this.findById(id);

    vals.push(id);
    await execute(
      this.db,
      `UPDATE wv_scriptural_corpora SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findById(id);
  }

  // ── wv_corpus_units ────────────────────────────────────────────────────────

  units(corpusId: string, opts: { unit_type?: string | null } & PaginateOptions = {}) {
    const { unit_type } = opts;
    const conds: string[]   = ['corpus_id = ?'];
    const params: unknown[] = [corpusId];
    if (unit_type) { conds.push('unit_type = ?'); params.push(unit_type); }
    const where = `WHERE ${conds.join(' AND ')}`;
    return paginate<WvCorpusUnit>(
      this.db,
      `SELECT ${UNIT_COLS} FROM wv_corpus_units ${where} ORDER BY COALESCE(unit_index, 0), id`,
      `SELECT COUNT(*) AS count FROM wv_corpus_units ${where}`,
      params, opts,
    );
  }

  findUnitById(id: string): Promise<WvCorpusUnit | null> {
    return queryOne<WvCorpusUnit>(
      this.db,
      `SELECT ${UNIT_COLS} FROM wv_corpus_units WHERE id = ?`,
      [id],
    );
  }

  async createUnit(input: CorpusUnitCreate): Promise<WvCorpusUnit> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_corpus_units
         (id, corpus_id, parent_id, unit_type, title, unit_index,
          start_ref, end_ref, text_excerpt, description_md, qr_scope_ref, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.corpus_id,
        input.parent_id ?? null,
        input.unit_type ?? 'chapter',
        input.title ?? null,
        input.unit_index ?? null,
        input.start_ref ?? null,
        input.end_ref ?? null,
        input.text_excerpt ?? null,
        input.description_md ?? null,
        input.qr_scope_ref ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findUnitById(id))!;
  }

  async patchUnit(id: string, patch: CorpusUnitPatch): Promise<WvCorpusUnit | null> {
    const sets: string[]   = [];
    const vals: unknown[]  = [];

    const MAP: [keyof CorpusUnitPatch, string][] = [
      ['unit_type',      'unit_type = ?'],
      ['title',          'title = ?'],
      ['unit_index',     'unit_index = ?'],
      ['start_ref',      'start_ref = ?'],
      ['end_ref',        'end_ref = ?'],
      ['text_excerpt',   'text_excerpt = ?'],
      ['description_md', 'description_md = ?'],
      ['qr_scope_ref',   'qr_scope_ref = ?'],
      ['meta_json',      'meta_json = ?'],
    ];
    for (const [key, sql] of MAP) {
      if (key in patch) { sets.push(sql); vals.push(patch[key] ?? null); }
    }
    if (!sets.length) return this.findUnitById(id);

    vals.push(id);
    await execute(
      this.db,
      `UPDATE wv_corpus_units SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findUnitById(id);
  }
}

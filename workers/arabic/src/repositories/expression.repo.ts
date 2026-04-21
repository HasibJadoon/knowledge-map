// ─── ExpressionRepo — ar_expressions + ar_applied_balagha ────────────────────
// Idiomatic/formulaic expressions (links to AL for canonical definition) and
// pedagogical applied balagha entries (links to AL:ULID for canonical concept).

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Expression {
  id: string;
  arabic: string;
  transliteration: string | null;
  meaning_en: string;
  expression_type: string;    // idiom|formula|proverb|collocate|fixed_phrase|other
  al_expression_ref: string | null;   // AL:<ar_ling_expression_id>
  domain_id: string | null;
  level: string | null;
  usage_note: string | null;
  created_at: string;
}

export interface ExpressionCreate {
  arabic: string;
  transliteration?: string | null;
  meaning_en: string;
  expression_type?: string;
  al_expression_ref?: string | null;
  domain_id?: string | null;
  level?: string | null;
  usage_note?: string | null;
}

export interface AppliedBalagha {
  id: string;
  al_balagha_ref: string;     // AL:<ar_ling_balagha_concept_id>
  title: string;
  title_ar: string | null;
  explanation_md: string;
  level: string | null;
  qr_scope_ref: string | null;    // primary Quran example
  examples_json: string | null;   // JSON [{arabic, source, analysis}]
  quiz_notes: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface AppliedBalaghaCreate {
  al_balagha_ref: string;
  title: string;
  title_ar?: string | null;
  explanation_md: string;
  level?: string | null;
  qr_scope_ref?: string | null;
  examples_json?: string | null;
  quiz_notes?: string | null;
  meta_json?: string | null;
}

// ── Column lists ──────────────────────────────────────────────────────────────

const EXP_COLS = `id, arabic, transliteration, meaning_en, expression_type,
  al_expression_ref, domain_id, level, usage_note, created_at`;

const BAL_COLS = `id, al_balagha_ref, title, title_ar, explanation_md,
  level, qr_scope_ref, examples_json, quiz_notes, meta_json, created_at`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class ExpressionRepo {
  constructor(private db: D1Database) {}

  // ── Expressions ──────────────────────────────────────────────────────────────

  list(
    domainId: string | null = null,
    level: string | null = null,
    opts: PaginateOptions = {},
  ) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (domainId) { conditions.push('domain_id = ?'); params.push(domainId); }
    if (level)    { conditions.push('level = ?');     params.push(level); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return paginate<Expression>(
      this.db,
      `SELECT ${EXP_COLS} FROM ar_expressions ${where} ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM ar_expressions ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<Expression | null> {
    return queryOne<Expression>(
      this.db,
      `SELECT ${EXP_COLS} FROM ar_expressions WHERE id = ?`,
      [id],
    );
  }

  async create(input: ExpressionCreate): Promise<Expression> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_expressions
         (id, arabic, transliteration, meaning_en, expression_type,
          al_expression_ref, domain_id, level, usage_note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.arabic,
        input.transliteration ?? null,
        input.meaning_en,
        input.expression_type ?? 'idiom',
        input.al_expression_ref ?? null,
        input.domain_id ?? null,
        input.level ?? null,
        input.usage_note ?? null,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  // ── Applied balagha ──────────────────────────────────────────────────────────

  balaghaList(level: string | null = null, opts: PaginateOptions = {}) {
    const where  = level ? 'WHERE level = ?' : '';
    const params = level ? [level] : [];
    return paginate<AppliedBalagha>(
      this.db,
      `SELECT ${BAL_COLS} FROM ar_applied_balagha ${where} ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM ar_applied_balagha ${where}`,
      params,
      opts,
    );
  }

  findBalaghaById(id: string): Promise<AppliedBalagha | null> {
    return queryOne<AppliedBalagha>(
      this.db,
      `SELECT ${BAL_COLS} FROM ar_applied_balagha WHERE id = ?`,
      [id],
    );
  }

  async createBalagha(input: AppliedBalaghaCreate): Promise<AppliedBalagha> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_applied_balagha
         (id, al_balagha_ref, title, title_ar, explanation_md,
          level, qr_scope_ref, examples_json, quiz_notes, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.al_balagha_ref,
        input.title,
        input.title_ar ?? null,
        input.explanation_md,
        input.level ?? null,
        input.qr_scope_ref ?? null,
        input.examples_json ?? null,
        input.quiz_notes ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findBalaghaById(id))!;
  }
}

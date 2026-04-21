// ─── ExpressionRepo — ar_ling_expression_types + expressions + tokens + collocations ──

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExpressionType {
  id: string;
  type_key: string;
  name_ar: string;
  name_en: string;
  description_md: string | null;
}

export interface ExpressionTypeCreate {
  type_key: string;
  name_ar: string;
  name_en: string;
  description_md?: string | null;
}

export interface Expression {
  id: string;
  expression_ar: string;
  expression_en: string;
  expression_type_id: string | null;
  primary_lemma_id: string | null;
  explanation_md: string | null;
  qr_refs_json: string | null;       // JSON [{qr_ref, note}]
  created_at: string;
}

export interface ExpressionCreate {
  expression_ar: string;
  expression_en: string;
  expression_type_id?: string | null;
  primary_lemma_id?: string | null;
  explanation_md?: string | null;
  qr_refs_json?: string | null;
}

export type ExpressionPatch = Partial<Omit<ExpressionCreate, 'expression_ar'>>;

export interface ExpressionToken {
  id: string;
  expression_id: string;
  token_position: number;
  token_text: string;
  lemma_id: string | null;
  note_md: string | null;
}

export interface ExpressionTokenCreate {
  token_position: number;
  token_text: string;
  lemma_id?: string | null;
  note_md?: string | null;
}

export interface Collocation {
  id: string;
  lemma_a_id: string;
  lemma_b_id: string;
  collocation_type: string;
  frequency_note: string | null;
  note_md: string | null;
}

export interface CollocationCreate {
  lemma_a_id: string;
  lemma_b_id: string;
  collocation_type?: string;
  frequency_note?: string | null;
  note_md?: string | null;
}

// ── Repo ─────────────────────────────────────────────────────────────────────

export class ExpressionRepo {
  constructor(private db: D1Database) {}

  // ── Expression Types ───────────────────────────────────────────────────────

  types(opts: PaginateOptions = {}) {
    return paginate<ExpressionType>(
      this.db,
      `SELECT id, type_key, name_ar, name_en, description_md
       FROM ar_ling_expression_types
       ORDER BY name_en`,
      `SELECT COUNT(*) AS count FROM ar_ling_expression_types`,
      [],
      opts,
    );
  }

  findTypeById(id: string): Promise<ExpressionType | null> {
    return queryOne<ExpressionType>(
      this.db,
      `SELECT id, type_key, name_ar, name_en, description_md
       FROM ar_ling_expression_types WHERE id = ?`,
      [id],
    );
  }

  findTypeByKey(typeKey: string): Promise<ExpressionType | null> {
    return queryOne<ExpressionType>(
      this.db,
      `SELECT id, type_key, name_ar, name_en, description_md
       FROM ar_ling_expression_types WHERE type_key = ?`,
      [typeKey],
    );
  }

  async createType(input: ExpressionTypeCreate): Promise<ExpressionType> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_expression_types (id, type_key, name_ar, name_en, description_md)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        input.type_key,
        input.name_ar,
        input.name_en,
        input.description_md ?? null,
      ],
    );
    return (await this.findTypeById(id))!;
  }

  // ── Expressions ────────────────────────────────────────────────────────────

  list(typeId?: string | null, opts: PaginateOptions = {}) {
    const where = typeId ? 'WHERE expression_type_id = ?' : '';
    const params = typeId ? [typeId] : [];
    return paginate<Expression>(
      this.db,
      `SELECT id, expression_ar, expression_en, expression_type_id,
              primary_lemma_id, explanation_md, qr_refs_json, created_at
       FROM ar_ling_expressions
       ${where}
       ORDER BY expression_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_expressions ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<Expression | null> {
    return queryOne<Expression>(
      this.db,
      `SELECT id, expression_ar, expression_en, expression_type_id,
              primary_lemma_id, explanation_md, qr_refs_json, created_at
       FROM ar_ling_expressions WHERE id = ?`,
      [id],
    );
  }

  async create(input: ExpressionCreate): Promise<Expression> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_expressions
         (id, expression_ar, expression_en, expression_type_id,
          primary_lemma_id, explanation_md, qr_refs_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.expression_ar,
        input.expression_en,
        input.expression_type_id ?? null,
        input.primary_lemma_id ?? null,
        input.explanation_md ?? null,
        input.qr_refs_json ?? null,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: ExpressionPatch): Promise<Expression | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (patch.expression_en !== undefined) {
      fields.push('expression_en = ?');
      values.push(patch.expression_en);
    }
    if (patch.expression_type_id !== undefined) {
      fields.push('expression_type_id = ?');
      values.push(patch.expression_type_id);
    }
    if (patch.primary_lemma_id !== undefined) {
      fields.push('primary_lemma_id = ?');
      values.push(patch.primary_lemma_id);
    }
    if (patch.explanation_md !== undefined) {
      fields.push('explanation_md = ?');
      values.push(patch.explanation_md);
    }
    if (patch.qr_refs_json !== undefined) {
      fields.push('qr_refs_json = ?');
      values.push(patch.qr_refs_json);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      this.db,
      `UPDATE ar_ling_expressions SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  }

  // ── Expression Tokens ──────────────────────────────────────────────────────

  tokens(expressionId: string): Promise<ExpressionToken[]> {
    return query<ExpressionToken>(
      this.db,
      `SELECT id, expression_id, token_position, token_text, lemma_id, note_md
       FROM ar_ling_expression_tokens
       WHERE expression_id = ?
       ORDER BY token_position`,
      [expressionId],
    );
  }

  async addToken(
    expressionId: string,
    input: ExpressionTokenCreate,
  ): Promise<ExpressionToken> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_expression_tokens
         (id, expression_id, token_position, token_text, lemma_id, note_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        expressionId,
        input.token_position,
        input.token_text,
        input.lemma_id ?? null,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<ExpressionToken>(
      this.db,
      `SELECT id, expression_id, token_position, token_text, lemma_id, note_md
       FROM ar_ling_expression_tokens WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Collocations ───────────────────────────────────────────────────────────

  collocations(lemmaRef: string, opts: PaginateOptions = {}) {
    return paginate<Collocation>(
      this.db,
      `SELECT id, lemma_a_id, lemma_b_id, collocation_type, frequency_note, note_md
       FROM ar_ling_collocations
       WHERE lemma_a_id = ? OR lemma_b_id = ?
       ORDER BY collocation_type`,
      `SELECT COUNT(*) AS count
       FROM ar_ling_collocations
       WHERE lemma_a_id = ? OR lemma_b_id = ?`,
      [lemmaRef, lemmaRef],
      opts,
    );
  }

  async addCollocation(input: CollocationCreate): Promise<Collocation> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_collocations
         (id, lemma_a_id, lemma_b_id, collocation_type, frequency_note, note_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.lemma_a_id,
        input.lemma_b_id,
        input.collocation_type ?? 'general',
        input.frequency_note ?? null,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<Collocation>(
      this.db,
      `SELECT id, lemma_a_id, lemma_b_id, collocation_type, frequency_note, note_md
       FROM ar_ling_collocations WHERE id = ?`,
      [id],
    ))!;
  }
}

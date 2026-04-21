// ─── Expression schemas & types ───────────────────────────────────────────────
// Tables: ar_ling_expression_types, ar_ling_expressions,
//         ar_ling_expression_tokens, ar_ling_collocations

// ── ar_ling_expression_types ──────────────────────────────────────────────────

export interface ArLingExpressionType {
  id: string;              // AL:ULID
  type_key: string;        // UNIQUE — 'idiom'|'phrase'|'proverb'|'hadith_phrase'|...
  name_ar: string;
  name_en: string;
  description_md: string | null;
}

export interface ArLingExpressionTypeCreate {
  type_key: string;
  name_ar: string;
  name_en: string;
  description_md?: string | null;
}

export interface ArLingExpressionTypePatch {
  type_key?: string;
  name_ar?: string;
  name_en?: string;
  description_md?: string | null;
}

export function validateArLingExpressionTypeCreate(
  body: unknown,
): { data: ArLingExpressionTypeCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.type_key !== 'string' || !b.type_key.trim())
    return { error: 'type_key is required' };
  if (typeof b.name_ar !== 'string' || !b.name_ar.trim())
    return { error: 'name_ar is required' };
  if (typeof b.name_en !== 'string' || !b.name_en.trim())
    return { error: 'name_en is required' };
  return {
    data: {
      type_key: b.type_key.trim(),
      name_ar: b.name_ar.trim(),
      name_en: b.name_en.trim(),
      description_md: typeof b.description_md === 'string'
        ? b.description_md
        : b.description_md === null ? null : undefined,
    },
  };
}

// ── ar_ling_expressions ───────────────────────────────────────────────────────

export interface ArLingExpression {
  id: string;                         // AL:ULID
  expression_ar: string;
  expression_en: string;
  expression_type_id: string | null;  // FK → ar_ling_expression_types.id
  primary_lemma_id: string | null;    // FK → ar_ling_lemmas.id
  explanation_md: string | null;
  qr_refs_json: string | null;        // JSON [{qr_ref, note}]
  created_at: string;
}

export interface ArLingExpressionCreate {
  expression_ar: string;
  expression_en: string;
  expression_type_id?: string | null;
  primary_lemma_id?: string | null;
  explanation_md?: string | null;
  qr_refs_json?: string | null;
}

export interface ArLingExpressionPatch {
  expression_en?: string;
  expression_type_id?: string | null;
  primary_lemma_id?: string | null;
  explanation_md?: string | null;
  qr_refs_json?: string | null;
}

export function validateArLingExpressionCreate(
  body: unknown,
): { data: ArLingExpressionCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.expression_ar !== 'string' || !b.expression_ar.trim())
    return { error: 'expression_ar is required' };
  if (typeof b.expression_en !== 'string' || !b.expression_en.trim())
    return { error: 'expression_en is required' };
  return {
    data: {
      expression_ar: b.expression_ar.trim(),
      expression_en: b.expression_en.trim(),
      expression_type_id: typeof b.expression_type_id === 'string'
        ? b.expression_type_id
        : b.expression_type_id === null ? null : undefined,
      primary_lemma_id: typeof b.primary_lemma_id === 'string'
        ? b.primary_lemma_id
        : b.primary_lemma_id === null ? null : undefined,
      explanation_md: typeof b.explanation_md === 'string'
        ? b.explanation_md
        : b.explanation_md === null ? null : undefined,
      qr_refs_json: typeof b.qr_refs_json === 'string'
        ? b.qr_refs_json
        : b.qr_refs_json === null ? null : undefined,
    },
  };
}

// ── ar_ling_expression_tokens ─────────────────────────────────────────────────

export interface ArLingExpressionToken {
  id: string;              // AL:ULID
  expression_id: string;   // FK → ar_ling_expressions.id
  token_position: number;
  token_text: string;
  lemma_id: string | null; // FK → ar_ling_lemmas.id
  note_md: string | null;
}

export interface ArLingExpressionTokenCreate {
  token_position: number;
  token_text: string;
  lemma_id?: string | null;
  note_md?: string | null;
}

export interface ArLingExpressionTokenPatch {
  token_position?: number;
  token_text?: string;
  lemma_id?: string | null;
  note_md?: string | null;
}

export function validateArLingExpressionTokenCreate(
  body: unknown,
): { data: ArLingExpressionTokenCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.token_position !== 'number')
    return { error: 'token_position is required and must be a number' };
  if (typeof b.token_text !== 'string' || !b.token_text.trim())
    return { error: 'token_text is required' };
  return {
    data: {
      token_position: b.token_position,
      token_text: b.token_text.trim(),
      lemma_id: typeof b.lemma_id === 'string' ? b.lemma_id : b.lemma_id === null ? null : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : b.note_md === null ? null : undefined,
    },
  };
}

// ── ar_ling_collocations ──────────────────────────────────────────────────────

export interface ArLingCollocation {
  id: string;                  // AL:ULID
  lemma_a_id: string;          // FK → ar_ling_lemmas.id
  lemma_b_id: string;          // FK → ar_ling_lemmas.id
  collocation_type: string;
  // 'general'|'verb_object'|'noun_adjective'|'idafa'|'verb_particle'|'other'
  frequency_note: string | null;
  note_md: string | null;
}

export interface ArLingCollocationCreate {
  lemma_a_id: string;
  lemma_b_id: string;
  collocation_type?: string;
  frequency_note?: string | null;
  note_md?: string | null;
}

export interface ArLingCollocationPatch {
  collocation_type?: string;
  frequency_note?: string | null;
  note_md?: string | null;
}

// Repository-compatible aliases. The ArLing* names keep this schema file
// domain-explicit, while these aliases match expression.repo.ts contracts.
export type ExpressionType = ArLingExpressionType;
export type ExpressionTypeCreate = ArLingExpressionTypeCreate;
export type ExpressionTypePatch = ArLingExpressionTypePatch;
export type Expression = ArLingExpression;
export type ExpressionCreate = ArLingExpressionCreate;
export type ExpressionPatch = ArLingExpressionPatch;
export type ExpressionToken = ArLingExpressionToken;
export type ExpressionTokenCreate = ArLingExpressionTokenCreate;
export type ExpressionTokenPatch = ArLingExpressionTokenPatch;
export type Collocation = ArLingCollocation;
export type CollocationCreate = ArLingCollocationCreate;
export type CollocationPatch = ArLingCollocationPatch;

export function validateArLingCollocationCreate(
  body: unknown,
): { data: ArLingCollocationCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lemma_a_id !== 'string' || !b.lemma_a_id.trim())
    return { error: 'lemma_a_id is required' };
  if (typeof b.lemma_b_id !== 'string' || !b.lemma_b_id.trim())
    return { error: 'lemma_b_id is required' };
  return {
    data: {
      lemma_a_id: b.lemma_a_id.trim(),
      lemma_b_id: b.lemma_b_id.trim(),
      collocation_type:
        typeof b.collocation_type === 'string' ? b.collocation_type : undefined,
      frequency_note: typeof b.frequency_note === 'string'
        ? b.frequency_note
        : b.frequency_note === null ? null : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : b.note_md === null ? null : undefined,
    },
  };
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArLingExpressionTypePatch(body: unknown): SchemaValidationResult<ArLingExpressionTypePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('type_key' in b) {
    if (typeof b.type_key !== 'string') return { error: 'type_key must be a string' };
    data.type_key = b.type_key;
  }
  if ('name_ar' in b) {
    if (typeof b.name_ar !== 'string') return { error: 'name_ar must be a string' };
    data.name_ar = b.name_ar;
  }
  if ('name_en' in b) {
    if (typeof b.name_en !== 'string') return { error: 'name_en must be a string' };
    data.name_en = b.name_en;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as ArLingExpressionTypePatch };
}

export function validateArLingExpressionPatch(body: unknown): SchemaValidationResult<ArLingExpressionPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('expression_en' in b) {
    if (typeof b.expression_en !== 'string') return { error: 'expression_en must be a string' };
    data.expression_en = b.expression_en;
  }
  if ('expression_type_id' in b) {
    if (b.expression_type_id !== null && typeof b.expression_type_id !== 'string') return { error: 'expression_type_id must be a string or null' };
    data.expression_type_id = b.expression_type_id;
  }
  if ('primary_lemma_id' in b) {
    if (b.primary_lemma_id !== null && typeof b.primary_lemma_id !== 'string') return { error: 'primary_lemma_id must be a string or null' };
    data.primary_lemma_id = b.primary_lemma_id;
  }
  if ('explanation_md' in b) {
    if (b.explanation_md !== null && typeof b.explanation_md !== 'string') return { error: 'explanation_md must be a string or null' };
    data.explanation_md = b.explanation_md;
  }
  if ('qr_refs_json' in b) {
    if (b.qr_refs_json !== null && typeof b.qr_refs_json !== 'string') return { error: 'qr_refs_json must be a string or null' };
    data.qr_refs_json = b.qr_refs_json;
  }

  return { data: data as unknown as ArLingExpressionPatch };
}

export function validateArLingExpressionTokenPatch(body: unknown): SchemaValidationResult<ArLingExpressionTokenPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('token_position' in b) {
    if (typeof b.token_position !== 'number' || !Number.isFinite(b.token_position)) return { error: 'token_position must be a number' };
    data.token_position = b.token_position;
  }
  if ('token_text' in b) {
    if (typeof b.token_text !== 'string') return { error: 'token_text must be a string' };
    data.token_text = b.token_text;
  }
  if ('lemma_id' in b) {
    if (b.lemma_id !== null && typeof b.lemma_id !== 'string') return { error: 'lemma_id must be a string or null' };
    data.lemma_id = b.lemma_id;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingExpressionTokenPatch };
}

export function validateArLingCollocationPatch(body: unknown): SchemaValidationResult<ArLingCollocationPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('collocation_type' in b) {
    if (typeof b.collocation_type !== 'string') return { error: 'collocation_type must be a string' };
    data.collocation_type = b.collocation_type;
  }
  if ('frequency_note' in b) {
    if (b.frequency_note !== null && typeof b.frequency_note !== 'string') return { error: 'frequency_note must be a string or null' };
    data.frequency_note = b.frequency_note;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingCollocationPatch };
}

export function validateExpressionTypeCreate(body: unknown): SchemaValidationResult<ExpressionTypeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as unknown as ExpressionTypeCreate };
}

export function validateExpressionTypePatch(body: unknown): SchemaValidationResult<ExpressionTypePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as unknown as ExpressionTypePatch };
}

export function validateExpressionCreate(body: unknown): SchemaValidationResult<ExpressionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as unknown as ExpressionCreate };
}

export function validateExpressionPatch(body: unknown): SchemaValidationResult<ExpressionPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as unknown as ExpressionPatch };
}

export function validateExpressionTokenCreate(body: unknown): SchemaValidationResult<ExpressionTokenCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as unknown as ExpressionTokenCreate };
}

export function validateExpressionTokenPatch(body: unknown): SchemaValidationResult<ExpressionTokenPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as unknown as ExpressionTokenPatch };
}

export function validateCollocationCreate(body: unknown): SchemaValidationResult<CollocationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as unknown as CollocationCreate };
}

export function validateCollocationPatch(body: unknown): SchemaValidationResult<CollocationPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as unknown as CollocationPatch };
}

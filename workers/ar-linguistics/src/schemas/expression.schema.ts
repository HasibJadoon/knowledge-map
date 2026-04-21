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
  description_md?: string;
}

export interface ArLingExpressionTypePatch {
  type_key?: string;
  name_ar?: string;
  name_en?: string;
  description_md?: string;
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
      description_md: typeof b.description_md === 'string' ? b.description_md : undefined,
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
  expression_type_id?: string;
  primary_lemma_id?: string;
  explanation_md?: string;
  qr_refs_json?: string;
}

export interface ArLingExpressionPatch {
  expression_ar?: string;
  expression_en?: string;
  expression_type_id?: string;
  primary_lemma_id?: string;
  explanation_md?: string;
  qr_refs_json?: string;
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
      expression_type_id:
        typeof b.expression_type_id === 'string' ? b.expression_type_id : undefined,
      primary_lemma_id:
        typeof b.primary_lemma_id === 'string' ? b.primary_lemma_id : undefined,
      explanation_md: typeof b.explanation_md === 'string' ? b.explanation_md : undefined,
      qr_refs_json: typeof b.qr_refs_json === 'string' ? b.qr_refs_json : undefined,
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
  expression_id: string;
  token_position: number;
  token_text: string;
  lemma_id?: string;
  note_md?: string;
}

export interface ArLingExpressionTokenPatch {
  token_position?: number;
  token_text?: string;
  lemma_id?: string;
  note_md?: string;
}

export function validateArLingExpressionTokenCreate(
  body: unknown,
): { data: ArLingExpressionTokenCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.expression_id !== 'string' || !b.expression_id.trim())
    return { error: 'expression_id is required' };
  if (typeof b.token_position !== 'number')
    return { error: 'token_position is required and must be a number' };
  if (typeof b.token_text !== 'string' || !b.token_text.trim())
    return { error: 'token_text is required' };
  return {
    data: {
      expression_id: b.expression_id.trim(),
      token_position: b.token_position,
      token_text: b.token_text.trim(),
      lemma_id: typeof b.lemma_id === 'string' ? b.lemma_id : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
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
  frequency_note?: string;
  note_md?: string;
}

export interface ArLingCollocationPatch {
  collocation_type?: string;
  frequency_note?: string;
  note_md?: string;
}

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
      frequency_note: typeof b.frequency_note === 'string' ? b.frequency_note : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ─── Expression schemas & types ───────────────────────────────────────────────

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

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateExpressionCreate(body: unknown): SchemaValidationResult<ExpressionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.arabic !== 'string' || !b.arabic.trim()) return { error: 'arabic is required and must be a non-empty string' };
  data.arabic = b.arabic.trim();
  if ('transliteration' in b) {
    if (b.transliteration !== null && typeof b.transliteration !== 'string') return { error: 'transliteration must be a string or null' };
    data.transliteration = b.transliteration;
  }
  if (typeof b.meaning_en !== 'string' || !b.meaning_en.trim()) return { error: 'meaning_en is required and must be a non-empty string' };
  data.meaning_en = b.meaning_en.trim();
  if ('expression_type' in b) {
    if (typeof b.expression_type !== 'string') return { error: 'expression_type must be a string' };
    data.expression_type = b.expression_type;
  }
  if ('al_expression_ref' in b) {
    if (b.al_expression_ref !== null && typeof b.al_expression_ref !== 'string') return { error: 'al_expression_ref must be a string or null' };
    data.al_expression_ref = b.al_expression_ref;
  }
  if ('domain_id' in b) {
    if (b.domain_id !== null && typeof b.domain_id !== 'string') return { error: 'domain_id must be a string or null' };
    data.domain_id = b.domain_id;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('usage_note' in b) {
    if (b.usage_note !== null && typeof b.usage_note !== 'string') return { error: 'usage_note must be a string or null' };
    data.usage_note = b.usage_note;
  }

  return { data: data as unknown as ExpressionCreate };
}

export function validateAppliedBalaghaCreate(body: unknown): SchemaValidationResult<AppliedBalaghaCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.al_balagha_ref !== 'string' || !b.al_balagha_ref.trim()) return { error: 'al_balagha_ref is required and must be a non-empty string' };
  data.al_balagha_ref = b.al_balagha_ref.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if (typeof b.explanation_md !== 'string' || !b.explanation_md.trim()) return { error: 'explanation_md is required and must be a non-empty string' };
  data.explanation_md = b.explanation_md.trim();
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('qr_scope_ref' in b) {
    if (b.qr_scope_ref !== null && typeof b.qr_scope_ref !== 'string') return { error: 'qr_scope_ref must be a string or null' };
    data.qr_scope_ref = b.qr_scope_ref;
  }
  if ('examples_json' in b) {
    if (b.examples_json !== null && typeof b.examples_json !== 'string') return { error: 'examples_json must be a string or null' };
    data.examples_json = b.examples_json;
  }
  if ('quiz_notes' in b) {
    if (b.quiz_notes !== null && typeof b.quiz_notes !== 'string') return { error: 'quiz_notes must be a string or null' };
    data.quiz_notes = b.quiz_notes;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as AppliedBalaghaCreate };
}

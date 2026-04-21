// ─── Grammar schemas & types ──────────────────────────────────────────────────

export type ArGrammarType = 'nahw' | 'sarf' | 'both';

export interface ArGrammar {
  id: string;                        // AR:ULID
  title: string;
  title_ar: string | null;
  al_nahw_ref: string | null;        // AL:<ar_ling_nahw_concept_id>
  al_morph_ref: string | null;       // AL:<ar_ling_morphology_id>
  grammar_type: ArGrammarType;
  level: string | null;              // A1–C2
  explanation_md: string;
  examples_json: string | null;      // JSON [{arabic, translation, note}]
  rule_summary: string | null;
  qr_scope_ref: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArGrammarCreate {
  title: string;
  title_ar?: string | null;
  grammar_type?: ArGrammarType;
  level?: string | null;
  explanation_md?: string | null;
  rule_summary?: string | null;
  al_nahw_ref?: string | null;
  al_morph_ref?: string | null;
  examples_json?: string | null;
  qr_scope_ref?: string | null;
}

export interface ArGrammarPatch {
  title?: string;
  title_ar?: string | null;
  al_nahw_ref?: string | null;
  al_morph_ref?: string | null;
  grammar_type?: ArGrammarType;
  level?: string | null;
  explanation_md?: string;
  examples_json?: string | null;
  rule_summary?: string | null;
  qr_scope_ref?: string | null;
  meta_json?: string | null;
}

// ─── Grammar Vocabulary Link ──────────────────────────────────────────────────

export type ArGrammarVocabLinkRole = 'example' | 'applies_to' | 'illustrates';

export interface ArGrammarVocabularyLink {
  id: string;
  grammar_id: string;
  vocab_id: string;
  link_role: ArGrammarVocabLinkRole;
  created_at: string;
}

export interface ArGrammarVocabularyLinkCreate {
  grammar_id: string;
  vocab_id: string;
  link_role?: ArGrammarVocabLinkRole;
}

// ─── Unit Grammar Map ─────────────────────────────────────────────────────────

export interface ArUnitGrammarMap {
  id: string;
  unit_id: string;
  grammar_id: string;
  sort_order: number;
  created_at: string;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_GRAMMAR_TYPES: ArGrammarType[] = ['nahw', 'sarf', 'both'];

export function validateArGrammarCreate(
  body: unknown,
): { data: ArGrammarCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }
  if (b.grammar_type !== undefined && !VALID_GRAMMAR_TYPES.includes(b.grammar_type as ArGrammarType)) {
    return { error: `grammar_type must be one of: ${VALID_GRAMMAR_TYPES.join(', ')}` };
  }

  return {
    data: {
      title: (b.title as string).trim(),
      title_ar: typeof b.title_ar === 'string' ? b.title_ar : b.title_ar === null ? null : undefined,
      grammar_type: b.grammar_type !== undefined ? (b.grammar_type as ArGrammarType) : undefined,
      level: typeof b.level === 'string' ? b.level : b.level === null ? null : undefined,
      explanation_md: typeof b.explanation_md === 'string' ? b.explanation_md : undefined,
      rule_summary: typeof b.rule_summary === 'string' ? b.rule_summary : b.rule_summary === null ? null : undefined,
      al_nahw_ref: typeof b.al_nahw_ref === 'string' ? b.al_nahw_ref : b.al_nahw_ref === null ? null : undefined,
      al_morph_ref: typeof b.al_morph_ref === 'string' ? b.al_morph_ref : b.al_morph_ref === null ? null : undefined,
      examples_json: typeof b.examples_json === 'string' ? b.examples_json : b.examples_json === null ? null : undefined,
      qr_scope_ref: typeof b.qr_scope_ref === 'string' ? b.qr_scope_ref : b.qr_scope_ref === null ? null : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface GrammarItem {
  id: string;             // AR:ULID
  container_id: string;   // AR:ULID
  lx_nahw_ref: string;    // AL:ULID → ar_ling_nahw_concepts
  label: string;          // short display label (e.g. "فاعل")
  example_ar: string | null;
  explanation: string | null;
  sort_order: number;
  status: string;
  created_at: string;
}

export interface GrammarCreate {
  container_id: string;
  lx_nahw_ref: string;
  label: string;
  example_ar?: string | null;
  explanation?: string | null;
  sort_order?: number;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArGrammarPatch(body: unknown): SchemaValidationResult<ArGrammarPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('al_nahw_ref' in b) {
    if (b.al_nahw_ref !== null && typeof b.al_nahw_ref !== 'string') return { error: 'al_nahw_ref must be a string or null' };
    data.al_nahw_ref = b.al_nahw_ref;
  }
  if ('al_morph_ref' in b) {
    if (b.al_morph_ref !== null && typeof b.al_morph_ref !== 'string') return { error: 'al_morph_ref must be a string or null' };
    data.al_morph_ref = b.al_morph_ref;
  }
  if ('grammar_type' in b) {
    data.grammar_type = b.grammar_type;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('explanation_md' in b) {
    if (typeof b.explanation_md !== 'string') return { error: 'explanation_md must be a string' };
    data.explanation_md = b.explanation_md;
  }
  if ('examples_json' in b) {
    if (b.examples_json !== null && typeof b.examples_json !== 'string') return { error: 'examples_json must be a string or null' };
    data.examples_json = b.examples_json;
  }
  if ('rule_summary' in b) {
    if (b.rule_summary !== null && typeof b.rule_summary !== 'string') return { error: 'rule_summary must be a string or null' };
    data.rule_summary = b.rule_summary;
  }
  if ('qr_scope_ref' in b) {
    if (b.qr_scope_ref !== null && typeof b.qr_scope_ref !== 'string') return { error: 'qr_scope_ref must be a string or null' };
    data.qr_scope_ref = b.qr_scope_ref;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArGrammarPatch };
}

export function validateArGrammarVocabularyLinkCreate(body: unknown): SchemaValidationResult<ArGrammarVocabularyLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.grammar_id !== 'string' || !b.grammar_id.trim()) return { error: 'grammar_id is required and must be a non-empty string' };
  data.grammar_id = b.grammar_id.trim();
  if (typeof b.vocab_id !== 'string' || !b.vocab_id.trim()) return { error: 'vocab_id is required and must be a non-empty string' };
  data.vocab_id = b.vocab_id.trim();
  if ('link_role' in b) {
    data.link_role = b.link_role;
  }

  return { data: data as unknown as ArGrammarVocabularyLinkCreate };
}

export function validateGrammarCreate(body: unknown): SchemaValidationResult<GrammarCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.container_id !== 'string' || !b.container_id.trim()) return { error: 'container_id is required and must be a non-empty string' };
  data.container_id = b.container_id.trim();
  if (typeof b.lx_nahw_ref !== 'string' || !b.lx_nahw_ref.trim()) return { error: 'lx_nahw_ref is required and must be a non-empty string' };
  data.lx_nahw_ref = b.lx_nahw_ref.trim();
  if (typeof b.label !== 'string' || !b.label.trim()) return { error: 'label is required and must be a non-empty string' };
  data.label = b.label.trim();
  if ('example_ar' in b) {
    if (b.example_ar !== null && typeof b.example_ar !== 'string') return { error: 'example_ar must be a string or null' };
    data.example_ar = b.example_ar;
  }
  if ('explanation' in b) {
    if (b.explanation !== null && typeof b.explanation !== 'string') return { error: 'explanation must be a string or null' };
    data.explanation = b.explanation;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as GrammarCreate };
}

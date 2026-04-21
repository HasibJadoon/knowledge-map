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

// ─── Morphology schemas & types ───────────────────────────────────────────────
// Tables: ar_ling_morphology, ar_ling_lemma_morphology,
//         ar_ling_form_paradigms, ar_ling_inflection_rules,
//         ar_ling_conjugation_templates

// ── ar_ling_morphology ────────────────────────────────────────────────────────

export interface ArLingMorphology {
  id: string;                    // AL:ULID
  pattern: string;               // وزن  e.g. فَاعِل
  gender: string | null;         // 'masculine'|'feminine'|'both'
  number: string | null;         // 'singular'|'dual'|'plural'|'broken_plural'
  case_marker: string | null;    // 'triptote'|'diptote'|'indeclinable'
  tense: string | null;          // 'past'|'present'|'imperative'
  voice: string | null;          // 'active'|'passive'
  person: string | null;         // '1st'|'2nd'|'3rd'
  definiteness: string | null;   // 'definite'|'indefinite'|'both'
  derivation_type: string | null;
  // 'masdar'|'ism_fail'|'ism_maf_ul'|'sifah'|'ism_makan'|'ism_zaman'|'ism_alah'|'other'
  note_md: string | null;
  created_at: string;
}

export interface ArLingMorphologyCreate {
  pattern: string;
  gender?: string;
  number?: string;
  case_marker?: string;
  tense?: string;
  voice?: string;
  person?: string;
  definiteness?: string;
  derivation_type?: string;
  note_md?: string;
}

export interface ArLingMorphologyPatch {
  pattern?: string;
  gender?: string;
  number?: string;
  case_marker?: string;
  tense?: string;
  voice?: string;
  person?: string;
  definiteness?: string;
  derivation_type?: string;
  note_md?: string;
}

export function validateArLingMorphologyCreate(
  body: unknown,
): { data: ArLingMorphologyCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.pattern !== 'string' || !b.pattern.trim())
    return { error: 'pattern is required' };
  return {
    data: {
      pattern: b.pattern.trim(),
      gender: typeof b.gender === 'string' ? b.gender : undefined,
      number: typeof b.number === 'string' ? b.number : undefined,
      case_marker: typeof b.case_marker === 'string' ? b.case_marker : undefined,
      tense: typeof b.tense === 'string' ? b.tense : undefined,
      voice: typeof b.voice === 'string' ? b.voice : undefined,
      person: typeof b.person === 'string' ? b.person : undefined,
      definiteness: typeof b.definiteness === 'string' ? b.definiteness : undefined,
      derivation_type: typeof b.derivation_type === 'string' ? b.derivation_type : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ── ar_ling_lemma_morphology ──────────────────────────────────────────────────

export interface ArLingLemmaMorphology {
  id: string;                    // AL:ULID
  lemma_id: string;              // FK → ar_ling_lemmas.id
  morphology_id: string;         // FK → ar_ling_morphology.id
  inflected_form: string | null; // actual inflected surface form
}

export interface ArLingLemmaMorphologyCreate {
  lemma_id: string;
  morphology_id: string;
  inflected_form?: string;
}

export function validateArLingLemmaMorphologyCreate(
  body: unknown,
): { data: ArLingLemmaMorphologyCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lemma_id !== 'string' || !b.lemma_id.trim())
    return { error: 'lemma_id is required' };
  if (typeof b.morphology_id !== 'string' || !b.morphology_id.trim())
    return { error: 'morphology_id is required' };
  return {
    data: {
      lemma_id: b.lemma_id.trim(),
      morphology_id: b.morphology_id.trim(),
      inflected_form: typeof b.inflected_form === 'string' ? b.inflected_form : undefined,
    },
  };
}

// ── ar_ling_form_paradigms ────────────────────────────────────────────────────

export interface ArLingFormParadigm {
  id: string;              // AL:ULID
  paradigm_name: string;   // e.g. 'فَعَلَ trilateral sound verb'
  paradigm_type: string;
  // 'verb_conjugation'|'noun_declension'|'adjective_declension'|'broken_plural_pattern'
  verb_form: string | null;    // form_i … form_xv
  root_type: string | null;    // sound/weak/hamzated/doubled
  paradigm_json: string;       // JSON: {past_3ms, past_3fs, …}
  note_md: string | null;
  created_at: string;
}

export interface ArLingFormParadigmCreate {
  paradigm_name: string;
  paradigm_type: string;
  paradigm_json: string;
  verb_form?: string;
  root_type?: string;
  note_md?: string;
}

export interface ArLingFormParadigmPatch {
  paradigm_name?: string;
  paradigm_type?: string;
  paradigm_json?: string;
  verb_form?: string;
  root_type?: string;
  note_md?: string;
}

export function validateArLingFormParadigmCreate(
  body: unknown,
): { data: ArLingFormParadigmCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.paradigm_name !== 'string' || !b.paradigm_name.trim())
    return { error: 'paradigm_name is required' };
  if (typeof b.paradigm_type !== 'string' || !b.paradigm_type.trim())
    return { error: 'paradigm_type is required' };
  if (typeof b.paradigm_json !== 'string' || !b.paradigm_json.trim())
    return { error: 'paradigm_json is required' };
  return {
    data: {
      paradigm_name: b.paradigm_name.trim(),
      paradigm_type: b.paradigm_type.trim(),
      paradigm_json: b.paradigm_json,
      verb_form: typeof b.verb_form === 'string' ? b.verb_form : undefined,
      root_type: typeof b.root_type === 'string' ? b.root_type : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ── ar_ling_inflection_rules ──────────────────────────────────────────────────

export interface ArLingInflectionRule {
  id: string;                    // AL:ULID
  rule_name: string;
  rule_type: string;
  // 'assimilation'|'deletion'|'substitution'|'hamza_rule'|'weak_verb_change'|'nunation'|'other'
  applies_to: string;            // pattern, root_type, context
  rule_description_md: string;
  example_before: string | null;
  example_after: string | null;
  note_md: string | null;
}

export interface ArLingInflectionRuleCreate {
  rule_name: string;
  rule_type: string;
  applies_to: string;
  rule_description_md: string;
  example_before?: string;
  example_after?: string;
  note_md?: string;
}

export interface ArLingInflectionRulePatch {
  rule_name?: string;
  rule_type?: string;
  applies_to?: string;
  rule_description_md?: string;
  example_before?: string;
  example_after?: string;
  note_md?: string;
}

export function validateArLingInflectionRuleCreate(
  body: unknown,
): { data: ArLingInflectionRuleCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.rule_name !== 'string' || !b.rule_name.trim())
    return { error: 'rule_name is required' };
  if (typeof b.rule_type !== 'string' || !b.rule_type.trim())
    return { error: 'rule_type is required' };
  if (typeof b.applies_to !== 'string' || !b.applies_to.trim())
    return { error: 'applies_to is required' };
  if (typeof b.rule_description_md !== 'string' || !b.rule_description_md.trim())
    return { error: 'rule_description_md is required' };
  return {
    data: {
      rule_name: b.rule_name.trim(),
      rule_type: b.rule_type.trim(),
      applies_to: b.applies_to.trim(),
      rule_description_md: b.rule_description_md,
      example_before: typeof b.example_before === 'string' ? b.example_before : undefined,
      example_after: typeof b.example_after === 'string' ? b.example_after : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ── ar_ling_conjugation_templates ─────────────────────────────────────────────

export interface ArLingConjugationTemplate {
  id: string;              // AL:ULID
  paradigm_id: string;     // FK → ar_ling_form_paradigms.id
  person: string;          // '3ms'|'3fs'|'3md'|'3mp'|'3fp'|'2ms'|…
  tense: string;           // 'past'|'present'|'imperative'|'subjunctive'|'jussive'
  voice: string;           // 'active'|'passive'
  template_form: string;   // abstract form using ف-ع-ل placeholders
  note_md: string | null;
}

export interface ArLingConjugationTemplateCreate {
  paradigm_id: string;
  person: string;
  tense: string;
  template_form: string;
  voice?: string;
  note_md?: string;
}

export interface ArLingConjugationTemplatePatch {
  person?: string;
  tense?: string;
  voice?: string;
  template_form?: string;
  note_md?: string;
}

export function validateArLingConjugationTemplateCreate(
  body: unknown,
): { data: ArLingConjugationTemplateCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.paradigm_id !== 'string' || !b.paradigm_id.trim())
    return { error: 'paradigm_id is required' };
  if (typeof b.person !== 'string' || !b.person.trim())
    return { error: 'person is required' };
  if (typeof b.tense !== 'string' || !b.tense.trim())
    return { error: 'tense is required' };
  if (typeof b.template_form !== 'string' || !b.template_form.trim())
    return { error: 'template_form is required' };
  return {
    data: {
      paradigm_id: b.paradigm_id.trim(),
      person: b.person.trim(),
      tense: b.tense.trim(),
      template_form: b.template_form.trim(),
      voice: typeof b.voice === 'string' ? b.voice : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

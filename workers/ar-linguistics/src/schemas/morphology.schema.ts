// ─── Morphology schemas & types ───────────────────────────────────────────────
// Tables: ar_ling_morphology, ar_ling_lemma_morphology,
//         ar_ling_root_form_paradigm, ar_ling_inflection_rules,
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
  lemma_id: string;              // FK → ar_ling_root_lemma.id
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

// ── ar_ling_root_form_paradigm ────────────────────────────────────────────────────

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
  paradigm_id: string;     // FK → ar_ling_root_form_paradigm.id
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

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface MorphologyEntry {
  id: string;           // AL:ULID
  lemma_id: string;     // AL:ULID
  form_ar: string;
  stem_type: string | null;  // verb_form | noun_pattern | ...
  pattern: string | null;    // فَعَلَ / فِعَال etc.
  tags: string | null;       // JSON array of grammatical tags
}

export interface FormParadigm {
  id: string;           // AL:ULID
  paradigm_name: string;
  category: string;     // verb | noun | adjective | ...
  pattern: string;
  example_ar: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArLingMorphologyPatch(body: unknown): SchemaValidationResult<ArLingMorphologyPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('pattern' in b) {
    if (typeof b.pattern !== 'string') return { error: 'pattern must be a string' };
    data.pattern = b.pattern;
  }
  if ('gender' in b) {
    if (typeof b.gender !== 'string') return { error: 'gender must be a string' };
    data.gender = b.gender;
  }
  if ('number' in b) {
    if (typeof b.number !== 'string') return { error: 'number must be a string' };
    data.number = b.number;
  }
  if ('case_marker' in b) {
    if (typeof b.case_marker !== 'string') return { error: 'case_marker must be a string' };
    data.case_marker = b.case_marker;
  }
  if ('tense' in b) {
    if (typeof b.tense !== 'string') return { error: 'tense must be a string' };
    data.tense = b.tense;
  }
  if ('voice' in b) {
    if (typeof b.voice !== 'string') return { error: 'voice must be a string' };
    data.voice = b.voice;
  }
  if ('person' in b) {
    if (typeof b.person !== 'string') return { error: 'person must be a string' };
    data.person = b.person;
  }
  if ('definiteness' in b) {
    if (typeof b.definiteness !== 'string') return { error: 'definiteness must be a string' };
    data.definiteness = b.definiteness;
  }
  if ('derivation_type' in b) {
    if (typeof b.derivation_type !== 'string') return { error: 'derivation_type must be a string' };
    data.derivation_type = b.derivation_type;
  }
  if ('note_md' in b) {
    if (typeof b.note_md !== 'string') return { error: 'note_md must be a string' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingMorphologyPatch };
}

export function validateArLingFormParadigmPatch(body: unknown): SchemaValidationResult<ArLingFormParadigmPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('paradigm_name' in b) {
    if (typeof b.paradigm_name !== 'string') return { error: 'paradigm_name must be a string' };
    data.paradigm_name = b.paradigm_name;
  }
  if ('paradigm_type' in b) {
    if (typeof b.paradigm_type !== 'string') return { error: 'paradigm_type must be a string' };
    data.paradigm_type = b.paradigm_type;
  }
  if ('paradigm_json' in b) {
    if (typeof b.paradigm_json !== 'string') return { error: 'paradigm_json must be a string' };
    data.paradigm_json = b.paradigm_json;
  }
  if ('verb_form' in b) {
    if (typeof b.verb_form !== 'string') return { error: 'verb_form must be a string' };
    data.verb_form = b.verb_form;
  }
  if ('root_type' in b) {
    if (typeof b.root_type !== 'string') return { error: 'root_type must be a string' };
    data.root_type = b.root_type;
  }
  if ('note_md' in b) {
    if (typeof b.note_md !== 'string') return { error: 'note_md must be a string' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingFormParadigmPatch };
}

export function validateArLingInflectionRulePatch(body: unknown): SchemaValidationResult<ArLingInflectionRulePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('rule_name' in b) {
    if (typeof b.rule_name !== 'string') return { error: 'rule_name must be a string' };
    data.rule_name = b.rule_name;
  }
  if ('rule_type' in b) {
    if (typeof b.rule_type !== 'string') return { error: 'rule_type must be a string' };
    data.rule_type = b.rule_type;
  }
  if ('applies_to' in b) {
    if (typeof b.applies_to !== 'string') return { error: 'applies_to must be a string' };
    data.applies_to = b.applies_to;
  }
  if ('rule_description_md' in b) {
    if (typeof b.rule_description_md !== 'string') return { error: 'rule_description_md must be a string' };
    data.rule_description_md = b.rule_description_md;
  }
  if ('example_before' in b) {
    if (typeof b.example_before !== 'string') return { error: 'example_before must be a string' };
    data.example_before = b.example_before;
  }
  if ('example_after' in b) {
    if (typeof b.example_after !== 'string') return { error: 'example_after must be a string' };
    data.example_after = b.example_after;
  }
  if ('note_md' in b) {
    if (typeof b.note_md !== 'string') return { error: 'note_md must be a string' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingInflectionRulePatch };
}

export function validateArLingConjugationTemplatePatch(body: unknown): SchemaValidationResult<ArLingConjugationTemplatePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('person' in b) {
    if (typeof b.person !== 'string') return { error: 'person must be a string' };
    data.person = b.person;
  }
  if ('tense' in b) {
    if (typeof b.tense !== 'string') return { error: 'tense must be a string' };
    data.tense = b.tense;
  }
  if ('voice' in b) {
    if (typeof b.voice !== 'string') return { error: 'voice must be a string' };
    data.voice = b.voice;
  }
  if ('template_form' in b) {
    if (typeof b.template_form !== 'string') return { error: 'template_form must be a string' };
    data.template_form = b.template_form;
  }
  if ('note_md' in b) {
    if (typeof b.note_md !== 'string') return { error: 'note_md must be a string' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingConjugationTemplatePatch };
}

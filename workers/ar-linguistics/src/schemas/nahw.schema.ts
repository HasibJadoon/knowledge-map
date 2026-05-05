// ─── Nahw / Syntax schemas & types ────────────────────────────────────────────
// Tables: ar_ling_nahw_concepts, ar_ling_nahw_relations,
//         ar_ling_sentence_types, ar_ling_clause_types,
//         ar_ling_phrase_types, ar_ling_syntax_relation_types

// ── ar_ling_nahw_concepts ─────────────────────────────────────────────────────

export interface ArLingNahwConcept {
  id: string;                        // typed ref, e.g. AL:nahw:mubtada
  parent_id: string | null;          // self-ref for hierarchy
  concept_name_ar: string;
  concept_name_en: string;
  concept_type: string;
  // 'rule'|'term'|'category'|'function'|'phenomenon'|'irab_case'|'particle_class'
  definition_ar: string | null;
  definition_en: string | null;
  example_ar: string | null;
  irab_label: string | null;         // e.g. 'مبتدأ'|'خبر'|'فاعل'
  discipline_unit_id: string | null; // FK → ar_ling_discipline_units.id
  source_ref: string | null;         // AL:<ar_ling_sources.id>
  note_md: string | null;
  created_at: string;
}

export interface ArLingNahwConceptCreate {
  concept_name_ar: string;
  concept_name_en: string;
  concept_type?: string;
  parent_id?: string;
  definition_ar?: string;
  definition_en?: string;
  example_ar?: string;
  irab_label?: string;
  discipline_unit_id?: string;
  source_ref?: string;
  note_md?: string;
}

export interface ArLingNahwConceptPatch {
  concept_name_ar?: string;
  concept_name_en?: string;
  concept_type?: string;
  parent_id?: string;
  definition_ar?: string;
  definition_en?: string;
  example_ar?: string;
  irab_label?: string;
  discipline_unit_id?: string;
  source_ref?: string;
  note_md?: string;
}

export function validateArLingNahwConceptCreate(
  body: unknown,
): { data: ArLingNahwConceptCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.concept_name_ar !== 'string' || !b.concept_name_ar.trim())
    return { error: 'concept_name_ar is required' };
  if (typeof b.concept_name_en !== 'string' || !b.concept_name_en.trim())
    return { error: 'concept_name_en is required' };
  return {
    data: {
      concept_name_ar: b.concept_name_ar.trim(),
      concept_name_en: b.concept_name_en.trim(),
      concept_type: typeof b.concept_type === 'string' ? b.concept_type : undefined,
      parent_id: typeof b.parent_id === 'string' ? b.parent_id : undefined,
      definition_ar: typeof b.definition_ar === 'string' ? b.definition_ar : undefined,
      definition_en: typeof b.definition_en === 'string' ? b.definition_en : undefined,
      example_ar: typeof b.example_ar === 'string' ? b.example_ar : undefined,
      irab_label: typeof b.irab_label === 'string' ? b.irab_label : undefined,
      discipline_unit_id:
        typeof b.discipline_unit_id === 'string' ? b.discipline_unit_id : undefined,
      source_ref: typeof b.source_ref === 'string' ? b.source_ref : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ── ar_ling_nahw_relations ────────────────────────────────────────────────────

export interface ArLingNahwRelation {
  id: string;                // AL:ULID
  from_concept_id: string;   // FK → ar_ling_nahw_concepts.id
  to_concept_id: string;     // FK → ar_ling_nahw_concepts.id
  relation_type: string;
  // 'governs'|'subcategory_of'|'requires'|'conflicts_with'|'example_of'|'related_to'
  note_md: string | null;
}

export interface ArLingNahwRelationCreate {
  from_concept_id: string;
  to_concept_id: string;
  relation_type: string;
  note_md?: string;
}

export function validateArLingNahwRelationCreate(
  body: unknown,
): { data: ArLingNahwRelationCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.from_concept_id !== 'string' || !b.from_concept_id.trim())
    return { error: 'from_concept_id is required' };
  if (typeof b.to_concept_id !== 'string' || !b.to_concept_id.trim())
    return { error: 'to_concept_id is required' };
  if (typeof b.relation_type !== 'string' || !b.relation_type.trim())
    return { error: 'relation_type is required' };
  return {
    data: {
      from_concept_id: b.from_concept_id.trim(),
      to_concept_id: b.to_concept_id.trim(),
      relation_type: b.relation_type.trim(),
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ── ar_ling_sentence_types ────────────────────────────────────────────────────

export interface ArLingSentenceType {
  id: string;              // AL:ULID
  name_ar: string;
  name_en: string;
  sentence_class: string;
  // 'ismiyyah'|'fi_liyyah'|'conditional'|'interrogative'|'nominal_verbless'|'other'
  description_md: string | null;
}

export interface ArLingSentenceTypeCreate {
  name_ar: string;
  name_en: string;
  sentence_class: string;
  description_md?: string;
}

export interface ArLingSentenceTypePatch {
  name_ar?: string;
  name_en?: string;
  sentence_class?: string;
  description_md?: string;
}

export function validateArLingSentenceTypeCreate(
  body: unknown,
): { data: ArLingSentenceTypeCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.name_ar !== 'string' || !b.name_ar.trim())
    return { error: 'name_ar is required' };
  if (typeof b.name_en !== 'string' || !b.name_en.trim())
    return { error: 'name_en is required' };
  if (typeof b.sentence_class !== 'string' || !b.sentence_class.trim())
    return { error: 'sentence_class is required' };
  return {
    data: {
      name_ar: b.name_ar.trim(),
      name_en: b.name_en.trim(),
      sentence_class: b.sentence_class.trim(),
      description_md: typeof b.description_md === 'string' ? b.description_md : undefined,
    },
  };
}

// ── ar_ling_clause_types ──────────────────────────────────────────────────────

export interface ArLingClauseType {
  id: string;                     // AL:ULID
  name_ar: string;
  name_en: string;
  clause_function: string | null;
  // 'sifah'|'hal'|'maf_ul'|'relative'|'conditional_protasis'|'conditional_apodosis'|'other'
  description_md: string | null;
}

export interface ArLingClauseTypeCreate {
  name_ar: string;
  name_en: string;
  clause_function?: string;
  description_md?: string;
}

export interface ArLingClauseTypePatch {
  name_ar?: string;
  name_en?: string;
  clause_function?: string;
  description_md?: string;
}

export function validateArLingClauseTypeCreate(
  body: unknown,
): { data: ArLingClauseTypeCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.name_ar !== 'string' || !b.name_ar.trim())
    return { error: 'name_ar is required' };
  if (typeof b.name_en !== 'string' || !b.name_en.trim())
    return { error: 'name_en is required' };
  return {
    data: {
      name_ar: b.name_ar.trim(),
      name_en: b.name_en.trim(),
      clause_function: typeof b.clause_function === 'string' ? b.clause_function : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : undefined,
    },
  };
}

// ── ar_ling_phrase_types ──────────────────────────────────────────────────────

export interface ArLingPhraseType {
  id: string;                   // AL:ULID
  name_ar: string;
  name_en: string;
  phrase_class: string | null;
  // 'idafa'|'na_t'|'tawkid'|'hal_phrase'|'jar_majrur'|'mubtada_khabar'|'other'
  description_md: string | null;
}

export interface ArLingPhraseTypeCreate {
  name_ar: string;
  name_en: string;
  phrase_class?: string;
  description_md?: string;
}

export interface ArLingPhraseTypePatch {
  name_ar?: string;
  name_en?: string;
  phrase_class?: string;
  description_md?: string;
}

export function validateArLingPhraseTypeCreate(
  body: unknown,
): { data: ArLingPhraseTypeCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.name_ar !== 'string' || !b.name_ar.trim())
    return { error: 'name_ar is required' };
  if (typeof b.name_en !== 'string' || !b.name_en.trim())
    return { error: 'name_en is required' };
  return {
    data: {
      name_ar: b.name_ar.trim(),
      name_en: b.name_en.trim(),
      phrase_class: typeof b.phrase_class === 'string' ? b.phrase_class : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : undefined,
    },
  };
}

// ── ar_ling_syntax_relation_types ─────────────────────────────────────────────

export interface ArLingSyntaxRelationType {
  id: string;                   // AL:ULID
  name_ar: string;
  name_en: string;
  description_md: string | null;
}

export interface ArLingSyntaxRelationTypeCreate {
  name_ar: string;
  name_en: string;
  description_md?: string;
}

export interface ArLingSyntaxRelationTypePatch {
  name_ar?: string;
  name_en?: string;
  description_md?: string;
}

export function validateArLingSyntaxRelationTypeCreate(
  body: unknown,
): { data: ArLingSyntaxRelationTypeCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.name_ar !== 'string' || !b.name_ar.trim())
    return { error: 'name_ar is required' };
  if (typeof b.name_en !== 'string' || !b.name_en.trim())
    return { error: 'name_en is required' };
  return {
    data: {
      name_ar: b.name_ar.trim(),
      name_en: b.name_en.trim(),
      description_md: typeof b.description_md === 'string' ? b.description_md : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface NahwConcept {
  id: string;           // AL:ULID
  concept_key: string;  // e.g. 'mubtada', 'khabar', 'fail'
  label_ar: string;
  label_en: string;
  category: string;     // syntax | morphology | grammar
  description: string | null;
  parent_id: string | null;  // AL:ULID (for hierarchical tree)
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArLingNahwConceptPatch(body: unknown): SchemaValidationResult<ArLingNahwConceptPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('concept_name_ar' in b) {
    if (typeof b.concept_name_ar !== 'string') return { error: 'concept_name_ar must be a string' };
    data.concept_name_ar = b.concept_name_ar;
  }
  if ('concept_name_en' in b) {
    if (typeof b.concept_name_en !== 'string') return { error: 'concept_name_en must be a string' };
    data.concept_name_en = b.concept_name_en;
  }
  if ('concept_type' in b) {
    if (typeof b.concept_type !== 'string') return { error: 'concept_type must be a string' };
    data.concept_type = b.concept_type;
  }
  if ('parent_id' in b) {
    if (typeof b.parent_id !== 'string') return { error: 'parent_id must be a string' };
    data.parent_id = b.parent_id;
  }
  if ('definition_ar' in b) {
    if (typeof b.definition_ar !== 'string') return { error: 'definition_ar must be a string' };
    data.definition_ar = b.definition_ar;
  }
  if ('definition_en' in b) {
    if (typeof b.definition_en !== 'string') return { error: 'definition_en must be a string' };
    data.definition_en = b.definition_en;
  }
  if ('example_ar' in b) {
    if (typeof b.example_ar !== 'string') return { error: 'example_ar must be a string' };
    data.example_ar = b.example_ar;
  }
  if ('irab_label' in b) {
    if (typeof b.irab_label !== 'string') return { error: 'irab_label must be a string' };
    data.irab_label = b.irab_label;
  }
  if ('discipline_unit_id' in b) {
    if (typeof b.discipline_unit_id !== 'string') return { error: 'discipline_unit_id must be a string' };
    data.discipline_unit_id = b.discipline_unit_id;
  }
  if ('source_ref' in b) {
    if (typeof b.source_ref !== 'string') return { error: 'source_ref must be a string' };
    data.source_ref = b.source_ref;
  }
  if ('note_md' in b) {
    if (typeof b.note_md !== 'string') return { error: 'note_md must be a string' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingNahwConceptPatch };
}

export function validateArLingSentenceTypePatch(body: unknown): SchemaValidationResult<ArLingSentenceTypePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('name_ar' in b) {
    if (typeof b.name_ar !== 'string') return { error: 'name_ar must be a string' };
    data.name_ar = b.name_ar;
  }
  if ('name_en' in b) {
    if (typeof b.name_en !== 'string') return { error: 'name_en must be a string' };
    data.name_en = b.name_en;
  }
  if ('sentence_class' in b) {
    if (typeof b.sentence_class !== 'string') return { error: 'sentence_class must be a string' };
    data.sentence_class = b.sentence_class;
  }
  if ('description_md' in b) {
    if (typeof b.description_md !== 'string') return { error: 'description_md must be a string' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as ArLingSentenceTypePatch };
}

export function validateArLingClauseTypePatch(body: unknown): SchemaValidationResult<ArLingClauseTypePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('name_ar' in b) {
    if (typeof b.name_ar !== 'string') return { error: 'name_ar must be a string' };
    data.name_ar = b.name_ar;
  }
  if ('name_en' in b) {
    if (typeof b.name_en !== 'string') return { error: 'name_en must be a string' };
    data.name_en = b.name_en;
  }
  if ('clause_function' in b) {
    if (typeof b.clause_function !== 'string') return { error: 'clause_function must be a string' };
    data.clause_function = b.clause_function;
  }
  if ('description_md' in b) {
    if (typeof b.description_md !== 'string') return { error: 'description_md must be a string' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as ArLingClauseTypePatch };
}

export function validateArLingPhraseTypePatch(body: unknown): SchemaValidationResult<ArLingPhraseTypePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('name_ar' in b) {
    if (typeof b.name_ar !== 'string') return { error: 'name_ar must be a string' };
    data.name_ar = b.name_ar;
  }
  if ('name_en' in b) {
    if (typeof b.name_en !== 'string') return { error: 'name_en must be a string' };
    data.name_en = b.name_en;
  }
  if ('phrase_class' in b) {
    if (typeof b.phrase_class !== 'string') return { error: 'phrase_class must be a string' };
    data.phrase_class = b.phrase_class;
  }
  if ('description_md' in b) {
    if (typeof b.description_md !== 'string') return { error: 'description_md must be a string' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as ArLingPhraseTypePatch };
}

export function validateArLingSyntaxRelationTypePatch(body: unknown): SchemaValidationResult<ArLingSyntaxRelationTypePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('name_ar' in b) {
    if (typeof b.name_ar !== 'string') return { error: 'name_ar must be a string' };
    data.name_ar = b.name_ar;
  }
  if ('name_en' in b) {
    if (typeof b.name_en !== 'string') return { error: 'name_en must be a string' };
    data.name_en = b.name_en;
  }
  if ('description_md' in b) {
    if (typeof b.description_md !== 'string') return { error: 'description_md must be a string' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as ArLingSyntaxRelationTypePatch };
}

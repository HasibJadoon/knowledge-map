// ─── Balagha / Rhetoric schemas & types ───────────────────────────────────────
// Tables: ar_ling_balagha_concepts, ar_ling_balagha_branches,
//         ar_ling_rhetorical_relations, ar_ling_balagha_examples

// ── ar_ling_balagha_branches ──────────────────────────────────────────────────

export interface ArLingBalaghaBranch {
  id: string;              // AL:ULID
  branch_key: string;      // 'bayan'|'mani'|'badi'
  name_ar: string;
  name_en: string;
  description_md: string | null;
}

export interface ArLingBalaghaBranchCreate {
  branch_key: string;
  name_ar: string;
  name_en: string;
  description_md?: string;
}

export interface ArLingBalaghaBranchPatch {
  branch_key?: string;
  name_ar?: string;
  name_en?: string;
  description_md?: string;
}

export function validateArLingBalaghaBranchCreate(
  body: unknown,
): { data: ArLingBalaghaBranchCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.branch_key !== 'string' || !b.branch_key.trim())
    return { error: 'branch_key is required' };
  if (typeof b.name_ar !== 'string' || !b.name_ar.trim())
    return { error: 'name_ar is required' };
  if (typeof b.name_en !== 'string' || !b.name_en.trim())
    return { error: 'name_en is required' };
  return {
    data: {
      branch_key: b.branch_key.trim(),
      name_ar: b.name_ar.trim(),
      name_en: b.name_en.trim(),
      description_md: typeof b.description_md === 'string' ? b.description_md : undefined,
    },
  };
}

// ── ar_ling_balagha_concepts ──────────────────────────────────────────────────

export interface ArLingBalaghaConcept {
  id: string;                        // AL:ULID
  parent_id: string | null;          // self-ref for hierarchy under Bayan/Mani/Badi
  name_ar: string;
  name_en: string;
  branch: string;                    // 'bayan'|'mani'|'badi'
  concept_type: string;              // 'device'|'principle'|'category'|'phenomenon'|'sub_device'
  definition_ar: string | null;
  definition_en: string | null;
  effect_md: string | null;          // rhetorical/aesthetic effect
  discipline_unit_id: string | null; // FK → ar_ling_discipline_units.id
  note_md: string | null;
  created_at: string;
}

export interface ArLingBalaghaConceptCreate {
  name_ar: string;
  name_en: string;
  branch: string;
  concept_type?: string;
  parent_id?: string;
  definition_ar?: string;
  definition_en?: string;
  effect_md?: string;
  discipline_unit_id?: string;
  note_md?: string;
}

export interface ArLingBalaghaConceptPatch {
  name_ar?: string;
  name_en?: string;
  branch?: string;
  concept_type?: string;
  parent_id?: string;
  definition_ar?: string;
  definition_en?: string;
  effect_md?: string;
  discipline_unit_id?: string;
  note_md?: string;
}

export function validateArLingBalaghaConceptCreate(
  body: unknown,
): { data: ArLingBalaghaConceptCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.name_ar !== 'string' || !b.name_ar.trim())
    return { error: 'name_ar is required' };
  if (typeof b.name_en !== 'string' || !b.name_en.trim())
    return { error: 'name_en is required' };
  if (typeof b.branch !== 'string' || !b.branch.trim())
    return { error: 'branch is required' };
  return {
    data: {
      name_ar: b.name_ar.trim(),
      name_en: b.name_en.trim(),
      branch: b.branch.trim(),
      concept_type: typeof b.concept_type === 'string' ? b.concept_type : undefined,
      parent_id: typeof b.parent_id === 'string' ? b.parent_id : undefined,
      definition_ar: typeof b.definition_ar === 'string' ? b.definition_ar : undefined,
      definition_en: typeof b.definition_en === 'string' ? b.definition_en : undefined,
      effect_md: typeof b.effect_md === 'string' ? b.effect_md : undefined,
      discipline_unit_id:
        typeof b.discipline_unit_id === 'string' ? b.discipline_unit_id : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ── ar_ling_rhetorical_relations ──────────────────────────────────────────────

export interface ArLingRhetoricalRelation {
  id: string;                // AL:ULID
  from_concept_id: string;   // FK → ar_ling_balagha_concepts.id
  to_concept_id: string;     // FK → ar_ling_balagha_concepts.id
  relation_type: string;
  // 'subcategory_of'|'contrasts_with'|'combines_with'|'implies'|'related_to'
  note_md: string | null;
}

export interface ArLingRhetoricalRelationCreate {
  from_concept_id: string;
  to_concept_id: string;
  relation_type: string;
  note_md?: string;
}

export function validateArLingRhetoricalRelationCreate(
  body: unknown,
): { data: ArLingRhetoricalRelationCreate } | { error: string } {
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

// ── ar_ling_balagha_examples ──────────────────────────────────────────────────

export interface ArLingBalaghaExample {
  id: string;                  // AL:ULID
  balagha_id: string;          // FK → ar_ling_balagha_concepts.id
  example_ar: string;
  example_en: string | null;
  source_type: string;
  // 'quran'|'hadith'|'classical_poetry'|'classical_prose'|'modern'|'other'
  qr_ref: string | null;       // QR:2:255 shorthand or QR:<ULID>
  source_ref: string | null;   // AL:<ar_ling_sources.id>
  analysis_md: string | null;
  note_md: string | null;
}

export interface ArLingBalaghaExampleCreate {
  balagha_id: string;
  example_ar: string;
  source_type?: string;
  example_en?: string;
  qr_ref?: string;
  source_ref?: string;
  analysis_md?: string;
  note_md?: string;
}

export interface ArLingBalaghaExamplePatch {
  balagha_id?: string;
  example_ar?: string;
  example_en?: string;
  source_type?: string;
  qr_ref?: string;
  source_ref?: string;
  analysis_md?: string;
  note_md?: string;
}

export function validateArLingBalaghaExampleCreate(
  body: unknown,
): { data: ArLingBalaghaExampleCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.balagha_id !== 'string' || !b.balagha_id.trim())
    return { error: 'balagha_id is required' };
  if (typeof b.example_ar !== 'string' || !b.example_ar.trim())
    return { error: 'example_ar is required' };
  return {
    data: {
      balagha_id: b.balagha_id.trim(),
      example_ar: b.example_ar.trim(),
      source_type: typeof b.source_type === 'string' ? b.source_type : undefined,
      example_en: typeof b.example_en === 'string' ? b.example_en : undefined,
      qr_ref: typeof b.qr_ref === 'string' ? b.qr_ref : undefined,
      source_ref: typeof b.source_ref === 'string' ? b.source_ref : undefined,
      analysis_md: typeof b.analysis_md === 'string' ? b.analysis_md : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface BalaghaConcept {
  id: string;           // AL:ULID
  concept_key: string;  // e.g. 'tashbih', 'istiara', 'majaz'
  label_ar: string;
  label_en: string;
  branch: string;       // bayan | badi | maani
  description: string | null;
  parent_id: string | null;
}

export interface BalaghaExample {
  id: string;           // AL:ULID
  concept_id: string;   // AL:ULID
  text_ar: string;
  source_ref: string | null;  // QR:surah:ayah or CM:ULID
  explanation: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArLingBalaghaBranchPatch(body: unknown): SchemaValidationResult<ArLingBalaghaBranchPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('branch_key' in b) {
    if (typeof b.branch_key !== 'string') return { error: 'branch_key must be a string' };
    data.branch_key = b.branch_key;
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
    if (typeof b.description_md !== 'string') return { error: 'description_md must be a string' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as ArLingBalaghaBranchPatch };
}

export function validateArLingBalaghaConceptPatch(body: unknown): SchemaValidationResult<ArLingBalaghaConceptPatch> {
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
  if ('branch' in b) {
    if (typeof b.branch !== 'string') return { error: 'branch must be a string' };
    data.branch = b.branch;
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
  if ('effect_md' in b) {
    if (typeof b.effect_md !== 'string') return { error: 'effect_md must be a string' };
    data.effect_md = b.effect_md;
  }
  if ('discipline_unit_id' in b) {
    if (typeof b.discipline_unit_id !== 'string') return { error: 'discipline_unit_id must be a string' };
    data.discipline_unit_id = b.discipline_unit_id;
  }
  if ('note_md' in b) {
    if (typeof b.note_md !== 'string') return { error: 'note_md must be a string' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingBalaghaConceptPatch };
}

export function validateArLingBalaghaExamplePatch(body: unknown): SchemaValidationResult<ArLingBalaghaExamplePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('balagha_id' in b) {
    if (typeof b.balagha_id !== 'string') return { error: 'balagha_id must be a string' };
    data.balagha_id = b.balagha_id;
  }
  if ('example_ar' in b) {
    if (typeof b.example_ar !== 'string') return { error: 'example_ar must be a string' };
    data.example_ar = b.example_ar;
  }
  if ('example_en' in b) {
    if (typeof b.example_en !== 'string') return { error: 'example_en must be a string' };
    data.example_en = b.example_en;
  }
  if ('source_type' in b) {
    if (typeof b.source_type !== 'string') return { error: 'source_type must be a string' };
    data.source_type = b.source_type;
  }
  if ('qr_ref' in b) {
    if (typeof b.qr_ref !== 'string') return { error: 'qr_ref must be a string' };
    data.qr_ref = b.qr_ref;
  }
  if ('source_ref' in b) {
    if (typeof b.source_ref !== 'string') return { error: 'source_ref must be a string' };
    data.source_ref = b.source_ref;
  }
  if ('analysis_md' in b) {
    if (typeof b.analysis_md !== 'string') return { error: 'analysis_md must be a string' };
    data.analysis_md = b.analysis_md;
  }
  if ('note_md' in b) {
    if (typeof b.note_md !== 'string') return { error: 'note_md must be a string' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArLingBalaghaExamplePatch };
}

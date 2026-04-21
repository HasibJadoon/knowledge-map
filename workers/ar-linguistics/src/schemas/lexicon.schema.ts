// ─── Lexicon / Semantics schemas & types ──────────────────────────────────────
// Tables: ar_ling_lexicon_entries, ar_ling_senses, ar_ling_sense_relations,
//         ar_ling_semantic_fields, ar_ling_near_synonym_sets,
//         ar_ling_near_synonym_members, ar_ling_lexicon_evidence,
//         ar_ling_lexicon_morphology

// ── ar_ling_lexicon_entries ───────────────────────────────────────────────────

export interface ArLingLexiconEntry {
  id: string;                       // AL:ULID
  lemma_id: string;                 // FK → ar_ling_lemmas.id
  entry_text: string;
  definition_ar: string | null;
  definition_en: string;
  definition_source: string | null; // e.g. 'Lisan al-Arab', 'Mufradat'
  usage_register: string;
  // 'classical'|'quranic'|'modern'|'poetic'|'archaic'|'colloquial'
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArLingLexiconEntryCreate {
  lemma_id: string;
  entry_text: string;
  definition_en: string;
  definition_ar?: string;
  definition_source?: string;
  usage_register?: string;
  note_md?: string;
}

export interface ArLingLexiconEntryPatch {
  entry_text?: string;
  definition_ar?: string;
  definition_en?: string;
  definition_source?: string;
  usage_register?: string;
  note_md?: string;
}

export function validateArLingLexiconEntryCreate(
  body: unknown,
): { data: ArLingLexiconEntryCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lemma_id !== 'string' || !b.lemma_id.trim())
    return { error: 'lemma_id is required' };
  if (typeof b.entry_text !== 'string' || !b.entry_text.trim())
    return { error: 'entry_text is required' };
  if (typeof b.definition_en !== 'string' || !b.definition_en.trim())
    return { error: 'definition_en is required' };
  return {
    data: {
      lemma_id: b.lemma_id.trim(),
      entry_text: b.entry_text.trim(),
      definition_en: b.definition_en.trim(),
      definition_ar: typeof b.definition_ar === 'string' ? b.definition_ar : undefined,
      definition_source:
        typeof b.definition_source === 'string' ? b.definition_source : undefined,
      usage_register: typeof b.usage_register === 'string' ? b.usage_register : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ── ar_ling_senses ────────────────────────────────────────────────────────────

export interface ArLingSense {
  id: string;                      // AL:ULID
  lexicon_entry_id: string;        // FK → ar_ling_lexicon_entries.id
  sense_number: number;            // ordering within the entry
  gloss_ar: string | null;
  gloss_en: string;
  context_note: string | null;     // contextual restriction
  qr_ref: string | null;           // QR:<ULID> if attested in Quran
  note_md: string | null;
}

export interface ArLingSenseCreate {
  lexicon_entry_id: string;
  sense_number: number;
  gloss_en: string;
  gloss_ar?: string;
  context_note?: string;
  qr_ref?: string;
  note_md?: string;
}

export interface ArLingSensePatch {
  sense_number?: number;
  gloss_ar?: string;
  gloss_en?: string;
  context_note?: string;
  qr_ref?: string;
  note_md?: string;
}

export function validateArLingSenseCreate(
  body: unknown,
): { data: ArLingSenseCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lexicon_entry_id !== 'string' || !b.lexicon_entry_id.trim())
    return { error: 'lexicon_entry_id is required' };
  if (typeof b.sense_number !== 'number')
    return { error: 'sense_number is required and must be a number' };
  if (typeof b.gloss_en !== 'string' || !b.gloss_en.trim())
    return { error: 'gloss_en is required' };
  return {
    data: {
      lexicon_entry_id: b.lexicon_entry_id.trim(),
      sense_number: b.sense_number,
      gloss_en: b.gloss_en.trim(),
      gloss_ar: typeof b.gloss_ar === 'string' ? b.gloss_ar : undefined,
      context_note: typeof b.context_note === 'string' ? b.context_note : undefined,
      qr_ref: typeof b.qr_ref === 'string' ? b.qr_ref : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ── ar_ling_sense_relations ───────────────────────────────────────────────────

export interface ArLingSenseRelation {
  id: string;              // AL:ULID
  from_sense_id: string;   // FK → ar_ling_senses.id
  to_sense_id: string;     // FK → ar_ling_senses.id
  relation_type: string;   // 'synonym'|'near_synonym'|'antonym'|'hyponym'|'hypernym'|'related'
  nuance_note: string | null;
}

export interface ArLingSenseRelationCreate {
  from_sense_id: string;
  to_sense_id: string;
  relation_type: string;
  nuance_note?: string;
}

export function validateArLingSenseRelationCreate(
  body: unknown,
): { data: ArLingSenseRelationCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.from_sense_id !== 'string' || !b.from_sense_id.trim())
    return { error: 'from_sense_id is required' };
  if (typeof b.to_sense_id !== 'string' || !b.to_sense_id.trim())
    return { error: 'to_sense_id is required' };
  if (typeof b.relation_type !== 'string' || !b.relation_type.trim())
    return { error: 'relation_type is required' };
  return {
    data: {
      from_sense_id: b.from_sense_id.trim(),
      to_sense_id: b.to_sense_id.trim(),
      relation_type: b.relation_type.trim(),
      nuance_note: typeof b.nuance_note === 'string' ? b.nuance_note : undefined,
    },
  };
}

// ── ar_ling_semantic_fields ───────────────────────────────────────────────────

export interface ArLingSemanticField {
  id: string;                    // AL:ULID
  field_name_ar: string;
  field_name_en: string;         // UNIQUE
  parent_field_id: string | null; // self-ref
  description_md: string | null;
}

export interface ArLingSemanticFieldCreate {
  field_name_ar: string;
  field_name_en: string;
  parent_field_id?: string;
  description_md?: string;
}

export interface ArLingSemanticFieldPatch {
  field_name_ar?: string;
  field_name_en?: string;
  parent_field_id?: string;
  description_md?: string;
}

export function validateArLingSemanticFieldCreate(
  body: unknown,
): { data: ArLingSemanticFieldCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.field_name_ar !== 'string' || !b.field_name_ar.trim())
    return { error: 'field_name_ar is required' };
  if (typeof b.field_name_en !== 'string' || !b.field_name_en.trim())
    return { error: 'field_name_en is required' };
  return {
    data: {
      field_name_ar: b.field_name_ar.trim(),
      field_name_en: b.field_name_en.trim(),
      parent_field_id:
        typeof b.parent_field_id === 'string' ? b.parent_field_id : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : undefined,
    },
  };
}

// ── ar_ling_near_synonym_sets ─────────────────────────────────────────────────

export interface ArLingNearSynonymSet {
  id: string;              // AL:ULID
  set_name: string;
  description_md: string;
  created_at: string;
}

export interface ArLingNearSynonymSetCreate {
  set_name: string;
  description_md: string;
}

export interface ArLingNearSynonymSetPatch {
  set_name?: string;
  description_md?: string;
}

export function validateArLingNearSynonymSetCreate(
  body: unknown,
): { data: ArLingNearSynonymSetCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.set_name !== 'string' || !b.set_name.trim())
    return { error: 'set_name is required' };
  if (typeof b.description_md !== 'string' || !b.description_md.trim())
    return { error: 'description_md is required' };
  return {
    data: {
      set_name: b.set_name.trim(),
      description_md: b.description_md,
    },
  };
}

// ── ar_ling_near_synonym_members ──────────────────────────────────────────────

export interface ArLingNearSynonymMember {
  id: string;              // AL:ULID
  set_id: string;          // FK → ar_ling_near_synonym_sets.id
  lemma_id: string;        // FK → ar_ling_lemmas.id
  nuance_note: string;     // what distinguishes this word from siblings
}

export interface ArLingNearSynonymMemberCreate {
  set_id: string;
  lemma_id: string;
  nuance_note: string;
}

export function validateArLingNearSynonymMemberCreate(
  body: unknown,
): { data: ArLingNearSynonymMemberCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.set_id !== 'string' || !b.set_id.trim())
    return { error: 'set_id is required' };
  if (typeof b.lemma_id !== 'string' || !b.lemma_id.trim())
    return { error: 'lemma_id is required' };
  if (typeof b.nuance_note !== 'string' || !b.nuance_note.trim())
    return { error: 'nuance_note is required' };
  return {
    data: {
      set_id: b.set_id.trim(),
      lemma_id: b.lemma_id.trim(),
      nuance_note: b.nuance_note.trim(),
    },
  };
}

// ── ar_ling_lexicon_evidence ──────────────────────────────────────────────────

export interface ArLingLexiconEvidence {
  id: string;                      // AL:ULID
  lexicon_entry_id: string;        // FK → ar_ling_lexicon_entries.id
  sense_id: string | null;         // FK → ar_ling_senses.id (optional)
  evidence_type: string;
  // 'quran'|'hadith'|'classical_poetry'|'classical_prose'|'lexicon_citation'|'other'
  text_ar: string;
  text_en: string | null;
  qr_ref: string | null;           // QR:surah:ayah or QR:<ULID>
  source_ref: string | null;       // AL:<ar_ling_sources.id>
  note_md: string | null;
  created_at: string;
}

export interface ArLingLexiconEvidenceCreate {
  lexicon_entry_id: string;
  text_ar: string;
  evidence_type?: string;
  sense_id?: string;
  text_en?: string;
  qr_ref?: string;
  source_ref?: string;
  note_md?: string;
}

export function validateArLingLexiconEvidenceCreate(
  body: unknown,
): { data: ArLingLexiconEvidenceCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lexicon_entry_id !== 'string' || !b.lexicon_entry_id.trim())
    return { error: 'lexicon_entry_id is required' };
  if (typeof b.text_ar !== 'string' || !b.text_ar.trim())
    return { error: 'text_ar is required' };
  return {
    data: {
      lexicon_entry_id: b.lexicon_entry_id.trim(),
      text_ar: b.text_ar.trim(),
      evidence_type: typeof b.evidence_type === 'string' ? b.evidence_type : undefined,
      sense_id: typeof b.sense_id === 'string' ? b.sense_id : undefined,
      text_en: typeof b.text_en === 'string' ? b.text_en : undefined,
      qr_ref: typeof b.qr_ref === 'string' ? b.qr_ref : undefined,
      source_ref: typeof b.source_ref === 'string' ? b.source_ref : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}

// ── ar_ling_lexicon_morphology ────────────────────────────────────────────────

export interface ArLingLexiconMorphology {
  id: string;                  // AL:ULID
  lexicon_entry_id: string;    // FK → ar_ling_lexicon_entries.id
  morphology_id: string;       // FK → ar_ling_morphology.id
  inflected_form: string | null;
}

export interface ArLingLexiconMorphologyCreate {
  lexicon_entry_id: string;
  morphology_id: string;
  inflected_form?: string;
}

export function validateArLingLexiconMorphologyCreate(
  body: unknown,
): { data: ArLingLexiconMorphologyCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.lexicon_entry_id !== 'string' || !b.lexicon_entry_id.trim())
    return { error: 'lexicon_entry_id is required' };
  if (typeof b.morphology_id !== 'string' || !b.morphology_id.trim())
    return { error: 'morphology_id is required' };
  return {
    data: {
      lexicon_entry_id: b.lexicon_entry_id.trim(),
      morphology_id: b.morphology_id.trim(),
      inflected_form: typeof b.inflected_form === 'string' ? b.inflected_form : undefined,
    },
  };
}

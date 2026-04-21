// ─── Sentence Structure schemas & types ───────────────────────────────────────────────

export interface OccSegment {
  id: string;
  surah: number;
  ayah: number;
  word_occurrence_id: string;
  segment_index: number;
  segment_text: string;
  segment_type: string;
  lx_particle_ref: string | null;
  morphology_tag: string | null;
  created_at: string;
}

export interface OccSegmentCreate {
  surah: number;
  ayah: number;
  word_occurrence_id: string;
  segment_index: number;
  segment_text: string;
  segment_type: string;
  lx_particle_ref?: string | null;
  morphology_tag?: string | null;
}

export interface OccSentence {
  id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  word_start_index: number | null;
  word_end_index: number | null;
  sentence_kind: string;
  lx_sentence_kind_ref: string | null;
  discourse_role: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface OccSentenceCreate {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  word_start_index?: number | null;
  word_end_index?: number | null;
  sentence_kind?: string;
  lx_sentence_kind_ref?: string | null;
  discourse_role?: string | null;
  note_md?: string | null;
}

export interface OccClause {
  id: string;
  sentence_id: string;
  parent_clause_id: string | null;
  clause_order: number;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  word_start_index: number | null;
  word_end_index: number | null;
  clause_type: string;
  lx_clause_type_ref: string | null;
  clause_function: string | null;
  lx_clause_func_ref: string | null;
  governing_particle: string | null;
  is_elliptical: number;
  elided_element: string | null;
  note_md: string | null;
  created_at: string;
}

export interface OccClauseCreate {
  sentence_id: string;
  parent_clause_id?: string | null;
  clause_order?: number;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  word_start_index?: number | null;
  word_end_index?: number | null;
  clause_type?: string;
  lx_clause_type_ref?: string | null;
  clause_function?: string | null;
  lx_clause_func_ref?: string | null;
  governing_particle?: string | null;
  is_elliptical?: number;
  elided_element?: string | null;
  note_md?: string | null;
}

export interface OccPhrase {
  id: string;
  clause_id: string;
  phrase_order: number;
  surah: number;
  ayah: number;
  word_start_index: number;
  word_end_index: number;
  phrase_type: string;
  lx_phrase_type_ref: string | null;
  phrase_function: string | null;
  lx_phrase_func_ref: string | null;
  head_word_id: string | null;
  note_md: string | null;
  created_at: string;
}

export interface OccPhraseCreate {
  clause_id: string;
  phrase_order?: number;
  surah: number;
  ayah: number;
  word_start_index: number;
  word_end_index: number;
  phrase_type: string;
  lx_phrase_type_ref?: string | null;
  phrase_function?: string | null;
  lx_phrase_func_ref?: string | null;
  head_word_id?: string | null;
  note_md?: string | null;
}

export interface ScopeMemberMap {
  id: string;
  word_occurrence_id: string;
  scope_type: string;
  scope_id: string;
  member_role: string | null;
  created_at: string;
}

export interface ScopeMemberMapCreate {
  word_occurrence_id: string;
  scope_type: string;
  scope_id: string;
  member_role?: string | null;
}

export interface ScopeRelation {
  id: string;
  from_scope_type: string;
  from_scope_id: string;
  to_scope_type: string;
  to_scope_id: string;
  relation_type: string;
  lx_relation_ref: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ScopeRelationCreate {
  from_scope_type: string;
  from_scope_id: string;
  to_scope_type: string;
  to_scope_id: string;
  relation_type: string;
  lx_relation_ref?: string | null;
  note_md?: string | null;
}

export interface SyntaxRelation {
  id: string;
  surah: number;
  ayah: number;
  head_word_id: string;
  dep_word_id: string;
  relation_label: string;
  lx_rel_type_ref: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SyntaxRelationCreate {
  surah: number;
  ayah: number;
  head_word_id: string;
  dep_word_id: string;
  relation_label: string;
  lx_rel_type_ref?: string | null;
  note_md?: string | null;
}

export interface ScopeMorphLink {
  id: string;
  scope_type: string;
  scope_id: string;
  lx_morph_ref: string;
  irab_position: string | null;
  irab_sign: string | null;
  syntactic_function: string | null;
  is_disputed: number;
  dispute_note: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ScopeMorphLinkCreate {
  scope_type: string;
  scope_id: string;
  lx_morph_ref: string;
  irab_position?: string | null;
  irab_sign?: string | null;
  syntactic_function?: string | null;
  is_disputed?: number;
  dispute_note?: string | null;
  note_md?: string | null;
}

export interface ScopeGrammarLink {
  id: string;
  scope_type: string;
  scope_id: string;
  lx_grammar_ref: string;
  application_note: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ScopeGrammarLinkCreate {
  scope_type: string;
  scope_id: string;
  lx_grammar_ref: string;
  application_note?: string | null;
  note_md?: string | null;
}

export interface ScopeBalaghaLink {
  id: string;
  scope_type: string;
  scope_id: string;
  lx_balagha_ref: string;
  balagha_category: string | null;
  rhetorical_effect: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ScopeBalaghaLinkCreate {
  scope_type: string;
  scope_id: string;
  lx_balagha_ref: string;
  balagha_category?: string | null;
  rhetorical_effect?: string | null;
  note_md?: string | null;
}

export interface ScopeNuance {
  id: string;
  scope_type: string;
  scope_id: string;
  nuance_type: string;
  lx_nuance_type_ref: string | null;
  nuance_text: string;
  nuance_text_ar: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScopeNuanceCreate {
  scope_type: string;
  scope_id: string;
  nuance_type?: string;
  lx_nuance_type_ref?: string | null;
  nuance_text: string;
  nuance_text_ar?: string | null;
  note_md?: string | null;
}

export interface EllipsisEvent {
  id: string;
  sentence_id: string;
  scope_type: string;
  scope_id: string;
  ellipsis_type: string;
  lx_ellipsis_ref: string | null;
  elided_element: string;
  rhetorical_effect: string | null;
  note_md: string | null;
  created_at: string;
}

export interface EllipsisEventCreate {
  sentence_id: string;
  scope_type?: string;
  scope_id: string;
  ellipsis_type: string;
  lx_ellipsis_ref?: string | null;
  elided_element: string;
  rhetorical_effect?: string | null;
  note_md?: string | null;
}

export interface ScopeReading {
  id: string;
  scope_type: string;
  scope_id: string;
  scholar_ref: string | null;
  paradigm_ref: string | null;
  reading_type: string;
  lx_reading_type_ref: string | null;
  reading_text: string;
  reading_text_ar: string | null;
  is_minority: number;
  is_contested: number;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScopeReadingCreate {
  scope_type: string;
  scope_id: string;
  scholar_ref?: string | null;
  paradigm_ref?: string | null;
  reading_type?: string;
  lx_reading_type_ref?: string | null;
  reading_text: string;
  reading_text_ar?: string | null;
  is_minority?: number;
  is_contested?: number;
  note_md?: string | null;
}

export interface ScopeReadingEvidenceLink {
  reading_id: string;
  evidence_id: string;
  support_type: string;
}

export interface Tree {
  id: string;
  sentence_id: string;
  tree_type: string;
  generated_at: string;
  note_md: string | null;
}

export interface TreeCreate {
  sentence_id: string;
  tree_type?: string;
  note_md?: string | null;
}

export interface TreeNode {
  id: string;
  tree_id: string;
  parent_node_id: string | null;
  node_label: string;
  scope_type: string | null;
  scope_id: string | null;
  depth: number;
  node_order: number;
  created_at: string;
}

export interface TreeNodeCreate {
  tree_id: string;
  parent_node_id?: string | null;
  node_label: string;
  scope_type?: string | null;
  scope_id?: string | null;
  depth?: number;
  node_order?: number;
}

export interface TreeEdge {
  id: string;
  tree_id: string;
  parent_node_id: string;
  child_node_id: string;
  edge_label: string | null;
  created_at: string;
}

export interface TreeEdgeCreate {
  tree_id: string;
  parent_node_id: string;
  child_node_id: string;
  edge_label?: string | null;
}

export interface TreeLayoutCache {
  tree_id: string;
  layout_json: string;
  renderer: string;
  generated_at: string;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateOccSegmentCreate(body: unknown): SchemaValidationResult<OccSegmentCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.ayah !== 'number' || !Number.isFinite(b.ayah)) return { error: 'ayah is required and must be a number' };
  data.ayah = b.ayah;
  if (typeof b.word_occurrence_id !== 'string' || !b.word_occurrence_id.trim()) return { error: 'word_occurrence_id is required and must be a non-empty string' };
  data.word_occurrence_id = b.word_occurrence_id.trim();
  if (typeof b.segment_index !== 'number' || !Number.isFinite(b.segment_index)) return { error: 'segment_index is required and must be a number' };
  data.segment_index = b.segment_index;
  if (typeof b.segment_text !== 'string' || !b.segment_text.trim()) return { error: 'segment_text is required and must be a non-empty string' };
  data.segment_text = b.segment_text.trim();
  if (typeof b.segment_type !== 'string' || !b.segment_type.trim()) return { error: 'segment_type is required and must be a non-empty string' };
  data.segment_type = b.segment_type.trim();
  if ('lx_particle_ref' in b) {
    if (b.lx_particle_ref !== null && typeof b.lx_particle_ref !== 'string') return { error: 'lx_particle_ref must be a string or null' };
    data.lx_particle_ref = b.lx_particle_ref;
  }
  if ('morphology_tag' in b) {
    if (b.morphology_tag !== null && typeof b.morphology_tag !== 'string') return { error: 'morphology_tag must be a string or null' };
    data.morphology_tag = b.morphology_tag;
  }

  return { data: data as unknown as OccSegmentCreate };
}

export function validateOccSentenceCreate(body: unknown): SchemaValidationResult<OccSentenceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.ayah_from !== 'number' || !Number.isFinite(b.ayah_from)) return { error: 'ayah_from is required and must be a number' };
  data.ayah_from = b.ayah_from;
  if (typeof b.ayah_to !== 'number' || !Number.isFinite(b.ayah_to)) return { error: 'ayah_to is required and must be a number' };
  data.ayah_to = b.ayah_to;
  if ('word_start_index' in b) {
    if (b.word_start_index !== null && (typeof b.word_start_index !== 'number' || !Number.isFinite(b.word_start_index))) return { error: 'word_start_index must be a number or null' };
    data.word_start_index = b.word_start_index;
  }
  if ('word_end_index' in b) {
    if (b.word_end_index !== null && (typeof b.word_end_index !== 'number' || !Number.isFinite(b.word_end_index))) return { error: 'word_end_index must be a number or null' };
    data.word_end_index = b.word_end_index;
  }
  if ('sentence_kind' in b) {
    if (typeof b.sentence_kind !== 'string') return { error: 'sentence_kind must be a string' };
    data.sentence_kind = b.sentence_kind;
  }
  if ('lx_sentence_kind_ref' in b) {
    if (b.lx_sentence_kind_ref !== null && typeof b.lx_sentence_kind_ref !== 'string') return { error: 'lx_sentence_kind_ref must be a string or null' };
    data.lx_sentence_kind_ref = b.lx_sentence_kind_ref;
  }
  if ('discourse_role' in b) {
    if (b.discourse_role !== null && typeof b.discourse_role !== 'string') return { error: 'discourse_role must be a string or null' };
    data.discourse_role = b.discourse_role;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as OccSentenceCreate };
}

export function validateOccClauseCreate(body: unknown): SchemaValidationResult<OccClauseCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.sentence_id !== 'string' || !b.sentence_id.trim()) return { error: 'sentence_id is required and must be a non-empty string' };
  data.sentence_id = b.sentence_id.trim();
  if ('parent_clause_id' in b) {
    if (b.parent_clause_id !== null && typeof b.parent_clause_id !== 'string') return { error: 'parent_clause_id must be a string or null' };
    data.parent_clause_id = b.parent_clause_id;
  }
  if ('clause_order' in b) {
    if (typeof b.clause_order !== 'number' || !Number.isFinite(b.clause_order)) return { error: 'clause_order must be a number' };
    data.clause_order = b.clause_order;
  }
  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.ayah_from !== 'number' || !Number.isFinite(b.ayah_from)) return { error: 'ayah_from is required and must be a number' };
  data.ayah_from = b.ayah_from;
  if (typeof b.ayah_to !== 'number' || !Number.isFinite(b.ayah_to)) return { error: 'ayah_to is required and must be a number' };
  data.ayah_to = b.ayah_to;
  if ('word_start_index' in b) {
    if (b.word_start_index !== null && (typeof b.word_start_index !== 'number' || !Number.isFinite(b.word_start_index))) return { error: 'word_start_index must be a number or null' };
    data.word_start_index = b.word_start_index;
  }
  if ('word_end_index' in b) {
    if (b.word_end_index !== null && (typeof b.word_end_index !== 'number' || !Number.isFinite(b.word_end_index))) return { error: 'word_end_index must be a number or null' };
    data.word_end_index = b.word_end_index;
  }
  if ('clause_type' in b) {
    if (typeof b.clause_type !== 'string') return { error: 'clause_type must be a string' };
    data.clause_type = b.clause_type;
  }
  if ('lx_clause_type_ref' in b) {
    if (b.lx_clause_type_ref !== null && typeof b.lx_clause_type_ref !== 'string') return { error: 'lx_clause_type_ref must be a string or null' };
    data.lx_clause_type_ref = b.lx_clause_type_ref;
  }
  if ('clause_function' in b) {
    if (b.clause_function !== null && typeof b.clause_function !== 'string') return { error: 'clause_function must be a string or null' };
    data.clause_function = b.clause_function;
  }
  if ('lx_clause_func_ref' in b) {
    if (b.lx_clause_func_ref !== null && typeof b.lx_clause_func_ref !== 'string') return { error: 'lx_clause_func_ref must be a string or null' };
    data.lx_clause_func_ref = b.lx_clause_func_ref;
  }
  if ('governing_particle' in b) {
    if (b.governing_particle !== null && typeof b.governing_particle !== 'string') return { error: 'governing_particle must be a string or null' };
    data.governing_particle = b.governing_particle;
  }
  if ('is_elliptical' in b) {
    if (typeof b.is_elliptical !== 'number' || !Number.isFinite(b.is_elliptical)) return { error: 'is_elliptical must be a number' };
    data.is_elliptical = b.is_elliptical;
  }
  if ('elided_element' in b) {
    if (b.elided_element !== null && typeof b.elided_element !== 'string') return { error: 'elided_element must be a string or null' };
    data.elided_element = b.elided_element;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as OccClauseCreate };
}

export function validateOccPhraseCreate(body: unknown): SchemaValidationResult<OccPhraseCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.clause_id !== 'string' || !b.clause_id.trim()) return { error: 'clause_id is required and must be a non-empty string' };
  data.clause_id = b.clause_id.trim();
  if ('phrase_order' in b) {
    if (typeof b.phrase_order !== 'number' || !Number.isFinite(b.phrase_order)) return { error: 'phrase_order must be a number' };
    data.phrase_order = b.phrase_order;
  }
  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.ayah !== 'number' || !Number.isFinite(b.ayah)) return { error: 'ayah is required and must be a number' };
  data.ayah = b.ayah;
  if (typeof b.word_start_index !== 'number' || !Number.isFinite(b.word_start_index)) return { error: 'word_start_index is required and must be a number' };
  data.word_start_index = b.word_start_index;
  if (typeof b.word_end_index !== 'number' || !Number.isFinite(b.word_end_index)) return { error: 'word_end_index is required and must be a number' };
  data.word_end_index = b.word_end_index;
  if (typeof b.phrase_type !== 'string' || !b.phrase_type.trim()) return { error: 'phrase_type is required and must be a non-empty string' };
  data.phrase_type = b.phrase_type.trim();
  if ('lx_phrase_type_ref' in b) {
    if (b.lx_phrase_type_ref !== null && typeof b.lx_phrase_type_ref !== 'string') return { error: 'lx_phrase_type_ref must be a string or null' };
    data.lx_phrase_type_ref = b.lx_phrase_type_ref;
  }
  if ('phrase_function' in b) {
    if (b.phrase_function !== null && typeof b.phrase_function !== 'string') return { error: 'phrase_function must be a string or null' };
    data.phrase_function = b.phrase_function;
  }
  if ('lx_phrase_func_ref' in b) {
    if (b.lx_phrase_func_ref !== null && typeof b.lx_phrase_func_ref !== 'string') return { error: 'lx_phrase_func_ref must be a string or null' };
    data.lx_phrase_func_ref = b.lx_phrase_func_ref;
  }
  if ('head_word_id' in b) {
    if (b.head_word_id !== null && typeof b.head_word_id !== 'string') return { error: 'head_word_id must be a string or null' };
    data.head_word_id = b.head_word_id;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as OccPhraseCreate };
}

export function validateScopeMemberMapCreate(body: unknown): SchemaValidationResult<ScopeMemberMapCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.word_occurrence_id !== 'string' || !b.word_occurrence_id.trim()) return { error: 'word_occurrence_id is required and must be a non-empty string' };
  data.word_occurrence_id = b.word_occurrence_id.trim();
  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if (typeof b.scope_id !== 'string' || !b.scope_id.trim()) return { error: 'scope_id is required and must be a non-empty string' };
  data.scope_id = b.scope_id.trim();
  if ('member_role' in b) {
    if (b.member_role !== null && typeof b.member_role !== 'string') return { error: 'member_role must be a string or null' };
    data.member_role = b.member_role;
  }

  return { data: data as unknown as ScopeMemberMapCreate };
}

export function validateScopeRelationCreate(body: unknown): SchemaValidationResult<ScopeRelationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.from_scope_type !== 'string' || !b.from_scope_type.trim()) return { error: 'from_scope_type is required and must be a non-empty string' };
  data.from_scope_type = b.from_scope_type.trim();
  if (typeof b.from_scope_id !== 'string' || !b.from_scope_id.trim()) return { error: 'from_scope_id is required and must be a non-empty string' };
  data.from_scope_id = b.from_scope_id.trim();
  if (typeof b.to_scope_type !== 'string' || !b.to_scope_type.trim()) return { error: 'to_scope_type is required and must be a non-empty string' };
  data.to_scope_type = b.to_scope_type.trim();
  if (typeof b.to_scope_id !== 'string' || !b.to_scope_id.trim()) return { error: 'to_scope_id is required and must be a non-empty string' };
  data.to_scope_id = b.to_scope_id.trim();
  if (typeof b.relation_type !== 'string' || !b.relation_type.trim()) return { error: 'relation_type is required and must be a non-empty string' };
  data.relation_type = b.relation_type.trim();
  if ('lx_relation_ref' in b) {
    if (b.lx_relation_ref !== null && typeof b.lx_relation_ref !== 'string') return { error: 'lx_relation_ref must be a string or null' };
    data.lx_relation_ref = b.lx_relation_ref;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScopeRelationCreate };
}

export function validateSyntaxRelationCreate(body: unknown): SchemaValidationResult<SyntaxRelationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.surah !== 'number' || !Number.isFinite(b.surah)) return { error: 'surah is required and must be a number' };
  data.surah = b.surah;
  if (typeof b.ayah !== 'number' || !Number.isFinite(b.ayah)) return { error: 'ayah is required and must be a number' };
  data.ayah = b.ayah;
  if (typeof b.head_word_id !== 'string' || !b.head_word_id.trim()) return { error: 'head_word_id is required and must be a non-empty string' };
  data.head_word_id = b.head_word_id.trim();
  if (typeof b.dep_word_id !== 'string' || !b.dep_word_id.trim()) return { error: 'dep_word_id is required and must be a non-empty string' };
  data.dep_word_id = b.dep_word_id.trim();
  if (typeof b.relation_label !== 'string' || !b.relation_label.trim()) return { error: 'relation_label is required and must be a non-empty string' };
  data.relation_label = b.relation_label.trim();
  if ('lx_rel_type_ref' in b) {
    if (b.lx_rel_type_ref !== null && typeof b.lx_rel_type_ref !== 'string') return { error: 'lx_rel_type_ref must be a string or null' };
    data.lx_rel_type_ref = b.lx_rel_type_ref;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as SyntaxRelationCreate };
}

export function validateScopeMorphLinkCreate(body: unknown): SchemaValidationResult<ScopeMorphLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if (typeof b.scope_id !== 'string' || !b.scope_id.trim()) return { error: 'scope_id is required and must be a non-empty string' };
  data.scope_id = b.scope_id.trim();
  if (typeof b.lx_morph_ref !== 'string' || !b.lx_morph_ref.trim()) return { error: 'lx_morph_ref is required and must be a non-empty string' };
  data.lx_morph_ref = b.lx_morph_ref.trim();
  if ('irab_position' in b) {
    if (b.irab_position !== null && typeof b.irab_position !== 'string') return { error: 'irab_position must be a string or null' };
    data.irab_position = b.irab_position;
  }
  if ('irab_sign' in b) {
    if (b.irab_sign !== null && typeof b.irab_sign !== 'string') return { error: 'irab_sign must be a string or null' };
    data.irab_sign = b.irab_sign;
  }
  if ('syntactic_function' in b) {
    if (b.syntactic_function !== null && typeof b.syntactic_function !== 'string') return { error: 'syntactic_function must be a string or null' };
    data.syntactic_function = b.syntactic_function;
  }
  if ('is_disputed' in b) {
    if (typeof b.is_disputed !== 'number' || !Number.isFinite(b.is_disputed)) return { error: 'is_disputed must be a number' };
    data.is_disputed = b.is_disputed;
  }
  if ('dispute_note' in b) {
    if (b.dispute_note !== null && typeof b.dispute_note !== 'string') return { error: 'dispute_note must be a string or null' };
    data.dispute_note = b.dispute_note;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScopeMorphLinkCreate };
}

export function validateScopeGrammarLinkCreate(body: unknown): SchemaValidationResult<ScopeGrammarLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if (typeof b.scope_id !== 'string' || !b.scope_id.trim()) return { error: 'scope_id is required and must be a non-empty string' };
  data.scope_id = b.scope_id.trim();
  if (typeof b.lx_grammar_ref !== 'string' || !b.lx_grammar_ref.trim()) return { error: 'lx_grammar_ref is required and must be a non-empty string' };
  data.lx_grammar_ref = b.lx_grammar_ref.trim();
  if ('application_note' in b) {
    if (b.application_note !== null && typeof b.application_note !== 'string') return { error: 'application_note must be a string or null' };
    data.application_note = b.application_note;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScopeGrammarLinkCreate };
}

export function validateScopeBalaghaLinkCreate(body: unknown): SchemaValidationResult<ScopeBalaghaLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if (typeof b.scope_id !== 'string' || !b.scope_id.trim()) return { error: 'scope_id is required and must be a non-empty string' };
  data.scope_id = b.scope_id.trim();
  if (typeof b.lx_balagha_ref !== 'string' || !b.lx_balagha_ref.trim()) return { error: 'lx_balagha_ref is required and must be a non-empty string' };
  data.lx_balagha_ref = b.lx_balagha_ref.trim();
  if ('balagha_category' in b) {
    if (b.balagha_category !== null && typeof b.balagha_category !== 'string') return { error: 'balagha_category must be a string or null' };
    data.balagha_category = b.balagha_category;
  }
  if ('rhetorical_effect' in b) {
    if (b.rhetorical_effect !== null && typeof b.rhetorical_effect !== 'string') return { error: 'rhetorical_effect must be a string or null' };
    data.rhetorical_effect = b.rhetorical_effect;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScopeBalaghaLinkCreate };
}

export function validateScopeNuanceCreate(body: unknown): SchemaValidationResult<ScopeNuanceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if (typeof b.scope_id !== 'string' || !b.scope_id.trim()) return { error: 'scope_id is required and must be a non-empty string' };
  data.scope_id = b.scope_id.trim();
  if ('nuance_type' in b) {
    if (typeof b.nuance_type !== 'string') return { error: 'nuance_type must be a string' };
    data.nuance_type = b.nuance_type;
  }
  if ('lx_nuance_type_ref' in b) {
    if (b.lx_nuance_type_ref !== null && typeof b.lx_nuance_type_ref !== 'string') return { error: 'lx_nuance_type_ref must be a string or null' };
    data.lx_nuance_type_ref = b.lx_nuance_type_ref;
  }
  if (typeof b.nuance_text !== 'string' || !b.nuance_text.trim()) return { error: 'nuance_text is required and must be a non-empty string' };
  data.nuance_text = b.nuance_text.trim();
  if ('nuance_text_ar' in b) {
    if (b.nuance_text_ar !== null && typeof b.nuance_text_ar !== 'string') return { error: 'nuance_text_ar must be a string or null' };
    data.nuance_text_ar = b.nuance_text_ar;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScopeNuanceCreate };
}

export function validateEllipsisEventCreate(body: unknown): SchemaValidationResult<EllipsisEventCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.sentence_id !== 'string' || !b.sentence_id.trim()) return { error: 'sentence_id is required and must be a non-empty string' };
  data.sentence_id = b.sentence_id.trim();
  if ('scope_type' in b) {
    if (typeof b.scope_type !== 'string') return { error: 'scope_type must be a string' };
    data.scope_type = b.scope_type;
  }
  if (typeof b.scope_id !== 'string' || !b.scope_id.trim()) return { error: 'scope_id is required and must be a non-empty string' };
  data.scope_id = b.scope_id.trim();
  if (typeof b.ellipsis_type !== 'string' || !b.ellipsis_type.trim()) return { error: 'ellipsis_type is required and must be a non-empty string' };
  data.ellipsis_type = b.ellipsis_type.trim();
  if ('lx_ellipsis_ref' in b) {
    if (b.lx_ellipsis_ref !== null && typeof b.lx_ellipsis_ref !== 'string') return { error: 'lx_ellipsis_ref must be a string or null' };
    data.lx_ellipsis_ref = b.lx_ellipsis_ref;
  }
  if (typeof b.elided_element !== 'string' || !b.elided_element.trim()) return { error: 'elided_element is required and must be a non-empty string' };
  data.elided_element = b.elided_element.trim();
  if ('rhetorical_effect' in b) {
    if (b.rhetorical_effect !== null && typeof b.rhetorical_effect !== 'string') return { error: 'rhetorical_effect must be a string or null' };
    data.rhetorical_effect = b.rhetorical_effect;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as EllipsisEventCreate };
}

export function validateScopeReadingCreate(body: unknown): SchemaValidationResult<ScopeReadingCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.scope_type !== 'string' || !b.scope_type.trim()) return { error: 'scope_type is required and must be a non-empty string' };
  data.scope_type = b.scope_type.trim();
  if (typeof b.scope_id !== 'string' || !b.scope_id.trim()) return { error: 'scope_id is required and must be a non-empty string' };
  data.scope_id = b.scope_id.trim();
  if ('scholar_ref' in b) {
    if (b.scholar_ref !== null && typeof b.scholar_ref !== 'string') return { error: 'scholar_ref must be a string or null' };
    data.scholar_ref = b.scholar_ref;
  }
  if ('paradigm_ref' in b) {
    if (b.paradigm_ref !== null && typeof b.paradigm_ref !== 'string') return { error: 'paradigm_ref must be a string or null' };
    data.paradigm_ref = b.paradigm_ref;
  }
  if ('reading_type' in b) {
    if (typeof b.reading_type !== 'string') return { error: 'reading_type must be a string' };
    data.reading_type = b.reading_type;
  }
  if ('lx_reading_type_ref' in b) {
    if (b.lx_reading_type_ref !== null && typeof b.lx_reading_type_ref !== 'string') return { error: 'lx_reading_type_ref must be a string or null' };
    data.lx_reading_type_ref = b.lx_reading_type_ref;
  }
  if (typeof b.reading_text !== 'string' || !b.reading_text.trim()) return { error: 'reading_text is required and must be a non-empty string' };
  data.reading_text = b.reading_text.trim();
  if ('reading_text_ar' in b) {
    if (b.reading_text_ar !== null && typeof b.reading_text_ar !== 'string') return { error: 'reading_text_ar must be a string or null' };
    data.reading_text_ar = b.reading_text_ar;
  }
  if ('is_minority' in b) {
    if (typeof b.is_minority !== 'number' || !Number.isFinite(b.is_minority)) return { error: 'is_minority must be a number' };
    data.is_minority = b.is_minority;
  }
  if ('is_contested' in b) {
    if (typeof b.is_contested !== 'number' || !Number.isFinite(b.is_contested)) return { error: 'is_contested must be a number' };
    data.is_contested = b.is_contested;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ScopeReadingCreate };
}

export function validateTreeCreate(body: unknown): SchemaValidationResult<TreeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.sentence_id !== 'string' || !b.sentence_id.trim()) return { error: 'sentence_id is required and must be a non-empty string' };
  data.sentence_id = b.sentence_id.trim();
  if ('tree_type' in b) {
    if (typeof b.tree_type !== 'string') return { error: 'tree_type must be a string' };
    data.tree_type = b.tree_type;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as TreeCreate };
}

export function validateTreeNodeCreate(body: unknown): SchemaValidationResult<TreeNodeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.tree_id !== 'string' || !b.tree_id.trim()) return { error: 'tree_id is required and must be a non-empty string' };
  data.tree_id = b.tree_id.trim();
  if ('parent_node_id' in b) {
    if (b.parent_node_id !== null && typeof b.parent_node_id !== 'string') return { error: 'parent_node_id must be a string or null' };
    data.parent_node_id = b.parent_node_id;
  }
  if (typeof b.node_label !== 'string' || !b.node_label.trim()) return { error: 'node_label is required and must be a non-empty string' };
  data.node_label = b.node_label.trim();
  if ('scope_type' in b) {
    if (b.scope_type !== null && typeof b.scope_type !== 'string') return { error: 'scope_type must be a string or null' };
    data.scope_type = b.scope_type;
  }
  if ('scope_id' in b) {
    if (b.scope_id !== null && typeof b.scope_id !== 'string') return { error: 'scope_id must be a string or null' };
    data.scope_id = b.scope_id;
  }
  if ('depth' in b) {
    if (typeof b.depth !== 'number' || !Number.isFinite(b.depth)) return { error: 'depth must be a number' };
    data.depth = b.depth;
  }
  if ('node_order' in b) {
    if (typeof b.node_order !== 'number' || !Number.isFinite(b.node_order)) return { error: 'node_order must be a number' };
    data.node_order = b.node_order;
  }

  return { data: data as unknown as TreeNodeCreate };
}

export function validateTreeEdgeCreate(body: unknown): SchemaValidationResult<TreeEdgeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.tree_id !== 'string' || !b.tree_id.trim()) return { error: 'tree_id is required and must be a non-empty string' };
  data.tree_id = b.tree_id.trim();
  if (typeof b.parent_node_id !== 'string' || !b.parent_node_id.trim()) return { error: 'parent_node_id is required and must be a non-empty string' };
  data.parent_node_id = b.parent_node_id.trim();
  if (typeof b.child_node_id !== 'string' || !b.child_node_id.trim()) return { error: 'child_node_id is required and must be a non-empty string' };
  data.child_node_id = b.child_node_id.trim();
  if ('edge_label' in b) {
    if (b.edge_label !== null && typeof b.edge_label !== 'string') return { error: 'edge_label must be a string or null' };
    data.edge_label = b.edge_label;
  }

  return { data: data as unknown as TreeEdgeCreate };
}

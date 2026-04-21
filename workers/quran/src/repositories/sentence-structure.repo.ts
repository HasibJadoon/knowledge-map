// ─── SentenceStructureRepo — all qr_ss_* tables (Layer 6) ────────────────────
//
// Tables covered:
//   qr_ss_occ_segment, qr_ss_occ_sentence, qr_ss_occ_clause, qr_ss_occ_phrase
//   qr_ss_scope_member_map, qr_ss_scope_relations, qr_ss_syntax_relations
//   qr_ss_scope_morph_link, qr_ss_scope_grammar_link, qr_ss_scope_balagha_link
//   qr_ss_scope_nuance, qr_ss_ellipsis_event, qr_ss_scope_reading,
//   qr_ss_scope_reading_evidence_link, qr_ss_tree, qr_ss_tree_node,
//   qr_ss_tree_edge, qr_ss_tree_layout_cache
//
// ARCHITECTURE RULES (do not violate):
//   • qr_word_occurrences = single canonical word owner; no qr_ss_occ_word
//   • qr_ss_occ_segment = sub-word attached elements only
//   • Scope rows populate BEFORE tree rows are generated
//   • Tree rows are downstream projections, NOT the primary store of truth
// ─────────────────────────────────────────────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Row shapes ─────────────────────────────────────────────────────────────────

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

// ── Repo ───────────────────────────────────────────────────────────────────────

export class SentenceStructureRepo {
  constructor(private db: D1Database) {}

  // ── qr_ss_occ_sentence ─────────────────────────────────────────────────────

  sentences(surah: number, ayah?: number, opts: PaginateOptions = {}) {
    const whereClause = ayah != null
      ? 'WHERE surah = ? AND ayah_from <= ? AND ayah_to >= ?'
      : 'WHERE surah = ?';
    const params = ayah != null ? [surah, ayah, ayah] : [surah];

    return paginate<OccSentence>(
      this.db,
      `SELECT id, surah, ayah_from, ayah_to, word_start_index, word_end_index,
              sentence_kind, lx_sentence_kind_ref, discourse_role, note_md, created_at, updated_at
       FROM qr_ss_occ_sentence
       ${whereClause}
       ORDER BY ayah_from, word_start_index`,
      `SELECT COUNT(*) AS count FROM qr_ss_occ_sentence ${whereClause}`,
      params,
      opts,
    );
  }

  async createSentence(input: OccSentenceCreate): Promise<OccSentence | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_occ_sentence
         (id, surah, ayah_from, ayah_to, word_start_index, word_end_index,
          sentence_kind, lx_sentence_kind_ref, discourse_role, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.ayah_from,
        input.ayah_to,
        input.word_start_index ?? null,
        input.word_end_index ?? null,
        input.sentence_kind ?? 'declarative',
        input.lx_sentence_kind_ref ?? null,
        input.discourse_role ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<OccSentence>(
      this.db,
      `SELECT id, surah, ayah_from, ayah_to, word_start_index, word_end_index,
              sentence_kind, lx_sentence_kind_ref, discourse_role, note_md, created_at, updated_at
       FROM qr_ss_occ_sentence WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_occ_clause ───────────────────────────────────────────────────────

  clauses(sentenceId: string, opts: PaginateOptions = {}) {
    return paginate<OccClause>(
      this.db,
      `SELECT id, sentence_id, parent_clause_id, clause_order, surah, ayah_from, ayah_to,
              word_start_index, word_end_index, clause_type, lx_clause_type_ref,
              clause_function, lx_clause_func_ref, governing_particle,
              is_elliptical, elided_element, note_md, created_at
       FROM qr_ss_occ_clause
       WHERE sentence_id = ?
       ORDER BY clause_order`,
      `SELECT COUNT(*) AS count FROM qr_ss_occ_clause WHERE sentence_id = ?`,
      [sentenceId],
      opts,
    );
  }

  async createClause(input: OccClauseCreate): Promise<OccClause | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_occ_clause
         (id, sentence_id, parent_clause_id, clause_order, surah, ayah_from, ayah_to,
          word_start_index, word_end_index, clause_type, lx_clause_type_ref,
          clause_function, lx_clause_func_ref, governing_particle,
          is_elliptical, elided_element, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.sentence_id,
        input.parent_clause_id ?? null,
        input.clause_order ?? 1,
        input.surah,
        input.ayah_from,
        input.ayah_to,
        input.word_start_index ?? null,
        input.word_end_index ?? null,
        input.clause_type ?? 'main',
        input.lx_clause_type_ref ?? null,
        input.clause_function ?? null,
        input.lx_clause_func_ref ?? null,
        input.governing_particle ?? null,
        input.is_elliptical ?? 0,
        input.elided_element ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<OccClause>(
      this.db,
      `SELECT id, sentence_id, parent_clause_id, clause_order, surah, ayah_from, ayah_to,
              word_start_index, word_end_index, clause_type, lx_clause_type_ref,
              clause_function, lx_clause_func_ref, governing_particle,
              is_elliptical, elided_element, note_md, created_at
       FROM qr_ss_occ_clause WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_occ_phrase ───────────────────────────────────────────────────────

  phrases(clauseId: string): Promise<OccPhrase[]> {
    return query<OccPhrase>(
      this.db,
      `SELECT id, clause_id, phrase_order, surah, ayah, word_start_index, word_end_index,
              phrase_type, lx_phrase_type_ref, phrase_function, lx_phrase_func_ref,
              head_word_id, note_md, created_at
       FROM qr_ss_occ_phrase
       WHERE clause_id = ?
       ORDER BY phrase_order`,
      [clauseId],
    );
  }

  async createPhrase(input: OccPhraseCreate): Promise<OccPhrase | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_occ_phrase
         (id, clause_id, phrase_order, surah, ayah, word_start_index, word_end_index,
          phrase_type, lx_phrase_type_ref, phrase_function, lx_phrase_func_ref,
          head_word_id, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.clause_id,
        input.phrase_order ?? 1,
        input.surah,
        input.ayah,
        input.word_start_index,
        input.word_end_index,
        input.phrase_type,
        input.lx_phrase_type_ref ?? null,
        input.phrase_function ?? null,
        input.lx_phrase_func_ref ?? null,
        input.head_word_id ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<OccPhrase>(
      this.db,
      `SELECT id, clause_id, phrase_order, surah, ayah, word_start_index, word_end_index,
              phrase_type, lx_phrase_type_ref, phrase_function, lx_phrase_func_ref,
              head_word_id, note_md, created_at
       FROM qr_ss_occ_phrase WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_occ_segment ──────────────────────────────────────────────────────

  segments(wordOccId: string): Promise<OccSegment[]> {
    return query<OccSegment>(
      this.db,
      `SELECT id, surah, ayah, word_occurrence_id, segment_index, segment_text,
              segment_type, lx_particle_ref, morphology_tag, created_at
       FROM qr_ss_occ_segment
       WHERE word_occurrence_id = ?
       ORDER BY segment_index`,
      [wordOccId],
    );
  }

  async createSegment(input: OccSegmentCreate): Promise<OccSegment | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_occ_segment
         (id, surah, ayah, word_occurrence_id, segment_index, segment_text,
          segment_type, lx_particle_ref, morphology_tag)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.ayah,
        input.word_occurrence_id,
        input.segment_index,
        input.segment_text,
        input.segment_type,
        input.lx_particle_ref ?? null,
        input.morphology_tag ?? null,
      ],
    );

    return queryOne<OccSegment>(
      this.db,
      `SELECT id, surah, ayah, word_occurrence_id, segment_index, segment_text,
              segment_type, lx_particle_ref, morphology_tag, created_at
       FROM qr_ss_occ_segment WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_scope_member_map ─────────────────────────────────────────────────

  scopeMembers(scopeRef: { scope_type: string; scope_id: string }): Promise<ScopeMemberMap[]> {
    return query<ScopeMemberMap>(
      this.db,
      `SELECT id, word_occurrence_id, scope_type, scope_id, member_role, created_at
       FROM qr_ss_scope_member_map
       WHERE scope_type = ? AND scope_id = ?`,
      [scopeRef.scope_type, scopeRef.scope_id],
    );
  }

  async addScopeMember(input: ScopeMemberMapCreate): Promise<ScopeMemberMap | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT OR IGNORE INTO qr_ss_scope_member_map
         (id, word_occurrence_id, scope_type, scope_id, member_role)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.word_occurrence_id, input.scope_type, input.scope_id, input.member_role ?? null],
    );

    return queryOne<ScopeMemberMap>(
      this.db,
      `SELECT id, word_occurrence_id, scope_type, scope_id, member_role, created_at
       FROM qr_ss_scope_member_map
       WHERE word_occurrence_id = ? AND scope_type = ? AND scope_id = ?`,
      [input.word_occurrence_id, input.scope_type, input.scope_id],
    );
  }

  // ── qr_ss_scope_relations ──────────────────────────────────────────────────

  scopeRelations(scopeRef: { from_scope_type: string; from_scope_id: string }, opts: PaginateOptions = {}) {
    return paginate<ScopeRelation>(
      this.db,
      `SELECT id, from_scope_type, from_scope_id, to_scope_type, to_scope_id,
              relation_type, lx_relation_ref, note_md, created_at
       FROM qr_ss_scope_relations
       WHERE from_scope_type = ? AND from_scope_id = ?
       ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM qr_ss_scope_relations WHERE from_scope_type = ? AND from_scope_id = ?`,
      [scopeRef.from_scope_type, scopeRef.from_scope_id],
      opts,
    );
  }

  async addScopeRelation(input: ScopeRelationCreate): Promise<ScopeRelation | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_scope_relations
         (id, from_scope_type, from_scope_id, to_scope_type, to_scope_id,
          relation_type, lx_relation_ref, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.from_scope_type,
        input.from_scope_id,
        input.to_scope_type,
        input.to_scope_id,
        input.relation_type,
        input.lx_relation_ref ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<ScopeRelation>(
      this.db,
      `SELECT id, from_scope_type, from_scope_id, to_scope_type, to_scope_id,
              relation_type, lx_relation_ref, note_md, created_at
       FROM qr_ss_scope_relations WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_syntax_relations ─────────────────────────────────────────────────

  syntaxRelations(surah: number, opts: PaginateOptions = {}) {
    return paginate<SyntaxRelation>(
      this.db,
      `SELECT id, surah, ayah, head_word_id, dep_word_id, relation_label,
              lx_rel_type_ref, note_md, created_at
       FROM qr_ss_syntax_relations
       WHERE surah = ?
       ORDER BY ayah, created_at`,
      `SELECT COUNT(*) AS count FROM qr_ss_syntax_relations WHERE surah = ?`,
      [surah],
      opts,
    );
  }

  async createSyntaxRelation(input: SyntaxRelationCreate): Promise<SyntaxRelation | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_syntax_relations
         (id, surah, ayah, head_word_id, dep_word_id, relation_label, lx_rel_type_ref, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah,
        input.ayah,
        input.head_word_id,
        input.dep_word_id,
        input.relation_label,
        input.lx_rel_type_ref ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<SyntaxRelation>(
      this.db,
      `SELECT id, surah, ayah, head_word_id, dep_word_id, relation_label,
              lx_rel_type_ref, note_md, created_at
       FROM qr_ss_syntax_relations WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_scope_morph_link ─────────────────────────────────────────────────

  morphLinks(scopeRef: { scope_type: string; scope_id: string }): Promise<ScopeMorphLink[]> {
    return query<ScopeMorphLink>(
      this.db,
      `SELECT id, scope_type, scope_id, lx_morph_ref, irab_position, irab_sign,
              syntactic_function, is_disputed, dispute_note, note_md, created_at
       FROM qr_ss_scope_morph_link
       WHERE scope_type = ? AND scope_id = ?`,
      [scopeRef.scope_type, scopeRef.scope_id],
    );
  }

  async addMorphLink(input: ScopeMorphLinkCreate): Promise<ScopeMorphLink | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_scope_morph_link
         (id, scope_type, scope_id, lx_morph_ref, irab_position, irab_sign,
          syntactic_function, is_disputed, dispute_note, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scope_type,
        input.scope_id,
        input.lx_morph_ref,
        input.irab_position ?? null,
        input.irab_sign ?? null,
        input.syntactic_function ?? null,
        input.is_disputed ?? 0,
        input.dispute_note ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<ScopeMorphLink>(
      this.db,
      `SELECT id, scope_type, scope_id, lx_morph_ref, irab_position, irab_sign,
              syntactic_function, is_disputed, dispute_note, note_md, created_at
       FROM qr_ss_scope_morph_link WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_scope_grammar_link ───────────────────────────────────────────────

  grammarLinks(scopeRef: { scope_type: string; scope_id: string }): Promise<ScopeGrammarLink[]> {
    return query<ScopeGrammarLink>(
      this.db,
      `SELECT id, scope_type, scope_id, lx_grammar_ref, application_note, note_md, created_at
       FROM qr_ss_scope_grammar_link
       WHERE scope_type = ? AND scope_id = ?`,
      [scopeRef.scope_type, scopeRef.scope_id],
    );
  }

  async addGrammarLink(input: ScopeGrammarLinkCreate): Promise<ScopeGrammarLink | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_scope_grammar_link
         (id, scope_type, scope_id, lx_grammar_ref, application_note, note_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scope_type,
        input.scope_id,
        input.lx_grammar_ref,
        input.application_note ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<ScopeGrammarLink>(
      this.db,
      `SELECT id, scope_type, scope_id, lx_grammar_ref, application_note, note_md, created_at
       FROM qr_ss_scope_grammar_link WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_scope_balagha_link ───────────────────────────────────────────────

  balaghaLinks(scopeRef: { scope_type: string; scope_id: string }): Promise<ScopeBalaghaLink[]> {
    return query<ScopeBalaghaLink>(
      this.db,
      `SELECT id, scope_type, scope_id, lx_balagha_ref, balagha_category,
              rhetorical_effect, note_md, created_at
       FROM qr_ss_scope_balagha_link
       WHERE scope_type = ? AND scope_id = ?`,
      [scopeRef.scope_type, scopeRef.scope_id],
    );
  }

  async addBalaghaLink(input: ScopeBalaghaLinkCreate): Promise<ScopeBalaghaLink | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_scope_balagha_link
         (id, scope_type, scope_id, lx_balagha_ref, balagha_category, rhetorical_effect, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scope_type,
        input.scope_id,
        input.lx_balagha_ref,
        input.balagha_category ?? null,
        input.rhetorical_effect ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<ScopeBalaghaLink>(
      this.db,
      `SELECT id, scope_type, scope_id, lx_balagha_ref, balagha_category,
              rhetorical_effect, note_md, created_at
       FROM qr_ss_scope_balagha_link WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_scope_nuance ─────────────────────────────────────────────────────

  nuances(scopeRef: { scope_type: string; scope_id: string }, opts: PaginateOptions = {}) {
    return paginate<ScopeNuance>(
      this.db,
      `SELECT id, scope_type, scope_id, nuance_type, lx_nuance_type_ref,
              nuance_text, nuance_text_ar, note_md, created_at, updated_at
       FROM qr_ss_scope_nuance
       WHERE scope_type = ? AND scope_id = ?
       ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM qr_ss_scope_nuance WHERE scope_type = ? AND scope_id = ?`,
      [scopeRef.scope_type, scopeRef.scope_id],
      opts,
    );
  }

  async createNuance(input: ScopeNuanceCreate): Promise<ScopeNuance | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_scope_nuance
         (id, scope_type, scope_id, nuance_type, lx_nuance_type_ref,
          nuance_text, nuance_text_ar, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scope_type,
        input.scope_id,
        input.nuance_type ?? 'discourse_force',
        input.lx_nuance_type_ref ?? null,
        input.nuance_text,
        input.nuance_text_ar ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<ScopeNuance>(
      this.db,
      `SELECT id, scope_type, scope_id, nuance_type, lx_nuance_type_ref,
              nuance_text, nuance_text_ar, note_md, created_at, updated_at
       FROM qr_ss_scope_nuance WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_ellipsis_event ───────────────────────────────────────────────────

  ellipsisEvents(surah: number, opts: PaginateOptions = {}) {
    return paginate<EllipsisEvent>(
      this.db,
      `SELECT e.id, e.sentence_id, e.scope_type, e.scope_id, e.ellipsis_type,
              e.lx_ellipsis_ref, e.elided_element, e.rhetorical_effect, e.note_md, e.created_at
       FROM qr_ss_ellipsis_event e
       JOIN qr_ss_occ_sentence s ON s.id = e.sentence_id
       WHERE s.surah = ?
       ORDER BY s.ayah_from, e.created_at`,
      `SELECT COUNT(*) AS count FROM qr_ss_ellipsis_event e
       JOIN qr_ss_occ_sentence s ON s.id = e.sentence_id WHERE s.surah = ?`,
      [surah],
      opts,
    );
  }

  async createEllipsisEvent(input: EllipsisEventCreate): Promise<EllipsisEvent | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_ellipsis_event
         (id, sentence_id, scope_type, scope_id, ellipsis_type, lx_ellipsis_ref,
          elided_element, rhetorical_effect, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.sentence_id,
        input.scope_type ?? 'clause',
        input.scope_id,
        input.ellipsis_type,
        input.lx_ellipsis_ref ?? null,
        input.elided_element,
        input.rhetorical_effect ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<EllipsisEvent>(
      this.db,
      `SELECT id, sentence_id, scope_type, scope_id, ellipsis_type, lx_ellipsis_ref,
              elided_element, rhetorical_effect, note_md, created_at
       FROM qr_ss_ellipsis_event WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_scope_reading ────────────────────────────────────────────────────

  scopeReadings(scopeRef: { scope_type: string; scope_id: string }, opts: PaginateOptions = {}) {
    return paginate<ScopeReading>(
      this.db,
      `SELECT id, scope_type, scope_id, scholar_ref, paradigm_ref, reading_type,
              lx_reading_type_ref, reading_text, reading_text_ar,
              is_minority, is_contested, note_md, created_at, updated_at
       FROM qr_ss_scope_reading
       WHERE scope_type = ? AND scope_id = ?
       ORDER BY reading_type, created_at`,
      `SELECT COUNT(*) AS count FROM qr_ss_scope_reading WHERE scope_type = ? AND scope_id = ?`,
      [scopeRef.scope_type, scopeRef.scope_id],
      opts,
    );
  }

  async createScopeReading(input: ScopeReadingCreate): Promise<ScopeReading | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_scope_reading
         (id, scope_type, scope_id, scholar_ref, paradigm_ref, reading_type,
          lx_reading_type_ref, reading_text, reading_text_ar,
          is_minority, is_contested, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scope_type,
        input.scope_id,
        input.scholar_ref ?? null,
        input.paradigm_ref ?? null,
        input.reading_type ?? 'irab',
        input.lx_reading_type_ref ?? null,
        input.reading_text,
        input.reading_text_ar ?? null,
        input.is_minority ?? 0,
        input.is_contested ?? 0,
        input.note_md ?? null,
      ],
    );

    return queryOne<ScopeReading>(
      this.db,
      `SELECT id, scope_type, scope_id, scholar_ref, paradigm_ref, reading_type,
              lx_reading_type_ref, reading_text, reading_text_ar,
              is_minority, is_contested, note_md, created_at, updated_at
       FROM qr_ss_scope_reading WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_scope_reading_evidence_link ──────────────────────────────────────

  scopeReadingEvidenceLinks(readingId: string): Promise<ScopeReadingEvidenceLink[]> {
    return query<ScopeReadingEvidenceLink>(
      this.db,
      `SELECT reading_id, evidence_id, support_type
       FROM qr_ss_scope_reading_evidence_link
       WHERE reading_id = ?`,
      [readingId],
    );
  }

  async addReadingEvidenceLink(readingId: string, evidenceId: string, supportType = 'supports'): Promise<boolean> {
    await execute(
      this.db,
      `INSERT OR IGNORE INTO qr_ss_scope_reading_evidence_link
         (reading_id, evidence_id, support_type)
       VALUES (?, ?, ?)`,
      [readingId, evidenceId, supportType],
    );
    return true;
  }

  // ── qr_ss_tree ─────────────────────────────────────────────────────────────

  trees(surah: number, opts: PaginateOptions = {}) {
    return paginate<Tree>(
      this.db,
      `SELECT t.id, t.sentence_id, t.tree_type, t.generated_at, t.note_md
       FROM qr_ss_tree t
       JOIN qr_ss_occ_sentence s ON s.id = t.sentence_id
       WHERE s.surah = ?
       ORDER BY s.ayah_from, t.generated_at`,
      `SELECT COUNT(*) AS count FROM qr_ss_tree t
       JOIN qr_ss_occ_sentence s ON s.id = t.sentence_id WHERE s.surah = ?`,
      [surah],
      opts,
    );
  }

  findTreeById(id: string): Promise<Tree | null> {
    return queryOne<Tree>(
      this.db,
      `SELECT id, sentence_id, tree_type, generated_at, note_md
       FROM qr_ss_tree WHERE id = ?`,
      [id],
    );
  }

  async createTree(input: TreeCreate): Promise<Tree | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_tree (id, sentence_id, tree_type, note_md)
       VALUES (?, ?, ?, ?)`,
      [id, input.sentence_id, input.tree_type ?? 'constituency', input.note_md ?? null],
    );

    return this.findTreeById(id);
  }

  // ── qr_ss_tree_node ────────────────────────────────────────────────────────

  treeNodes(treeId: string): Promise<TreeNode[]> {
    return query<TreeNode>(
      this.db,
      `SELECT id, tree_id, parent_node_id, node_label, scope_type, scope_id,
              depth, node_order, created_at
       FROM qr_ss_tree_node
       WHERE tree_id = ?
       ORDER BY depth, node_order`,
      [treeId],
    );
  }

  async createTreeNode(input: TreeNodeCreate): Promise<TreeNode | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_tree_node
         (id, tree_id, parent_node_id, node_label, scope_type, scope_id, depth, node_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.tree_id,
        input.parent_node_id ?? null,
        input.node_label,
        input.scope_type ?? null,
        input.scope_id ?? null,
        input.depth ?? 0,
        input.node_order ?? 0,
      ],
    );

    return queryOne<TreeNode>(
      this.db,
      `SELECT id, tree_id, parent_node_id, node_label, scope_type, scope_id,
              depth, node_order, created_at
       FROM qr_ss_tree_node WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_tree_edge ────────────────────────────────────────────────────────

  treeEdges(treeId: string): Promise<TreeEdge[]> {
    return query<TreeEdge>(
      this.db,
      `SELECT id, tree_id, parent_node_id, child_node_id, edge_label, created_at
       FROM qr_ss_tree_edge
       WHERE tree_id = ?`,
      [treeId],
    );
  }

  async createTreeEdge(input: TreeEdgeCreate): Promise<TreeEdge | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_ss_tree_edge (id, tree_id, parent_node_id, child_node_id, edge_label)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.tree_id, input.parent_node_id, input.child_node_id, input.edge_label ?? null],
    );

    return queryOne<TreeEdge>(
      this.db,
      `SELECT id, tree_id, parent_node_id, child_node_id, edge_label, created_at
       FROM qr_ss_tree_edge WHERE id = ?`,
      [id],
    );
  }

  // ── qr_ss_tree_layout_cache ────────────────────────────────────────────────

  treeLayoutCache(treeId: string): Promise<TreeLayoutCache | null> {
    return queryOne<TreeLayoutCache>(
      this.db,
      `SELECT tree_id, layout_json, renderer, generated_at
       FROM qr_ss_tree_layout_cache
       WHERE tree_id = ?`,
      [treeId],
    );
  }

  async setLayoutCache(treeId: string, layoutJson: string, renderer = 'd3_tidy_tree'): Promise<TreeLayoutCache | null> {
    await execute(
      this.db,
      `INSERT INTO qr_ss_tree_layout_cache (tree_id, layout_json, renderer)
       VALUES (?, ?, ?)
       ON CONFLICT(tree_id) DO UPDATE SET
         layout_json  = excluded.layout_json,
         renderer     = excluded.renderer,
         generated_at = datetime('now')`,
      [treeId, layoutJson, renderer],
    );

    return this.treeLayoutCache(treeId);
  }
}

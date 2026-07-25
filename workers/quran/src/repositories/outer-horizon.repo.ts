// ─── OuterHorizonRepo — Layer 11: Outer Historical + Textual + Civilizational ─
// Tables: qr_context_topics, qr_context_topic_links, qr_context_claims,
//         qr_evidence, qr_context_evidence_links,
//         qr_historical_context,
//         qr_academic_question_registry, qr_academic_positions

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── Row shapes (aligned to 005_reception_and_projections.sql) ────────────────

export interface ContextTopic {
  id: string;
  topic_key: string;
  topic_label: string;
  topic_domain: string;
  note_md: string | null;
  created_at: string;
}

export interface ContextTopicCreate {
  topic_key: string;
  topic_label: string;
  topic_domain: string;
  note_md?: string | null;
}

export interface ContextTopicLink {
  id: string;
  topic_id: string;
  scope_type: string;
  surah: number | null;
  scope_ref: string | null;
  relevance_note: string | null;
  created_at: string;
}

export interface ContextTopicLinkAdd {
  scope_type: string;
  surah?: number | null;
  scope_ref?: string | null;
  relevance_note?: string | null;
}

export interface ContextClaim {
  id: string;
  topic_id: string;
  claim_text: string;
  claim_type: string;
  confidence: string;
  note_md: string | null;
  created_at: string;
}

export interface ContextClaimCreate {
  topic_id: string;
  claim_text: string;
  claim_type?: string;
  confidence?: string;
  note_md?: string | null;
}

export interface ContextEvidenceItem {
  id: string;
  evidence_type: string;
  provenance: string | null;
  locator: string | null;
  content_text: string;
  is_disputed: number;
  dispute_note: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ContextEvidenceItemCreate {
  evidence_type: string;
  provenance?: string | null;
  locator?: string | null;
  content_text: string;
  is_disputed?: number;
  dispute_note?: string | null;
  note_md?: string | null;
}

export interface ContextEvidenceLink {
  claim_id: string;
  evidence_id: string;
  support_type: string;
}

export interface ContextEvidenceAdd {
  evidence_id: string;
  support_type?: string;
}

export interface HistoricalContextProfile {
  surah: number;
  arabian_milieu: string | null;
  political_context: string | null;
  late_antique_setting: string | null;
  inter_scriptural_env: string | null;
  note_md: string | null;
  created_at: string;
}

export interface HistoricalContextData {
  arabian_milieu?: string | null;
  political_context?: string | null;
  late_antique_setting?: string | null;
  inter_scriptural_env?: string | null;
  note_md?: string | null;
}

export interface AcademicQuestion {
  id: string;
  question_text: string;
  question_domain: string;
  linked_surah: number | null;
  debate_cluster_id: string | null;
  note_md: string | null;
  created_at: string;
}

export interface AcademicQuestionCreate {
  question_text: string;
  question_domain: string;
  linked_surah?: number | null;
  debate_cluster_id?: string | null;
  note_md?: string | null;
}

export interface AcademicPosition {
  id: string;
  question_id: string;
  scholar_id: string | null;
  paradigm_id: string | null;
  position_text: string;
  evidence_ids_json: string | null;
  note_md: string | null;
  created_at: string;
}

export interface AcademicPositionCreate {
  question_id: string;
  scholar_id?: string | null;
  paradigm_id?: string | null;
  position_text: string;
  evidence_ids_json?: string | null;
  note_md?: string | null;
}

// ─── Column SELECT constants ───────────────────────────────────────────────────

const CT_COLS = `
  id, topic_key, topic_label, topic_domain, note_md, created_at`;

const CTL_COLS = `
  id, topic_id, scope_type, surah, scope_ref, relevance_note, created_at`;

const CC_COLS = `
  id, topic_id, claim_text, claim_type, confidence, note_md, created_at`;

const CEI_COLS = `
  id, evidence_type, provenance, locator, content_text,
  is_disputed, dispute_note, note_md, created_at`;

const HCP_COLS = `
  surah, arabian_milieu, political_context, late_antique_setting,
  inter_scriptural_env, note_md, created_at`;

const AQ_COLS = `
  id, question_text, question_domain, linked_surah,
  debate_cluster_id, note_md, created_at`;

const AP_COLS = `
  id, question_id, scholar_id, paradigm_id, position_text,
  evidence_ids_json, note_md, created_at`;

// ─── OuterHorizonRepo ─────────────────────────────────────────────────────────

export class OuterHorizonRepo {
  constructor(private db: D1Database) {}

  // ── Context Topics ──────────────────────────────────────────────────────────

  contextTopics(opts: PaginateOptions = {}) {
    return paginate<ContextTopic>(
      this.db,
      `SELECT ${CT_COLS} FROM qr_context_topics ORDER BY topic_domain, topic_label`,
      `SELECT COUNT(*) AS count FROM qr_context_topics`,
      [],
      opts,
    );
  }

  findContextTopicById(id: string): Promise<ContextTopic | null> {
    return queryOne<ContextTopic>(
      this.db,
      `SELECT ${CT_COLS} FROM qr_context_topics WHERE id = ?`,
      [id],
    );
  }

  findContextTopicBySlug(topicKey: string): Promise<ContextTopic | null> {
    return queryOne<ContextTopic>(
      this.db,
      `SELECT ${CT_COLS} FROM qr_context_topics WHERE topic_key = ?`,
      [topicKey],
    );
  }

  async createContextTopic(input: ContextTopicCreate): Promise<ContextTopic> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_context_topics
         (id, topic_key, topic_label, topic_domain, note_md)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        input.topic_key,
        input.topic_label,
        input.topic_domain,
        input.note_md ?? null,
      ],
    );
    return (await this.findContextTopicById(id))!;
  }

  // ── Context Topic Links ─────────────────────────────────────────────────────

  contextTopicLinks(scopeRef: string): Promise<ContextTopicLink[]> {
    return query<ContextTopicLink>(
      this.db,
      `SELECT ${CTL_COLS}
       FROM qr_context_topic_links
       WHERE scope_ref = ?
       ORDER BY created_at`,
      [scopeRef],
    );
  }

  contextTopicLinksByTopic(topicId: string): Promise<ContextTopicLink[]> {
    return query<ContextTopicLink>(
      this.db,
      `SELECT ${CTL_COLS}
       FROM qr_context_topic_links
       WHERE topic_id = ?
       ORDER BY surah, scope_type`,
      [topicId],
    );
  }

  async addContextTopicLink(
    topicId: string,
    input: ContextTopicLinkAdd,
  ): Promise<ContextTopicLink> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_context_topic_links
         (id, topic_id, scope_type, surah, scope_ref, relevance_note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        topicId,
        input.scope_type,
        input.surah ?? null,
        input.scope_ref ?? null,
        input.relevance_note ?? null,
      ],
    );
    return (await queryOne<ContextTopicLink>(
      this.db,
      `SELECT ${CTL_COLS} FROM qr_context_topic_links WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Context Claims ──────────────────────────────────────────────────────────

  contextClaims(topicId: string, opts: PaginateOptions = {}) {
    return paginate<ContextClaim>(
      this.db,
      `SELECT ${CC_COLS}
       FROM qr_context_claims
       WHERE topic_id = ?
       ORDER BY claim_type, confidence`,
      `SELECT COUNT(*) AS count FROM qr_context_claims WHERE topic_id = ?`,
      [topicId],
      opts,
    );
  }

  findContextClaimById(id: string): Promise<ContextClaim | null> {
    return queryOne<ContextClaim>(
      this.db,
      `SELECT ${CC_COLS} FROM qr_context_claims WHERE id = ?`,
      [id],
    );
  }

  async createContextClaim(input: ContextClaimCreate): Promise<ContextClaim> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_context_claims
         (id, topic_id, claim_text, claim_type, confidence, note_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.topic_id,
        input.claim_text,
        input.claim_type ?? 'historical',
        input.confidence ?? 'proposed',
        input.note_md ?? null,
      ],
    );
    return (await this.findContextClaimById(id))!;
  }

  // ── Context Evidence Items ──────────────────────────────────────────────────

  contextEvidence(contextClaimId: string): Promise<ContextEvidenceItem[]> {
    return query<ContextEvidenceItem>(
      this.db,
      `SELECT cei.id, cei.evidence_type, cei.provenance, cei.locator,
              cei.content_text, cei.is_disputed, cei.dispute_note,
              cei.note_md, cei.created_at
       FROM qr_evidence cei
       INNER JOIN qr_context_evidence_links cel
         ON cel.evidence_id = cei.id
       WHERE cel.claim_id = ?
       ORDER BY cei.evidence_type, cei.created_at`,
      [contextClaimId],
    );
  }

  findContextEvidenceById(id: string): Promise<ContextEvidenceItem | null> {
    return queryOne<ContextEvidenceItem>(
      this.db,
      `SELECT ${CEI_COLS} FROM qr_evidence WHERE id = ?`,
      [id],
    );
  }

  async createContextEvidenceItem(input: ContextEvidenceItemCreate): Promise<ContextEvidenceItem> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_evidence
         (id, evidence_type, provenance, locator, content_text,
          is_disputed, dispute_note, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.evidence_type,
        input.provenance ?? null,
        input.locator ?? null,
        input.content_text,
        input.is_disputed ?? 0,
        input.dispute_note ?? null,
        input.note_md ?? null,
      ],
    );
    return (await this.findContextEvidenceById(id))!;
  }

  async addContextEvidence(
    contextClaimId: string,
    input: ContextEvidenceAdd,
  ): Promise<ContextEvidenceLink> {
    await execute(
      this.db,
      `INSERT OR REPLACE INTO qr_context_evidence_links
         (claim_id, evidence_id, support_type)
       VALUES (?, ?, ?)`,
      [
        contextClaimId,
        input.evidence_id,
        input.support_type ?? 'supports',
      ],
    );
    return (await queryOne<ContextEvidenceLink>(
      this.db,
      `SELECT claim_id, evidence_id, support_type
       FROM qr_context_evidence_links
       WHERE claim_id = ? AND evidence_id = ?`,
      [contextClaimId, input.evidence_id],
    ))!;
  }

  // ── Historical Context Profiles ─────────────────────────────────────────────

  historicalContexts(surahId?: number, opts: PaginateOptions = {}) {
    if (surahId !== undefined) {
      // Single-surah lookup — skip paginate overhead
      return queryOne<HistoricalContextProfile>(
        this.db,
        `SELECT ${HCP_COLS} FROM qr_historical_context WHERE surah = ?`,
        [surahId],
      );
    }
    return paginate<HistoricalContextProfile>(
      this.db,
      `SELECT ${HCP_COLS} FROM qr_historical_context ORDER BY surah`,
      `SELECT COUNT(*) AS count FROM qr_historical_context`,
      [],
      opts,
    );
  }

  async upsertHistoricalContext(
    surahId: number,
    data: HistoricalContextData,
  ): Promise<HistoricalContextProfile> {
    const existing = await queryOne<{ surah: number }>(
      this.db,
      `SELECT surah FROM qr_historical_context WHERE surah = ?`,
      [surahId],
    );

    if (existing) {
      await execute(
        this.db,
        `UPDATE qr_historical_context SET
           arabian_milieu = ?,
           political_context = ?,
           late_antique_setting = ?,
           inter_scriptural_env = ?,
           note_md = ?
         WHERE surah = ?`,
        [
          data.arabian_milieu ?? null,
          data.political_context ?? null,
          data.late_antique_setting ?? null,
          data.inter_scriptural_env ?? null,
          data.note_md ?? null,
          surahId,
        ],
      );
    } else {
      await execute(
        this.db,
        `INSERT INTO qr_historical_context
           (surah, arabian_milieu, political_context,
            late_antique_setting, inter_scriptural_env, note_md)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          surahId,
          data.arabian_milieu ?? null,
          data.political_context ?? null,
          data.late_antique_setting ?? null,
          data.inter_scriptural_env ?? null,
          data.note_md ?? null,
        ],
      );
    }

    return (await queryOne<HistoricalContextProfile>(
      this.db,
      `SELECT ${HCP_COLS} FROM qr_historical_context WHERE surah = ?`,
      [surahId],
    ))!;
  }

  // ── Academic Question Registry ──────────────────────────────────────────────

  academicQuestions(opts: PaginateOptions = {}) {
    return paginate<AcademicQuestion>(
      this.db,
      `SELECT ${AQ_COLS} FROM qr_academic_question_registry ORDER BY question_domain, question_text`,
      `SELECT COUNT(*) AS count FROM qr_academic_question_registry`,
      [],
      opts,
    );
  }

  findQuestionById(id: string): Promise<AcademicQuestion | null> {
    return queryOne<AcademicQuestion>(
      this.db,
      `SELECT ${AQ_COLS} FROM qr_academic_question_registry WHERE id = ?`,
      [id],
    );
  }

  async createQuestion(input: AcademicQuestionCreate): Promise<AcademicQuestion> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_academic_question_registry
         (id, question_text, question_domain, linked_surah, debate_cluster_id, note_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.question_text,
        input.question_domain,
        input.linked_surah ?? null,
        input.debate_cluster_id ?? null,
        input.note_md ?? null,
      ],
    );
    return (await this.findQuestionById(id))!;
  }

  // ── Academic Positions ──────────────────────────────────────────────────────

  academicPositions(questionId: string, opts: PaginateOptions = {}) {
    return paginate<AcademicPosition>(
      this.db,
      `SELECT ${AP_COLS}
       FROM qr_academic_positions
       WHERE question_id = ?
       ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM qr_academic_positions WHERE question_id = ?`,
      [questionId],
      opts,
    );
  }

  findAcademicPositionById(id: string): Promise<AcademicPosition | null> {
    return queryOne<AcademicPosition>(
      this.db,
      `SELECT ${AP_COLS} FROM qr_academic_positions WHERE id = ?`,
      [id],
    );
  }

  async createAcademicPosition(input: AcademicPositionCreate): Promise<AcademicPosition> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_academic_positions
         (id, question_id, scholar_id, paradigm_id,
          position_text, evidence_ids_json, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.question_id,
        input.scholar_id ?? null,
        input.paradigm_id ?? null,
        input.position_text,
        input.evidence_ids_json ?? null,
        input.note_md ?? null,
      ],
    );
    return (await this.findAcademicPositionById(id))!;
  }
}

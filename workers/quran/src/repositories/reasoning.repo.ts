// ─── ReasoningRepo — qr_analysis_scope + qr_analysis_claim + qr_scope_nuance +
//     qr_evidence + qr_claim_evidence_link + qr_argument +
//     qr_argument_link + qr_debate_cluster ────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Row shapes ─────────────────────────────────────────────────────────────────

export interface AnalysisScope {
  id: string;
  scope_type: string;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  ref_id: string | null;
  label: string | null;
  note_md: string | null;
  created_at: string;
}

export interface AnalysisScopeCreate {
  scope_type: string;
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  ref_id?: string | null;
  label?: string | null;
  note_md?: string | null;
}

export interface AnalysisClaim {
  id: string;
  scope_id: string;
  claim_type: string;
  claim_text: string;
  claim_text_ar: string | null;
  confidence: string;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisClaimCreate {
  scope_id: string;
  claim_type: string;
  claim_text: string;
  claim_text_ar?: string | null;
  confidence?: string;
  note_md?: string | null;
}

export interface AnalysisClaimPatch {
  claim_type?: string;
  claim_text?: string;
  claim_text_ar?: string | null;
  confidence?: string;
  note_md?: string | null;
}

export interface ScopeNuance {
  id: string;
  scope_id: string;
  claim_id: string | null;
  nuance_type: string;
  nuance_text: string;
  nuance_text_ar: string | null;
  discourse_force: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ScopeNuanceCreate {
  scope_id: string;
  claim_id?: string | null;
  nuance_type?: string;
  nuance_text: string;
  nuance_text_ar?: string | null;
  discourse_force?: string | null;
  note_md?: string | null;
}

export interface EvidenceItem {
  id: string;
  evidence_type: string;
  provenance: string | null;
  locator: string | null;
  content_text: string;
  content_text_ar: string | null;
  is_disputed: number;
  dispute_note: string | null;
  source_ref: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceItemCreate {
  evidence_type: string;
  provenance?: string | null;
  locator?: string | null;
  content_text: string;
  content_text_ar?: string | null;
  is_disputed?: number;
  dispute_note?: string | null;
  source_ref?: string | null;
  note_md?: string | null;
}

export interface ClaimEvidenceLink {
  id: string;
  claim_id: string;
  evidence_id: string;
  support_type: string;
  note_md: string | null;
  created_at: string;
}

export interface Argument {
  id: string;
  surah: number | null;
  title: string;
  title_ar: string | null;
  argument_type: string;
  summary_md: string;
  claims_json: string | null;
  evidence_ids_json: string | null;
  confidence: string;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArgumentCreate {
  surah?: number | null;
  title: string;
  title_ar?: string | null;
  argument_type?: string;
  summary_md: string;
  claims_json?: string | null;
  evidence_ids_json?: string | null;
  confidence?: string;
  note_md?: string | null;
}

export interface ArgumentRelation {
  id: string;
  from_argument_id: string;
  to_argument_id: string;
  relation_type: string;
  note_md: string | null;
  created_at: string;
}

export interface ArgumentRelationCreate {
  from_argument_id: string;
  to_argument_id: string;
  relation_type: string;
  note_md?: string | null;
}

export interface DebateCluster {
  id: string;
  surah: number | null;
  title_en: string;
  title_ar: string | null;
  cluster_type: string;
  scope_description: string | null;
  arguments_json: string | null;
  summary_md: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebateClusterCreate {
  surah?: number | null;
  title_en: string;
  title_ar?: string | null;
  cluster_type?: string;
  scope_description?: string | null;
  arguments_json?: string | null;
  summary_md?: string | null;
  note_md?: string | null;
}

// ── Repo ───────────────────────────────────────────────────────────────────────

export class ReasoningRepo {
  constructor(private db: D1Database) {}

  // ── qr_analysis_scope ─────────────────────────────────────────────────────

  scopes(scopeRef?: { surah?: number; scope_type?: string }, opts: PaginateOptions = {}) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (scopeRef?.surah != null) {
      conditions.push('surah = ?');
      params.push(scopeRef.surah);
    }
    if (scopeRef?.scope_type) {
      conditions.push('scope_type = ?');
      params.push(scopeRef.scope_type);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return paginate<AnalysisScope>(
      this.db,
      `SELECT id, scope_type, surah, ayah_from, ayah_to, ref_id, label, note_md, created_at
       FROM qr_analysis_scope
       ${whereClause}
       ORDER BY surah, ayah_from, created_at`,
      `SELECT COUNT(*) AS count FROM qr_analysis_scope ${whereClause}`,
      params,
      opts,
    );
  }

  findScopeById(id: string): Promise<AnalysisScope | null> {
    return queryOne<AnalysisScope>(
      this.db,
      `SELECT id, scope_type, surah, ayah_from, ayah_to, ref_id, label, note_md, created_at
       FROM qr_analysis_scope
       WHERE id = ?`,
      [id],
    );
  }

  async createScope(input: AnalysisScopeCreate): Promise<AnalysisScope | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_analysis_scope
         (id, scope_type, surah, ayah_from, ayah_to, ref_id, label, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scope_type,
        input.surah ?? null,
        input.ayah_from ?? null,
        input.ayah_to ?? null,
        input.ref_id ?? null,
        input.label ?? null,
        input.note_md ?? null,
      ],
    );

    return this.findScopeById(id);
  }

  // ── qr_analysis_claim ─────────────────────────────────────────────────────

  claims(scopeId?: string, opts: PaginateOptions = {}) {
    const whereClause = scopeId ? 'WHERE scope_id = ?' : '';
    const params = scopeId ? [scopeId] : [];

    return paginate<AnalysisClaim>(
      this.db,
      `SELECT id, scope_id, claim_type, claim_text, claim_text_ar,
              confidence, note_md, created_at, updated_at
       FROM qr_analysis_claim
       ${whereClause}
       ORDER BY claim_type, created_at`,
      `SELECT COUNT(*) AS count FROM qr_analysis_claim ${whereClause}`,
      params,
      opts,
    );
  }

  findClaimById(id: string): Promise<AnalysisClaim | null> {
    return queryOne<AnalysisClaim>(
      this.db,
      `SELECT id, scope_id, claim_type, claim_text, claim_text_ar,
              confidence, note_md, created_at, updated_at
       FROM qr_analysis_claim
       WHERE id = ?`,
      [id],
    );
  }

  async createClaim(input: AnalysisClaimCreate): Promise<AnalysisClaim | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_analysis_claim
         (id, scope_id, claim_type, claim_text, claim_text_ar, confidence, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scope_id,
        input.claim_type,
        input.claim_text,
        input.claim_text_ar ?? null,
        input.confidence ?? 'proposed',
        input.note_md ?? null,
      ],
    );

    return this.findClaimById(id);
  }

  async patchClaim(id: string, patch: AnalysisClaimPatch): Promise<AnalysisClaim | null> {
    const sets: string[] = ['updated_at = datetime(\'now\')'];
    const vals: unknown[] = [];

    if (patch.claim_type !== undefined)    { sets.push('claim_type = ?');    vals.push(patch.claim_type); }
    if (patch.claim_text !== undefined)    { sets.push('claim_text = ?');    vals.push(patch.claim_text); }
    if (patch.claim_text_ar !== undefined) { sets.push('claim_text_ar = ?'); vals.push(patch.claim_text_ar); }
    if (patch.confidence !== undefined)    { sets.push('confidence = ?');    vals.push(patch.confidence); }
    if (patch.note_md !== undefined)       { sets.push('note_md = ?');       vals.push(patch.note_md); }

    if (sets.length > 1) {
      vals.push(id);
      await execute(this.db, `UPDATE qr_analysis_claim SET ${sets.join(', ')} WHERE id = ?`, vals);
    }

    return this.findClaimById(id);
  }

  // ── qr_scope_nuance ───────────────────────────────────────────────────────

  scopeNuances(scopeId: string, opts: PaginateOptions = {}) {
    return paginate<ScopeNuance>(
      this.db,
      `SELECT id, scope_id, claim_id, nuance_type, nuance_text, nuance_text_ar,
              discourse_force, note_md, created_at
       FROM qr_scope_nuance
       WHERE scope_id = ?
       ORDER BY nuance_type, created_at`,
      `SELECT COUNT(*) AS count FROM qr_scope_nuance WHERE scope_id = ?`,
      [scopeId],
      opts,
    );
  }

  async createNuance(input: ScopeNuanceCreate): Promise<ScopeNuance | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_scope_nuance
         (id, scope_id, claim_id, nuance_type, nuance_text, nuance_text_ar, discourse_force, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.scope_id,
        input.claim_id ?? null,
        input.nuance_type ?? 'qualification',
        input.nuance_text,
        input.nuance_text_ar ?? null,
        input.discourse_force ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<ScopeNuance>(
      this.db,
      `SELECT id, scope_id, claim_id, nuance_type, nuance_text, nuance_text_ar,
              discourse_force, note_md, created_at
       FROM qr_scope_nuance WHERE id = ?`,
      [id],
    );
  }

  // ── qr_evidence ──────────────────────────────────────────────────────

  evidence(claimId: string): Promise<EvidenceItem[]> {
    return query<EvidenceItem>(
      this.db,
      `SELECT e.id, e.evidence_type, e.provenance, e.locator, e.content_text,
              e.content_text_ar, e.is_disputed, e.dispute_note, e.source_ref,
              e.note_md, e.created_at, e.updated_at
       FROM qr_evidence e
       JOIN qr_claim_evidence_link l ON l.evidence_id = e.id
       WHERE l.claim_id = ?
       ORDER BY e.evidence_type, e.created_at`,
      [claimId],
    );
  }

  async addEvidence(claimId: string, input: EvidenceItemCreate, supportType = 'supports'): Promise<EvidenceItem | null> {
    const evidenceId = typedId('QR');
    const linkId = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_evidence
         (id, evidence_type, provenance, locator, content_text, content_text_ar,
          is_disputed, dispute_note, source_ref, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        evidenceId,
        input.evidence_type,
        input.provenance ?? null,
        input.locator ?? null,
        input.content_text,
        input.content_text_ar ?? null,
        input.is_disputed ?? 0,
        input.dispute_note ?? null,
        input.source_ref ?? null,
        input.note_md ?? null,
      ],
    );

    await execute(
      this.db,
      `INSERT OR IGNORE INTO qr_claim_evidence_link (id, claim_id, evidence_id, support_type)
       VALUES (?, ?, ?, ?)`,
      [linkId, claimId, evidenceId, supportType],
    );

    return queryOne<EvidenceItem>(
      this.db,
      `SELECT id, evidence_type, provenance, locator, content_text, content_text_ar,
              is_disputed, dispute_note, source_ref, note_md, created_at, updated_at
       FROM qr_evidence WHERE id = ?`,
      [evidenceId],
    );
  }

  async removeEvidence(claimId: string, evidenceId: string): Promise<boolean> {
    const result = await execute(
      this.db,
      `DELETE FROM qr_claim_evidence_link WHERE claim_id = ? AND evidence_id = ?`,
      [claimId, evidenceId],
    );
    return (result.meta.changes ?? 0) > 0;
  }

  // ── qr_argument ───────────────────────────────────────────────────────────

  args(claimId?: string, opts: PaginateOptions = {}) {
    if (claimId) {
      // Return arguments that contain this claim in claims_json
      // Note: D1/SQLite JSON_EACH or LIKE-based search
      return paginate<Argument>(
        this.db,
        `SELECT id, surah, title, title_ar, argument_type, summary_md,
                claims_json, evidence_ids_json, confidence, note_md, created_at, updated_at
         FROM qr_argument
         WHERE claims_json LIKE ?
         ORDER BY argument_type, created_at`,
        `SELECT COUNT(*) AS count FROM qr_argument WHERE claims_json LIKE ?`,
        [`%${claimId}%`],
        opts,
      );
    }

    return paginate<Argument>(
      this.db,
      `SELECT id, surah, title, title_ar, argument_type, summary_md,
              claims_json, evidence_ids_json, confidence, note_md, created_at, updated_at
       FROM qr_argument
       ORDER BY argument_type, created_at`,
      `SELECT COUNT(*) AS count FROM qr_argument`,
      [],
      opts,
    );
  }

  async createArgument(input: ArgumentCreate): Promise<Argument | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_argument
         (id, surah, title, title_ar, argument_type, summary_md,
          claims_json, evidence_ids_json, confidence, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah ?? null,
        input.title,
        input.title_ar ?? null,
        input.argument_type ?? 'analytical',
        input.summary_md,
        input.claims_json ?? null,
        input.evidence_ids_json ?? null,
        input.confidence ?? 'proposed',
        input.note_md ?? null,
      ],
    );

    return queryOne<Argument>(
      this.db,
      `SELECT id, surah, title, title_ar, argument_type, summary_md,
              claims_json, evidence_ids_json, confidence, note_md, created_at, updated_at
       FROM qr_argument WHERE id = ?`,
      [id],
    );
  }

  // ── qr_argument_link ──────────────────────────────────────────────────

  argRelations(argId: string): Promise<ArgumentRelation[]> {
    return query<ArgumentRelation>(
      this.db,
      `SELECT id, from_argument_id, to_argument_id, relation_type, note_md, created_at
       FROM qr_argument_link
       WHERE from_argument_id = ? OR to_argument_id = ?
       ORDER BY created_at`,
      [argId, argId],
    );
  }

  async addArgRelation(input: ArgumentRelationCreate): Promise<ArgumentRelation | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_argument_link
         (id, from_argument_id, to_argument_id, relation_type, note_md)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        input.from_argument_id,
        input.to_argument_id,
        input.relation_type,
        input.note_md ?? null,
      ],
    );

    return queryOne<ArgumentRelation>(
      this.db,
      `SELECT id, from_argument_id, to_argument_id, relation_type, note_md, created_at
       FROM qr_argument_link WHERE id = ?`,
      [id],
    );
  }

  // ── qr_debate_cluster ─────────────────────────────────────────────────────

  debateClusters(opts: PaginateOptions = {}, filter?: { surah?: number; cluster_type?: string }) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.surah != null) {
      conditions.push('surah = ?');
      params.push(filter.surah);
    }
    if (filter?.cluster_type) {
      conditions.push('cluster_type = ?');
      params.push(filter.cluster_type);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return paginate<DebateCluster>(
      this.db,
      `SELECT id, surah, title_en, title_ar, cluster_type, scope_description,
              arguments_json, summary_md, note_md, created_at, updated_at
       FROM qr_debate_cluster
       ${whereClause}
       ORDER BY cluster_type, created_at`,
      `SELECT COUNT(*) AS count FROM qr_debate_cluster ${whereClause}`,
      params,
      opts,
    );
  }

  async createDebateCluster(input: DebateClusterCreate): Promise<DebateCluster | null> {
    const id = typedId('QR');

    await execute(
      this.db,
      `INSERT INTO qr_debate_cluster
         (id, surah, title_en, title_ar, cluster_type, scope_description,
          arguments_json, summary_md, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah ?? null,
        input.title_en,
        input.title_ar ?? null,
        input.cluster_type ?? 'theological',
        input.scope_description ?? null,
        input.arguments_json ?? null,
        input.summary_md ?? null,
        input.note_md ?? null,
      ],
    );

    return queryOne<DebateCluster>(
      this.db,
      `SELECT id, surah, title_en, title_ar, cluster_type, scope_description,
              arguments_json, summary_md, note_md, created_at, updated_at
       FROM qr_debate_cluster WHERE id = ?`,
      [id],
    );
  }
}

// ─── CrossSurahRepo — Layer 9: Cross-surah + Comparative ─────────────────────
// Tables: qr_surah_relations, qr_quran_bil_quran_relations,
//         qr_tradition_sources, qr_comparative_claims, qr_civilizational_claims

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── Row shapes (aligned to 005_reception_and_projections.sql) ────────────────

export interface SurahRelation {
  id: string;
  surah_a: number;
  surah_b: number;
  relation_type: string;
  description: string | null;
  evidence_summary: string | null;
  note_md: string | null;
  created_at: string;
}

export interface SurahRelationCreate {
  surah_a: number;
  surah_b: number;
  relation_type: string;
  description?: string | null;
  evidence_summary?: string | null;
  note_md?: string | null;
}

export interface QbqRelation {
  id: string;
  from_surah: number;
  from_ayah: number;
  to_surah: number;
  to_ayah: number;
  relation_type: string;
  scholar_ref: string | null;
  note_md: string | null;
  created_at: string;
}

export interface QbqRelationCreate {
  from_surah: number;
  from_ayah: number;
  to_surah: number;
  to_ayah: number;
  relation_type: string;
  scholar_ref?: string | null;
  note_md?: string | null;
}

export interface TraditionSource {
  id: string;
  tradition_name: string;
  source_text: string;
  source_content: string | null;
  relevance_note: string | null;
  note_md: string | null;
  created_at: string;
}

export interface TraditionSourceCreate {
  tradition_name: string;
  source_text: string;
  source_content?: string | null;
  relevance_note?: string | null;
  note_md?: string | null;
}

export interface ComparativeClaim {
  id: string;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  tradition_source_id: string | null;
  claim_type: string;
  claim_text: string;
  evidence_ids_json: string | null;
  note_md: string | null;
  created_at: string;
}

export interface ComparativeClaimCreate {
  surah?: number | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  tradition_source_id?: string | null;
  claim_type?: string;
  claim_text: string;
  evidence_ids_json?: string | null;
  note_md?: string | null;
}

export interface CivilizationalClaim {
  id: string;
  surah: number | null;
  topic: string;
  claim_text: string;
  civilization_context: string | null;
  debate_cluster_id: string | null;
  note_md: string | null;
  created_at: string;
}

export interface CivilizationalClaimCreate {
  surah?: number | null;
  topic: string;
  claim_text: string;
  civilization_context?: string | null;
  debate_cluster_id?: string | null;
  note_md?: string | null;
}

// ─── Column SELECT constants ───────────────────────────────────────────────────

const SR_COLS = `
  id, surah_a, surah_b, relation_type, description,
  evidence_summary, note_md, created_at`;

const QBQ_COLS = `
  id, from_surah, from_ayah, to_surah, to_ayah,
  relation_type, scholar_ref, note_md, created_at`;

const TRAD_COLS = `
  id, tradition_name, source_text, source_content,
  relevance_note, note_md, created_at`;

const COMP_COLS = `
  id, surah, ayah_from, ayah_to, tradition_source_id,
  claim_type, claim_text, evidence_ids_json, note_md, created_at`;

const CIV_COLS = `
  id, surah, topic, claim_text, civilization_context,
  debate_cluster_id, note_md, created_at`;

// ─── CrossSurahRepo ───────────────────────────────────────────────────────────

export class CrossSurahRepo {
  constructor(private db: D1Database) {}

  // ── Surah Relations ─────────────────────────────────────────────────────────

  surahRelations(surahId: number, opts: PaginateOptions = {}) {
    return paginate<SurahRelation>(
      this.db,
      `SELECT ${SR_COLS}
       FROM qr_surah_relations
       WHERE surah_a = ? OR surah_b = ?
       ORDER BY surah_a, surah_b`,
      `SELECT COUNT(*) AS count
       FROM qr_surah_relations
       WHERE surah_a = ? OR surah_b = ?`,
      [surahId, surahId],
      opts,
    );
  }

  async createSurahRelation(input: SurahRelationCreate): Promise<SurahRelation> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_surah_relations
         (id, surah_a, surah_b, relation_type, description, evidence_summary, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah_a,
        input.surah_b,
        input.relation_type,
        input.description ?? null,
        input.evidence_summary ?? null,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<SurahRelation>(
      this.db,
      `SELECT ${SR_COLS} FROM qr_surah_relations WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Quran-bil-Quran Relations ───────────────────────────────────────────────

  qbqRelations(
    scopeRef: { surah: number; ayah?: number },
    opts: PaginateOptions = {},
  ) {
    const where: string[] = ['from_surah = ?'];
    const params: unknown[] = [scopeRef.surah];

    if (scopeRef.ayah !== undefined) {
      where.push('from_ayah = ?');
      params.push(scopeRef.ayah);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const base = `FROM qr_quran_bil_quran_relations ${whereClause}`;
    const order = `ORDER BY from_surah, from_ayah, to_surah, to_ayah`;

    return paginate<QbqRelation>(
      this.db,
      `SELECT ${QBQ_COLS} ${base} ${order}`,
      `SELECT COUNT(*) AS count ${base}`,
      params,
      opts,
    );
  }

  async createQbqRelation(input: QbqRelationCreate): Promise<QbqRelation> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_quran_bil_quran_relations
         (id, from_surah, from_ayah, to_surah, to_ayah,
          relation_type, scholar_ref, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.from_surah,
        input.from_ayah,
        input.to_surah,
        input.to_ayah,
        input.relation_type,
        input.scholar_ref ?? null,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<QbqRelation>(
      this.db,
      `SELECT ${QBQ_COLS} FROM qr_quran_bil_quran_relations WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Tradition Sources ───────────────────────────────────────────────────────

  traditionSources(tradRef?: string, opts: PaginateOptions = {}) {
    const where = tradRef !== undefined ? 'WHERE tradition_name = ?' : '';
    const params = tradRef !== undefined ? [tradRef] : [];
    const base = `FROM qr_tradition_sources ${where}`;
    const order = `ORDER BY tradition_name, source_text`;

    return paginate<TraditionSource>(
      this.db,
      `SELECT ${TRAD_COLS} ${base} ${order}`,
      `SELECT COUNT(*) AS count ${base}`,
      params,
      opts,
    );
  }

  findTradSourceById(id: string): Promise<TraditionSource | null> {
    return queryOne<TraditionSource>(
      this.db,
      `SELECT ${TRAD_COLS} FROM qr_tradition_sources WHERE id = ?`,
      [id],
    );
  }

  async createTradSource(input: TraditionSourceCreate): Promise<TraditionSource> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_tradition_sources
         (id, tradition_name, source_text, source_content, relevance_note, note_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.tradition_name,
        input.source_text,
        input.source_content ?? null,
        input.relevance_note ?? null,
        input.note_md ?? null,
      ],
    );
    return (await this.findTradSourceById(id))!;
  }

  // ── Comparative Claims ──────────────────────────────────────────────────────

  comparativeClaims(
    scopeRef?: { surah?: number },
    tradRef?: string,
    opts: PaginateOptions = {},
  ) {
    const where: string[] = [];
    const params: unknown[] = [];

    if (scopeRef?.surah !== undefined) {
      where.push('surah = ?');
      params.push(scopeRef.surah);
    }
    if (tradRef !== undefined) {
      where.push('tradition_source_id = ?');
      params.push(tradRef);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const base = `FROM qr_comparative_claims ${whereClause}`;
    const order = `ORDER BY surah, ayah_from, claim_type`;

    return paginate<ComparativeClaim>(
      this.db,
      `SELECT ${COMP_COLS} ${base} ${order}`,
      `SELECT COUNT(*) AS count ${base}`,
      params,
      opts,
    );
  }

  async createComparativeClaim(input: ComparativeClaimCreate): Promise<ComparativeClaim> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_comparative_claims
         (id, surah, ayah_from, ayah_to, tradition_source_id,
          claim_type, claim_text, evidence_ids_json, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah ?? null,
        input.ayah_from ?? null,
        input.ayah_to ?? null,
        input.tradition_source_id ?? null,
        input.claim_type ?? 'parallel',
        input.claim_text,
        input.evidence_ids_json ?? null,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<ComparativeClaim>(
      this.db,
      `SELECT ${COMP_COLS} FROM qr_comparative_claims WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Civilizational Claims ───────────────────────────────────────────────────

  civilizationalClaims(
    scopeRef?: { surah?: number },
    tradRef?: string,
    opts: PaginateOptions = {},
  ) {
    const where: string[] = [];
    const params: unknown[] = [];

    if (scopeRef?.surah !== undefined) {
      where.push('surah = ?');
      params.push(scopeRef.surah);
    }
    if (tradRef !== undefined) {
      where.push('topic = ?');
      params.push(tradRef);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const base = `FROM qr_civilizational_claims ${whereClause}`;
    const order = `ORDER BY surah, topic`;

    return paginate<CivilizationalClaim>(
      this.db,
      `SELECT ${CIV_COLS} ${base} ${order}`,
      `SELECT COUNT(*) AS count ${base}`,
      params,
      opts,
    );
  }

  async createCivilizationalClaim(input: CivilizationalClaimCreate): Promise<CivilizationalClaim> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_civilizational_claims
         (id, surah, topic, claim_text, civilization_context, debate_cluster_id, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah ?? null,
        input.topic,
        input.claim_text,
        input.civilization_context ?? null,
        input.debate_cluster_id ?? null,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<CivilizationalClaim>(
      this.db,
      `SELECT ${CIV_COLS} FROM qr_civilizational_claims WHERE id = ?`,
      [id],
    ))!;
  }
}

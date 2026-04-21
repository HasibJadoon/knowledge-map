// ─── ProjectionRepo — Layer 10: Projections + Bridges ────────────────────────
// Tables: qr_worldview_nodes, qr_worldview_edges, qr_diagram_specs,
//         qr_diagram_instances, qr_doc_links,
//         qr_surah_analysis_cache, qr_passage_analysis_cache

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── Row shapes (aligned to 005_reception_and_projections.sql) ────────────────

export interface WorldviewNode {
  id: string;
  surah: number | null;
  node_type: string;
  label_en: string;
  label_ar: string | null;
  summary_md: string | null;
  source_claim_id: string | null;
  wv_node_ref: string | null;
  created_at: string;
}

export interface WorldviewNodeCreate {
  surah?: number | null;
  node_type: string;
  label_en: string;
  label_ar?: string | null;
  summary_md?: string | null;
  source_claim_id?: string | null;
  wv_node_ref?: string | null;
}

export interface WorldviewEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: string;
  note_md: string | null;
  created_at: string;
}

export interface WorldviewEdgeCreate {
  from_node_id: string;
  to_node_id: string;
  relation_type: string;
  note_md?: string | null;
}

export interface DiagramSpec {
  id: string;
  spec_key: string;
  title: string;
  diagram_grammar: string;
  renderer_key: string;
  data_sources_json: string | null;
  description_md: string | null;
  created_at: string;
}

export interface DiagramSpecCreate {
  spec_key: string;
  title: string;
  diagram_grammar: string;
  renderer_key: string;
  data_sources_json?: string | null;
  description_md?: string | null;
}

export interface DiagramInstance {
  id: string;
  spec_id: string;
  scope_type: string;
  scope_ref: string;
  title: string | null;
  payload_json: string;
  generated_at: string;
  is_stale: number;
}

export interface DiagramInstanceCreate {
  spec_id: string;
  scope_type: string;
  scope_ref: string;
  title?: string | null;
  payload_json: string;
}

export interface DocLink {
  id: string;
  qr_scope_type: string;
  qr_scope_id: string;
  cm_doc_ref: string;
  link_type: string;
  note_md: string | null;
  created_at: string;
}

export interface DocLinkAdd {
  cm_doc_ref: string;
  link_type?: string;
  note_md?: string | null;
}

export interface SurahAnalysisCache {
  surah: number;
  cache_version: number;
  cache_generated_at: string | null;
  payload_json: string | null;
}

export interface PassageAnalysisCache {
  id: string;
  surah: number;
  passage_id: string;
  cache_version: number;
  cache_generated_at: string | null;
  payload_json: string | null;
}

// ─── Column SELECT constants ───────────────────────────────────────────────────

const WVN_COLS = `
  id, surah, node_type, label_en, label_ar, summary_md,
  source_claim_id, wv_node_ref, created_at`;

const WVE_COLS = `
  id, from_node_id, to_node_id, relation_type, note_md, created_at`;

const SPEC_COLS = `
  id, spec_key, title, diagram_grammar, renderer_key,
  data_sources_json, description_md, created_at`;

const INST_COLS = `
  id, spec_id, scope_type, scope_ref, title,
  payload_json, generated_at, is_stale`;

const DL_COLS = `
  id, qr_scope_type, qr_scope_id, cm_doc_ref,
  link_type, note_md, created_at`;

const SAC_COLS = `
  surah, cache_version, cache_generated_at, payload_json`;

const PAC_COLS = `
  id, surah, passage_id, cache_version, cache_generated_at, payload_json`;

// ─── ProjectionRepo ───────────────────────────────────────────────────────────

export class ProjectionRepo {
  constructor(private db: D1Database) {}

  // ── Worldview Nodes ─────────────────────────────────────────────────────────

  worldviewNodes(scopeRef?: { surah?: number }, opts: PaginateOptions = {}) {
    const where = scopeRef?.surah !== undefined ? 'WHERE surah = ?' : '';
    const params = scopeRef?.surah !== undefined ? [scopeRef.surah] : [];
    const base = `FROM qr_worldview_nodes ${where}`;
    const order = `ORDER BY node_type, label_en`;

    return paginate<WorldviewNode>(
      this.db,
      `SELECT ${WVN_COLS} ${base} ${order}`,
      `SELECT COUNT(*) AS count ${base}`,
      params,
      opts,
    );
  }

  findNodeById(id: string): Promise<WorldviewNode | null> {
    return queryOne<WorldviewNode>(
      this.db,
      `SELECT ${WVN_COLS} FROM qr_worldview_nodes WHERE id = ?`,
      [id],
    );
  }

  async createNode(input: WorldviewNodeCreate): Promise<WorldviewNode> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_worldview_nodes
         (id, surah, node_type, label_en, label_ar, summary_md,
          source_claim_id, wv_node_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.surah ?? null,
        input.node_type,
        input.label_en,
        input.label_ar ?? null,
        input.summary_md ?? null,
        input.source_claim_id ?? null,
        input.wv_node_ref ?? null,
      ],
    );
    return (await this.findNodeById(id))!;
  }

  // ── Worldview Edges ─────────────────────────────────────────────────────────

  worldviewEdges(fromNodeId?: string, toNodeId?: string, opts: PaginateOptions = {}) {
    const where: string[] = [];
    const params: unknown[] = [];

    if (fromNodeId !== undefined) {
      where.push('from_node_id = ?');
      params.push(fromNodeId);
    }
    if (toNodeId !== undefined) {
      where.push('to_node_id = ?');
      params.push(toNodeId);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const base = `FROM qr_worldview_edges ${whereClause}`;
    const order = `ORDER BY relation_type, created_at`;

    return paginate<WorldviewEdge>(
      this.db,
      `SELECT ${WVE_COLS} ${base} ${order}`,
      `SELECT COUNT(*) AS count ${base}`,
      params,
      opts,
    );
  }

  async createEdge(input: WorldviewEdgeCreate): Promise<WorldviewEdge> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_worldview_edges
         (id, from_node_id, to_node_id, relation_type, note_md)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        input.from_node_id,
        input.to_node_id,
        input.relation_type,
        input.note_md ?? null,
      ],
    );
    return (await queryOne<WorldviewEdge>(
      this.db,
      `SELECT ${WVE_COLS} FROM qr_worldview_edges WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Diagram Specs ───────────────────────────────────────────────────────────

  diagramSpecs(opts: PaginateOptions = {}) {
    return paginate<DiagramSpec>(
      this.db,
      `SELECT ${SPEC_COLS} FROM qr_diagram_specs ORDER BY diagram_grammar, title`,
      `SELECT COUNT(*) AS count FROM qr_diagram_specs`,
      [],
      opts,
    );
  }

  findSpecById(id: string): Promise<DiagramSpec | null> {
    return queryOne<DiagramSpec>(
      this.db,
      `SELECT ${SPEC_COLS} FROM qr_diagram_specs WHERE id = ?`,
      [id],
    );
  }

  findSpecByKey(specKey: string): Promise<DiagramSpec | null> {
    return queryOne<DiagramSpec>(
      this.db,
      `SELECT ${SPEC_COLS} FROM qr_diagram_specs WHERE spec_key = ?`,
      [specKey],
    );
  }

  async createSpec(input: DiagramSpecCreate): Promise<DiagramSpec> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_diagram_specs
         (id, spec_key, title, diagram_grammar, renderer_key,
          data_sources_json, description_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.spec_key,
        input.title,
        input.diagram_grammar,
        input.renderer_key,
        input.data_sources_json ?? null,
        input.description_md ?? null,
      ],
    );
    return (await this.findSpecById(id))!;
  }

  // ── Diagram Instances ───────────────────────────────────────────────────────

  diagramInstances(specId: string, opts: PaginateOptions = {}) {
    return paginate<DiagramInstance>(
      this.db,
      `SELECT ${INST_COLS}
       FROM qr_diagram_instances
       WHERE spec_id = ?
       ORDER BY generated_at DESC`,
      `SELECT COUNT(*) AS count FROM qr_diagram_instances WHERE spec_id = ?`,
      [specId],
      opts,
    );
  }

  async createInstance(input: DiagramInstanceCreate): Promise<DiagramInstance> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_diagram_instances
         (id, spec_id, scope_type, scope_ref, title, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.spec_id,
        input.scope_type,
        input.scope_ref,
        input.title ?? null,
        input.payload_json,
      ],
    );
    return (await queryOne<DiagramInstance>(
      this.db,
      `SELECT ${INST_COLS} FROM qr_diagram_instances WHERE id = ?`,
      [id],
    ))!;
  }

  async markInstanceStale(id: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE qr_diagram_instances SET is_stale = 1 WHERE id = ?`,
      [id],
    );
  }

  // ── Doc Links ───────────────────────────────────────────────────────────────

  docLinks(
    qrScopeType: string,
    qrScopeId: string,
  ): Promise<DocLink[]> {
    return query<DocLink>(
      this.db,
      `SELECT ${DL_COLS}
       FROM qr_doc_links
       WHERE qr_scope_type = ? AND qr_scope_id = ?
       ORDER BY link_type, created_at`,
      [qrScopeType, qrScopeId],
    );
  }

  async addDocLink(
    qrScopeType: string,
    qrScopeId: string,
    input: DocLinkAdd,
  ): Promise<DocLink> {
    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_doc_links
         (id, qr_scope_type, qr_scope_id, cm_doc_ref, link_type, note_md)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        qrScopeType,
        qrScopeId,
        input.cm_doc_ref,
        input.link_type ?? 'discusses',
        input.note_md ?? null,
      ],
    );
    return (await queryOne<DocLink>(
      this.db,
      `SELECT ${DL_COLS} FROM qr_doc_links WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Surah Analysis Cache ────────────────────────────────────────────────────

  surahCache(surahId: number): Promise<SurahAnalysisCache | null> {
    return queryOne<SurahAnalysisCache>(
      this.db,
      `SELECT ${SAC_COLS} FROM qr_surah_analysis_cache WHERE surah = ?`,
      [surahId],
    );
  }

  async setSurahCache(surahId: number, payloadJson: string): Promise<SurahAnalysisCache> {
    const existing = await queryOne<{ surah: number }>(
      this.db,
      `SELECT surah FROM qr_surah_analysis_cache WHERE surah = ?`,
      [surahId],
    );

    if (existing) {
      await execute(
        this.db,
        `UPDATE qr_surah_analysis_cache SET
           cache_version = cache_version + 1,
           cache_generated_at = datetime('now'),
           payload_json = ?
         WHERE surah = ?`,
        [payloadJson, surahId],
      );
    } else {
      await execute(
        this.db,
        `INSERT INTO qr_surah_analysis_cache
           (surah, cache_version, cache_generated_at, payload_json)
         VALUES (?, 1, datetime('now'), ?)`,
        [surahId, payloadJson],
      );
    }

    return (await this.surahCache(surahId))!;
  }

  // ── Passage Analysis Cache ──────────────────────────────────────────────────

  passageCache(passageId: string): Promise<PassageAnalysisCache | null> {
    return queryOne<PassageAnalysisCache>(
      this.db,
      `SELECT ${PAC_COLS} FROM qr_passage_analysis_cache WHERE passage_id = ?`,
      [passageId],
    );
  }

  passageCachesBySurah(surahId: number): Promise<PassageAnalysisCache[]> {
    return query<PassageAnalysisCache>(
      this.db,
      `SELECT ${PAC_COLS}
       FROM qr_passage_analysis_cache
       WHERE surah = ?
       ORDER BY passage_id`,
      [surahId],
    );
  }

  async setPassageCache(
    surahId: number,
    passageId: string,
    payloadJson: string,
  ): Promise<PassageAnalysisCache> {
    const existing = await queryOne<{ id: string }>(
      this.db,
      `SELECT id FROM qr_passage_analysis_cache WHERE passage_id = ?`,
      [passageId],
    );

    if (existing) {
      await execute(
        this.db,
        `UPDATE qr_passage_analysis_cache SET
           cache_version = cache_version + 1,
           cache_generated_at = datetime('now'),
           payload_json = ?
         WHERE id = ?`,
        [payloadJson, existing.id],
      );
      return (await this.passageCache(passageId))!;
    }

    const id = typedId('QR');
    await execute(
      this.db,
      `INSERT INTO qr_passage_analysis_cache
         (id, surah, passage_id, cache_version, cache_generated_at, payload_json)
       VALUES (?, ?, ?, 1, datetime('now'), ?)`,
      [id, surahId, passageId, payloadJson],
    );
    return (await this.passageCache(passageId))!;
  }
}

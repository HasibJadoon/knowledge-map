// ─── BridgeRepo — LB + L10 doc_links cross-module bridge tables ───────────────
// LB:  wv_node_quran_links, wv_term_links, wv_episode_quran_links,
//      wv_evidence_scope_links
// L10: wv_doc_links
//
// All cross-module refs use typed string IDs (MODULE:ULID) — no SQL FK.

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface WvNodeQuranLink {
  id: string;
  node_id: string;
  qr_scope_ref: string;   // 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  link_type: string;
  note: string | null;
  created_at: string;
}

export interface WvTermLink {
  id: string;
  entity_type: string;    // 'node'|'claim'|'moral_axis'|'topic'|'virtue'|'other'
  entity_id: string;
  al_concept_ref: string; // 'AL:<lemma_id>'
  link_type: string;
  note: string | null;
  created_at: string;
}

export interface WvEpisodeQuranLink {
  id: string;
  episode_id: string;
  qr_scope_ref: string;   // 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  link_type: string;
  note: string | null;
  created_at: string;
}

export interface WvEvidenceScopeLink {
  id: string;
  evidence_id: string;
  scope_module: string;   // 'QR'|'AL'|'AR'|'CM'|'PL'
  scope_ref: string;      // typed ref
  link_role: string;
  created_at: string;
}

export interface WvDocLink {
  id: string;
  entity_type: string;
  entity_id: string;
  cm_doc_ref: string;     // 'CM:<doc_id>'
  link_role: string;
  note: string | null;
  created_at: string;
}

// ─── Create input types ────────────────────────────────────────────────────────

export interface NodeQuranLinkCreate {
  node_id: string;
  qr_scope_ref: string;
  link_type: string;
  note?: string | null;
}

export interface TermLinkCreate {
  entity_type: string;
  entity_id: string;
  al_concept_ref: string;
  link_type: string;
  note?: string | null;
}

export interface EpisodeQuranLinkCreate {
  episode_id: string;
  qr_scope_ref: string;
  link_type: string;
  note?: string | null;
}

export interface EvidenceScopeLinkCreate {
  evidence_id: string;
  scope_module: string;
  scope_ref: string;
  link_role?: string;
}

export interface DocLinkCreate {
  entity_type: string;
  entity_id: string;
  cm_doc_ref: string;
  link_role?: string;
  note?: string | null;
}

// ─── Column lists ──────────────────────────────────────────────────────────────

const NQL_COLS = `id, node_id, qr_scope_ref, link_type, note, created_at`;
const TL_COLS  = `id, entity_type, entity_id, al_concept_ref, link_type, note, created_at`;
const EQL_COLS = `id, episode_id, qr_scope_ref, link_type, note, created_at`;
const ESL_COLS = `id, evidence_id, scope_module, scope_ref, link_role, created_at`;
const DL_COLS  = `id, entity_type, entity_id, cm_doc_ref, link_role, note, created_at`;

// ═══════════════════════════════════════════════════════════════════════════════
// BridgeRepo
// ═══════════════════════════════════════════════════════════════════════════════

export class BridgeRepo {
  constructor(private db: D1Database) {}

  // ── LB: Node ↔ Quran Links ─────────────────────────────────────────────────

  nodeQuranLinks(nodeId: string): Promise<WvNodeQuranLink[]> {
    return query<WvNodeQuranLink>(
      this.db,
      `SELECT ${NQL_COLS} FROM wv_node_quran_links WHERE node_id = ? ORDER BY qr_scope_ref`,
      [nodeId],
    );
  }

  nodeQuranLinksByScope(qrScopeRef: string): Promise<WvNodeQuranLink[]> {
    return query<WvNodeQuranLink>(
      this.db,
      `SELECT ${NQL_COLS} FROM wv_node_quran_links WHERE qr_scope_ref = ? ORDER BY link_type`,
      [qrScopeRef],
    );
  }

  findNodeQuranLinkById(id: string): Promise<WvNodeQuranLink | null> {
    return queryOne<WvNodeQuranLink>(
      this.db, `SELECT ${NQL_COLS} FROM wv_node_quran_links WHERE id = ?`, [id],
    );
  }

  async addNodeQuranLink(input: NodeQuranLinkCreate): Promise<WvNodeQuranLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_node_quran_links (id, node_id, qr_scope_ref, link_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.node_id, input.qr_scope_ref, input.link_type,
       input.note ?? null, now],
    );
    return (await this.findNodeQuranLinkById(id))!;
  }

  async removeNodeQuranLink(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_node_quran_links WHERE id = ?`, [id]);
  }

  // ── LB: WV ↔ Arabic Linguistic Term Links ─────────────────────────────────

  termLinks(entityType: string, entityId: string): Promise<WvTermLink[]> {
    return query<WvTermLink>(
      this.db,
      `SELECT ${TL_COLS} FROM wv_term_links WHERE entity_type = ? AND entity_id = ? ORDER BY link_type`,
      [entityType, entityId],
    );
  }

  termLinksByAlRef(alConceptRef: string): Promise<WvTermLink[]> {
    return query<WvTermLink>(
      this.db,
      `SELECT ${TL_COLS} FROM wv_term_links WHERE al_concept_ref = ? ORDER BY entity_type`,
      [alConceptRef],
    );
  }

  findTermLinkById(id: string): Promise<WvTermLink | null> {
    return queryOne<WvTermLink>(
      this.db, `SELECT ${TL_COLS} FROM wv_term_links WHERE id = ?`, [id],
    );
  }

  async addTermLink(input: TermLinkCreate): Promise<WvTermLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_term_links
         (id, entity_type, entity_id, al_concept_ref, link_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.entity_type, input.entity_id, input.al_concept_ref,
       input.link_type, input.note ?? null, now],
    );
    return (await this.findTermLinkById(id))!;
  }

  async removeTermLink(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_term_links WHERE id = ?`, [id]);
  }

  // ── LB: Prophetic Episode ↔ QR Scope ──────────────────────────────────────

  episodeQuranLinks(episodeId: string): Promise<WvEpisodeQuranLink[]> {
    return query<WvEpisodeQuranLink>(
      this.db,
      `SELECT ${EQL_COLS} FROM wv_episode_quran_links WHERE episode_id = ? ORDER BY qr_scope_ref`,
      [episodeId],
    );
  }

  episodeQuranLinksByScope(qrScopeRef: string): Promise<WvEpisodeQuranLink[]> {
    return query<WvEpisodeQuranLink>(
      this.db,
      `SELECT ${EQL_COLS} FROM wv_episode_quran_links WHERE qr_scope_ref = ? ORDER BY link_type`,
      [qrScopeRef],
    );
  }

  findEpisodeQuranLinkById(id: string): Promise<WvEpisodeQuranLink | null> {
    return queryOne<WvEpisodeQuranLink>(
      this.db, `SELECT ${EQL_COLS} FROM wv_episode_quran_links WHERE id = ?`, [id],
    );
  }

  async addEpisodeQuranLink(input: EpisodeQuranLinkCreate): Promise<WvEpisodeQuranLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_episode_quran_links
         (id, episode_id, qr_scope_ref, link_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.episode_id, input.qr_scope_ref, input.link_type,
       input.note ?? null, now],
    );
    return (await this.findEpisodeQuranLinkById(id))!;
  }

  async removeEpisodeQuranLink(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_episode_quran_links WHERE id = ?`, [id]);
  }

  // ── LB: Evidence Items ↔ QR / AL / CM Scope ───────────────────────────────

  evidenceScopeLinks(evidenceId: string): Promise<WvEvidenceScopeLink[]> {
    return query<WvEvidenceScopeLink>(
      this.db,
      `SELECT ${ESL_COLS} FROM wv_evidence_scope_links WHERE evidence_id = ? ORDER BY scope_module`,
      [evidenceId],
    );
  }

  evidenceScopeLinksByRef(scopeRef: string): Promise<WvEvidenceScopeLink[]> {
    return query<WvEvidenceScopeLink>(
      this.db,
      `SELECT ${ESL_COLS} FROM wv_evidence_scope_links WHERE scope_ref = ?`,
      [scopeRef],
    );
  }

  findEvidenceScopeLinkById(id: string): Promise<WvEvidenceScopeLink | null> {
    return queryOne<WvEvidenceScopeLink>(
      this.db, `SELECT ${ESL_COLS} FROM wv_evidence_scope_links WHERE id = ?`, [id],
    );
  }

  async addEvidenceScopeLink(input: EvidenceScopeLinkCreate): Promise<WvEvidenceScopeLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT OR IGNORE INTO wv_evidence_scope_links
         (id, evidence_id, scope_module, scope_ref, link_role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.evidence_id, input.scope_module, input.scope_ref,
       input.link_role ?? 'reference', now],
    );
    return (await queryOne<WvEvidenceScopeLink>(
      this.db,
      `SELECT ${ESL_COLS} FROM wv_evidence_scope_links WHERE evidence_id = ? AND scope_ref = ?`,
      [input.evidence_id, input.scope_ref],
    ))!;
  }

  async removeEvidenceScopeLink(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_evidence_scope_links WHERE id = ?`, [id]);
  }

  // ── L10 / LB: Doc Links ────────────────────────────────────────────────────

  docLinks(entityType: string, entityId: string): Promise<WvDocLink[]> {
    return query<WvDocLink>(
      this.db,
      `SELECT ${DL_COLS} FROM wv_doc_links WHERE entity_type = ? AND entity_id = ? ORDER BY link_role`,
      [entityType, entityId],
    );
  }

  docLinksByCmRef(cmDocRef: string): Promise<WvDocLink[]> {
    return query<WvDocLink>(
      this.db,
      `SELECT ${DL_COLS} FROM wv_doc_links WHERE cm_doc_ref = ? ORDER BY entity_type`,
      [cmDocRef],
    );
  }

  findDocLinkById(id: string): Promise<WvDocLink | null> {
    return queryOne<WvDocLink>(
      this.db, `SELECT ${DL_COLS} FROM wv_doc_links WHERE id = ?`, [id],
    );
  }

  async addDocLink(input: DocLinkCreate): Promise<WvDocLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_doc_links
         (id, entity_type, entity_id, cm_doc_ref, link_role, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.entity_type, input.entity_id, input.cm_doc_ref,
       input.link_role ?? 'related', input.note ?? null, now],
    );
    return (await this.findDocLinkById(id))!;
  }

  async removeDocLink(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_doc_links WHERE id = ?`, [id]);
  }
}

// ─── TopicRepo — L4 structured reasoning ─────────────────────────────────────
// Covers: wv_topics, wv_claims, wv_claim_types, wv_arguments,
//         wv_argument_relations, wv_evidence_items, wv_claim_evidence_links,
//         wv_questions, wv_debate_clusters, wv_debate_cluster_members,
//         wv_value_positions
// Canonical columns per 001_wv_schema.sql §4.1-§4.10

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WvTopic {
  id: string;               // WV:ULID
  topic_key: string;
  title: string;
  title_ar: string | null;
  topic_domain: string;     // theology|ethics|anthropology|eschatology|prophethood|law|cosmology|psychology|sociology|history|worldview|modernity|coloniality|discernment|other
  parent_id: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  description_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvClaim {
  id: string;
  title: string;
  claim_text: string;
  claim_type: string;       // doctrinal|historical|moral|sociological|civilizational|comparative|theological|interpretive|other
  topic_id: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  person_id: string | null;
  school_id: string | null;
  certainty_level: string;  // assertion|position|hypothesis|question|consensus|contested
  status: string;           // active|...
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvClaimType {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface WvArgument {
  id: string;
  title: string;
  argument_text: string;
  argument_type: string;    // deductive|inductive|abductive|analogical|historical|moral|other
  topic_id: string | null;
  tradition_id: string | null;
  person_id: string | null;
  school_id: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvArgumentRelation {
  id: string;
  from_arg_id: string;
  to_arg_id: string | null;
  to_claim_id: string | null;
  relation_type: string;    // supports|contradicts|reframes|qualifies|synthesizes|inherits|answers|presupposes|other
  note: string | null;
  created_at: string;
}

export interface WvEvidenceItem {
  id: string;
  title: string | null;
  evidence_type: string;    // scriptural|historical|archaeological|testimonial|logical|statistical|comparative|traditional|other
  source_id: string | null;
  source_unit_id: string | null;
  locator: string | null;
  excerpt: string | null;
  qr_scope_ref: string | null;  // 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  al_concept_ref: string | null; // 'AL:<lemma_id>'
  cm_doc_ref: string | null;    // 'CM:<doc_id>'
  meta_json: string | null;
  created_at: string;
}

export interface WvClaimEvidenceLink {
  id: string;
  claim_id: string;
  evidence_id: string;
  link_role: string;        // supports|questions|illustrates|cites|counters|contextualizes
  note: string | null;
  created_at: string;
}

export interface WvQuestion {
  id: string;
  question_text: string;
  question_type: string;    // open|comparative|unresolved_tension|research_gap|polemical|other
  topic_id: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  status: string;           // open|partially_answered|closed
  meta_json: string | null;
  created_at: string;
}

export interface WvDebateCluster {
  id: string;
  slug: string;
  title: string;
  description_md: string | null;
  topic_id: string | null;
  moral_axis_id: string | null;
  status: string;           // active|...
  created_at: string;
}

export interface WvDebateClusterMember {
  id: string;
  cluster_id: string;
  entity_type: string;      // claim|argument|question|value_position
  entity_id: string;
  stance: string | null;    // supporting|opposing|neutral|moderating
  created_at: string;
}

export interface WvValuePosition {
  id: string;
  moral_axis_id: string;
  tradition_id: string | null;
  school_id: string | null;
  person_id: string | null;
  position_title: string;
  position_text: string;
  position_type: string;    // normative|descriptive|critical|revisionist|comparative
  evidence_refs: string | null; // JSON [evidence_item_id]
  meta_json: string | null;
  created_at: string;
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface TopicCreate {
  topic_key: string;
  title: string;
  title_ar?: string | null;
  topic_domain?: string;
  parent_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  description_md?: string | null;
}

export interface TopicPatch {
  title?: string;
  title_ar?: string | null;
  topic_domain?: string;
  parent_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  description_md?: string | null;
}

export interface ClaimCreate {
  title: string;
  claim_text: string;
  claim_type?: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  person_id?: string | null;
  school_id?: string | null;
  certainty_level?: string;
  status?: string;
  meta_json?: string | null;
}

export interface ClaimPatch {
  title?: string;
  claim_text?: string;
  claim_type?: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  person_id?: string | null;
  school_id?: string | null;
  certainty_level?: string;
  status?: string;
  meta_json?: string | null;
}

export interface ClaimTypeCreate {
  slug: string;
  title: string;
  description?: string | null;
}

export interface ArgumentCreate {
  title: string;
  argument_text: string;
  argument_type?: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  person_id?: string | null;
  school_id?: string | null;
  meta_json?: string | null;
}

export interface ArgumentRelationCreate {
  from_arg_id: string;
  to_arg_id?: string | null;
  to_claim_id?: string | null;
  relation_type?: string;
  note?: string | null;
}

export interface EvidenceCreate {
  title?: string | null;
  evidence_type?: string;
  source_id?: string | null;
  source_unit_id?: string | null;
  locator?: string | null;
  excerpt?: string | null;
  qr_scope_ref?: string | null;
  al_concept_ref?: string | null;
  cm_doc_ref?: string | null;
  meta_json?: string | null;
}

export interface ClaimEvidenceLinkCreate {
  claim_id: string;
  evidence_id: string;
  link_role?: string;
  note?: string | null;
}

export interface QuestionCreate {
  question_text: string;
  question_type?: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  status?: string;
  meta_json?: string | null;
}

export interface DebateClusterCreate {
  slug: string;
  title: string;
  description_md?: string | null;
  topic_id?: string | null;
  moral_axis_id?: string | null;
  status?: string;
}

export interface DebateClusterMemberCreate {
  cluster_id: string;
  entity_type: string;
  entity_id: string;
  stance?: string | null;
}

export interface ValuePositionCreate {
  moral_axis_id: string;
  position_title: string;
  position_text: string;
  tradition_id?: string | null;
  school_id?: string | null;
  person_id?: string | null;
  position_type?: string;
  evidence_refs?: string | null;
  meta_json?: string | null;
}

// ── Column lists ─────────────────────────────────────────────────────────────

const TOPIC_COLS =
  `id, topic_key, title, title_ar, topic_domain, parent_id, tradition_id, ` +
  `moral_axis_id, description_md, created_at, updated_at`;

const CLAIM_COLS =
  `id, title, claim_text, claim_type, topic_id, tradition_id, moral_axis_id, ` +
  `person_id, school_id, certainty_level, status, meta_json, created_at, updated_at`;

const CLAIM_TYPE_COLS =
  `id, slug, title, description, created_at`;

const ARG_COLS =
  `id, title, argument_text, argument_type, topic_id, tradition_id, ` +
  `person_id, school_id, meta_json, created_at`;

const ARG_REL_COLS =
  `id, from_arg_id, to_arg_id, to_claim_id, relation_type, note, created_at`;

const EVD_COLS =
  `id, title, evidence_type, source_id, source_unit_id, locator, excerpt, ` +
  `qr_scope_ref, al_concept_ref, cm_doc_ref, meta_json, created_at`;

const CEL_COLS =
  `id, claim_id, evidence_id, link_role, note, created_at`;

const Q_COLS =
  `id, question_text, question_type, topic_id, tradition_id, moral_axis_id, ` +
  `status, meta_json, created_at`;

const DC_COLS =
  `id, slug, title, description_md, topic_id, moral_axis_id, status, created_at`;

const DCM_COLS =
  `id, cluster_id, entity_type, entity_id, stance, created_at`;

const VP_COLS =
  `id, moral_axis_id, tradition_id, school_id, person_id, position_title, ` +
  `position_text, position_type, evidence_refs, meta_json, created_at`;

// ── Repo ─────────────────────────────────────────────────────────────────────

export class TopicRepo {
  constructor(private db: D1Database) {}

  // ── wv_topics ──────────────────────────────────────────────────────────────

  listTopics(opts: {
    topic_domain?: string | null;
    tradition_id?: string | null;
    parent_id?: string | null;
  } & PaginateOptions = {}) {
    const { topic_domain, tradition_id, parent_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (topic_domain)  { conds.push('topic_domain = ?');  params.push(topic_domain); }
    if (tradition_id)  { conds.push('tradition_id = ?');  params.push(tradition_id); }
    if (parent_id !== undefined) {
      if (parent_id === null) {
        conds.push('parent_id IS NULL');
      } else {
        conds.push('parent_id = ?');
        params.push(parent_id);
      }
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvTopic>(
      this.db,
      `SELECT ${TOPIC_COLS} FROM wv_topics ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_topics ${where}`,
      params, opts,
    );
  }

  findTopicById(id: string): Promise<WvTopic | null> {
    return queryOne<WvTopic>(
      this.db, `SELECT ${TOPIC_COLS} FROM wv_topics WHERE id = ?`, [id],
    );
  }

  findTopicByKey(key: string): Promise<WvTopic | null> {
    return queryOne<WvTopic>(
      this.db, `SELECT ${TOPIC_COLS} FROM wv_topics WHERE topic_key = ?`, [key],
    );
  }

  async createTopic(input: TopicCreate): Promise<WvTopic> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_topics
         (id, topic_key, title, title_ar, topic_domain, parent_id, tradition_id,
          moral_axis_id, description_md, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.topic_key,
        input.title,
        input.title_ar ?? null,
        input.topic_domain ?? 'theology',
        input.parent_id ?? null,
        input.tradition_id ?? null,
        input.moral_axis_id ?? null,
        input.description_md ?? null,
        now, now,
      ],
    );
    return (await this.findTopicById(id))!;
  }

  async patchTopic(id: string, patch: TopicPatch): Promise<WvTopic | null> {
    const now  = new Date().toISOString();
    const sets: string[]   = ['updated_at = ?'];
    const vals: unknown[]  = [now];

    const MAP: [keyof TopicPatch, string][] = [
      ['title',          'title = ?'],
      ['title_ar',       'title_ar = ?'],
      ['topic_domain',   'topic_domain = ?'],
      ['parent_id',      'parent_id = ?'],
      ['tradition_id',   'tradition_id = ?'],
      ['moral_axis_id',  'moral_axis_id = ?'],
      ['description_md', 'description_md = ?'],
    ];
    for (const [key, sql] of MAP) {
      if (key in patch) { sets.push(sql); vals.push(patch[key] ?? null); }
    }
    vals.push(id);
    await execute(this.db, `UPDATE wv_topics SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findTopicById(id);
  }

  // ── wv_claims ──────────────────────────────────────────────────────────────

  listClaims(opts: {
    topic_id?: string | null;
    tradition_id?: string | null;
    claim_type?: string | null;
    person_id?: string | null;
  } & PaginateOptions = {}) {
    const { topic_id, tradition_id, claim_type, person_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (topic_id)     { conds.push('topic_id = ?');     params.push(topic_id); }
    if (tradition_id) { conds.push('tradition_id = ?'); params.push(tradition_id); }
    if (claim_type)   { conds.push('claim_type = ?');   params.push(claim_type); }
    if (person_id)    { conds.push('person_id = ?');    params.push(person_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvClaim>(
      this.db,
      `SELECT ${CLAIM_COLS} FROM wv_claims ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_claims ${where}`,
      params, opts,
    );
  }

  findClaimById(id: string): Promise<WvClaim | null> {
    return queryOne<WvClaim>(
      this.db, `SELECT ${CLAIM_COLS} FROM wv_claims WHERE id = ?`, [id],
    );
  }

  async createClaim(input: ClaimCreate): Promise<WvClaim> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_claims
         (id, title, claim_text, claim_type, topic_id, tradition_id, moral_axis_id,
          person_id, school_id, certainty_level, status, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.claim_text,
        input.claim_type ?? 'doctrinal',
        input.topic_id ?? null,
        input.tradition_id ?? null,
        input.moral_axis_id ?? null,
        input.person_id ?? null,
        input.school_id ?? null,
        input.certainty_level ?? 'position',
        input.status ?? 'active',
        input.meta_json ?? null,
        now, now,
      ],
    );
    return (await this.findClaimById(id))!;
  }

  async patchClaim(id: string, patch: ClaimPatch): Promise<WvClaim | null> {
    const now  = new Date().toISOString();
    const sets: string[]   = ['updated_at = ?'];
    const vals: unknown[]  = [now];

    const MAP: [keyof ClaimPatch, string][] = [
      ['title',           'title = ?'],
      ['claim_text',      'claim_text = ?'],
      ['claim_type',      'claim_type = ?'],
      ['topic_id',        'topic_id = ?'],
      ['tradition_id',    'tradition_id = ?'],
      ['moral_axis_id',   'moral_axis_id = ?'],
      ['person_id',       'person_id = ?'],
      ['school_id',       'school_id = ?'],
      ['certainty_level', 'certainty_level = ?'],
      ['status',          'status = ?'],
      ['meta_json',       'meta_json = ?'],
    ];
    for (const [key, sql] of MAP) {
      if (key in patch) { sets.push(sql); vals.push(patch[key] ?? null); }
    }
    vals.push(id);
    await execute(this.db, `UPDATE wv_claims SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findClaimById(id);
  }

  // ── wv_claim_types ─────────────────────────────────────────────────────────

  listClaimTypes(opts: PaginateOptions = {}) {
    return paginate<WvClaimType>(
      this.db,
      `SELECT ${CLAIM_TYPE_COLS} FROM wv_claim_types ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_claim_types`,
      [], opts,
    );
  }

  findClaimTypeById(id: string): Promise<WvClaimType | null> {
    return queryOne<WvClaimType>(
      this.db, `SELECT ${CLAIM_TYPE_COLS} FROM wv_claim_types WHERE id = ?`, [id],
    );
  }

  async createClaimType(input: ClaimTypeCreate): Promise<WvClaimType> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_claim_types (id, slug, title, description, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.description ?? null, now],
    );
    return (await this.findClaimTypeById(id))!;
  }

  // ── wv_arguments ───────────────────────────────────────────────────────────

  listArguments(opts: {
    topic_id?: string | null;
    tradition_id?: string | null;
  } & PaginateOptions = {}) {
    const { topic_id, tradition_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (topic_id)     { conds.push('topic_id = ?');     params.push(topic_id); }
    if (tradition_id) { conds.push('tradition_id = ?'); params.push(tradition_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvArgument>(
      this.db,
      `SELECT ${ARG_COLS} FROM wv_arguments ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_arguments ${where}`,
      params, opts,
    );
  }

  findArgumentById(id: string): Promise<WvArgument | null> {
    return queryOne<WvArgument>(
      this.db, `SELECT ${ARG_COLS} FROM wv_arguments WHERE id = ?`, [id],
    );
  }

  async createArgument(input: ArgumentCreate): Promise<WvArgument> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_arguments
         (id, title, argument_text, argument_type, topic_id, tradition_id,
          person_id, school_id, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.argument_text,
        input.argument_type ?? 'deductive',
        input.topic_id ?? null,
        input.tradition_id ?? null,
        input.person_id ?? null,
        input.school_id ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findArgumentById(id))!;
  }

  // ── wv_argument_relations ──────────────────────────────────────────────────

  argRelations(argId: string): Promise<WvArgumentRelation[]> {
    return query<WvArgumentRelation>(
      this.db,
      `SELECT ${ARG_REL_COLS} FROM wv_argument_relations WHERE from_arg_id = ? ORDER BY relation_type`,
      [argId],
    );
  }

  findArgRelationById(id: string): Promise<WvArgumentRelation | null> {
    return queryOne<WvArgumentRelation>(
      this.db, `SELECT ${ARG_REL_COLS} FROM wv_argument_relations WHERE id = ?`, [id],
    );
  }

  async addArgRelation(input: ArgumentRelationCreate): Promise<WvArgumentRelation> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_argument_relations
         (id, from_arg_id, to_arg_id, to_claim_id, relation_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.from_arg_id,
        input.to_arg_id ?? null,
        input.to_claim_id ?? null,
        input.relation_type ?? 'supports',
        input.note ?? null,
        now,
      ],
    );
    return (await this.findArgRelationById(id))!;
  }

  async removeArgRelation(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_argument_relations WHERE id = ?`, [id]);
  }

  // ── wv_evidence_items ──────────────────────────────────────────────────────

  listEvidence(opts: {
    evidence_type?: string | null;
    source_id?: string | null;
  } & PaginateOptions = {}) {
    const { evidence_type, source_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (evidence_type) { conds.push('evidence_type = ?'); params.push(evidence_type); }
    if (source_id)     { conds.push('source_id = ?');     params.push(source_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvEvidenceItem>(
      this.db,
      `SELECT ${EVD_COLS} FROM wv_evidence_items ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM wv_evidence_items ${where}`,
      params, opts,
    );
  }

  claimEvidence(claimId: string): Promise<WvEvidenceItem[]> {
    return query<WvEvidenceItem>(
      this.db,
      `SELECT e.${EVD_COLS.replace(/,\s*/g, ', e.')}
       FROM wv_evidence_items e
       JOIN wv_claim_evidence_links cel ON cel.evidence_id = e.id
       WHERE cel.claim_id = ?
       ORDER BY cel.link_role, e.evidence_type`,
      [claimId],
    );
  }

  findEvidenceById(id: string): Promise<WvEvidenceItem | null> {
    return queryOne<WvEvidenceItem>(
      this.db, `SELECT ${EVD_COLS} FROM wv_evidence_items WHERE id = ?`, [id],
    );
  }

  async addEvidence(input: EvidenceCreate): Promise<WvEvidenceItem> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_evidence_items
         (id, title, evidence_type, source_id, source_unit_id, locator, excerpt,
          qr_scope_ref, al_concept_ref, cm_doc_ref, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title ?? null,
        input.evidence_type ?? 'scriptural',
        input.source_id ?? null,
        input.source_unit_id ?? null,
        input.locator ?? null,
        input.excerpt ?? null,
        input.qr_scope_ref ?? null,
        input.al_concept_ref ?? null,
        input.cm_doc_ref ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findEvidenceById(id))!;
  }

  async removeEvidence(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_evidence_items WHERE id = ?`, [id]);
  }

  // ── wv_claim_evidence_links ────────────────────────────────────────────────

  claimEvidenceLinks(claimId: string): Promise<WvClaimEvidenceLink[]> {
    return query<WvClaimEvidenceLink>(
      this.db,
      `SELECT ${CEL_COLS} FROM wv_claim_evidence_links WHERE claim_id = ? ORDER BY link_role`,
      [claimId],
    );
  }

  findClaimEvidenceLinkById(id: string): Promise<WvClaimEvidenceLink | null> {
    return queryOne<WvClaimEvidenceLink>(
      this.db, `SELECT ${CEL_COLS} FROM wv_claim_evidence_links WHERE id = ?`, [id],
    );
  }

  async linkEvidenceToClaim(input: ClaimEvidenceLinkCreate): Promise<WvClaimEvidenceLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT OR IGNORE INTO wv_claim_evidence_links
         (id, claim_id, evidence_id, link_role, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.claim_id,
        input.evidence_id,
        input.link_role ?? 'supports',
        input.note ?? null,
        now,
      ],
    );
    return (await queryOne<WvClaimEvidenceLink>(
      this.db,
      `SELECT ${CEL_COLS} FROM wv_claim_evidence_links
       WHERE claim_id = ? AND evidence_id = ? AND link_role = ?`,
      [input.claim_id, input.evidence_id, input.link_role ?? 'supports'],
    ))!;
  }

  async unlinkEvidenceFromClaim(linkId: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_claim_evidence_links WHERE id = ?`, [linkId]);
  }

  // ── wv_questions ───────────────────────────────────────────────────────────

  listQuestions(opts: {
    topic_id?: string | null;
    tradition_id?: string | null;
    question_type?: string | null;
    status?: string | null;
  } & PaginateOptions = {}) {
    const { topic_id, tradition_id, question_type, status } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (topic_id)      { conds.push('topic_id = ?');      params.push(topic_id); }
    if (tradition_id)  { conds.push('tradition_id = ?');  params.push(tradition_id); }
    if (question_type) { conds.push('question_type = ?'); params.push(question_type); }
    if (status)        { conds.push('status = ?');        params.push(status); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvQuestion>(
      this.db,
      `SELECT ${Q_COLS} FROM wv_questions ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM wv_questions ${where}`,
      params, opts,
    );
  }

  findQuestionById(id: string): Promise<WvQuestion | null> {
    return queryOne<WvQuestion>(
      this.db, `SELECT ${Q_COLS} FROM wv_questions WHERE id = ?`, [id],
    );
  }

  async createQuestion(input: QuestionCreate): Promise<WvQuestion> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_questions
         (id, question_text, question_type, topic_id, tradition_id, moral_axis_id,
          status, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.question_text,
        input.question_type ?? 'open',
        input.topic_id ?? null,
        input.tradition_id ?? null,
        input.moral_axis_id ?? null,
        input.status ?? 'open',
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findQuestionById(id))!;
  }

  // ── wv_debate_clusters ─────────────────────────────────────────────────────

  listDebateClusters(opts: {
    topic_id?: string | null;
    status?: string | null;
  } & PaginateOptions = {}) {
    const { topic_id, status } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (topic_id) { conds.push('topic_id = ?'); params.push(topic_id); }
    if (status)   { conds.push('status = ?');   params.push(status); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvDebateCluster>(
      this.db,
      `SELECT ${DC_COLS} FROM wv_debate_clusters ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_debate_clusters ${where}`,
      params, opts,
    );
  }

  findDebateClusterById(id: string): Promise<WvDebateCluster | null> {
    return queryOne<WvDebateCluster>(
      this.db, `SELECT ${DC_COLS} FROM wv_debate_clusters WHERE id = ?`, [id],
    );
  }

  async createDebateCluster(input: DebateClusterCreate): Promise<WvDebateCluster> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_debate_clusters
         (id, slug, title, description_md, topic_id, moral_axis_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.description_md ?? null,
        input.topic_id ?? null,
        input.moral_axis_id ?? null,
        input.status ?? 'active',
        now,
      ],
    );
    return (await this.findDebateClusterById(id))!;
  }

  clusterMembers(clusterId: string): Promise<WvDebateClusterMember[]> {
    return query<WvDebateClusterMember>(
      this.db,
      `SELECT ${DCM_COLS} FROM wv_debate_cluster_members WHERE cluster_id = ? ORDER BY entity_type`,
      [clusterId],
    );
  }

  findClusterMemberById(id: string): Promise<WvDebateClusterMember | null> {
    return queryOne<WvDebateClusterMember>(
      this.db, `SELECT ${DCM_COLS} FROM wv_debate_cluster_members WHERE id = ?`, [id],
    );
  }

  async addClusterMember(input: DebateClusterMemberCreate): Promise<WvDebateClusterMember> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_debate_cluster_members
         (id, cluster_id, entity_type, entity_id, stance, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.cluster_id,
        input.entity_type,
        input.entity_id,
        input.stance ?? null,
        now,
      ],
    );
    return (await this.findClusterMemberById(id))!;
  }

  async removeClusterMember(memberId: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_debate_cluster_members WHERE id = ?`, [memberId]);
  }

  // ── wv_value_positions ─────────────────────────────────────────────────────

  listValuePositions(opts: {
    moral_axis_id?: string | null;
    tradition_id?: string | null;
    position_type?: string | null;
  } & PaginateOptions = {}) {
    const { moral_axis_id, tradition_id, position_type } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (moral_axis_id) { conds.push('moral_axis_id = ?'); params.push(moral_axis_id); }
    if (tradition_id)  { conds.push('tradition_id = ?');  params.push(tradition_id); }
    if (position_type) { conds.push('position_type = ?'); params.push(position_type); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvValuePosition>(
      this.db,
      `SELECT ${VP_COLS} FROM wv_value_positions ${where} ORDER BY position_title`,
      `SELECT COUNT(*) AS count FROM wv_value_positions ${where}`,
      params, opts,
    );
  }

  findValuePositionById(id: string): Promise<WvValuePosition | null> {
    return queryOne<WvValuePosition>(
      this.db, `SELECT ${VP_COLS} FROM wv_value_positions WHERE id = ?`, [id],
    );
  }

  async createValuePosition(input: ValuePositionCreate): Promise<WvValuePosition> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_value_positions
         (id, moral_axis_id, tradition_id, school_id, person_id, position_title,
          position_text, position_type, evidence_refs, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.moral_axis_id,
        input.tradition_id ?? null,
        input.school_id ?? null,
        input.person_id ?? null,
        input.position_title,
        input.position_text,
        input.position_type ?? 'normative',
        input.evidence_refs ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findValuePositionById(id))!;
  }
}

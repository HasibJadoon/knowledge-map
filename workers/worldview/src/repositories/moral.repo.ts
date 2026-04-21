// ─── MoralRepo — L3 Abrahamic moral-civilizational ontology ──────────────────
// Covers: wv_moral_axes, wv_moral_norms, wv_norm_sources,
//         wv_virtue_profiles, wv_vice_profiles, wv_covenant_frameworks,
//         wv_sacrifice_frameworks, wv_revelation_models, wv_prophetic_models,
//         wv_divine_human_relations, wv_law_morality_links,
//         wv_salvation_redemption_models
// Canonical columns per 001_wv_schema.sql §3.1-§3.12

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WvMoralAxis {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  axis_type: string;         // relational|virtue|obligation|eschatological|structural|other
  description_md: string | null;
  domain_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface WvMoralNorm {
  id: string;
  moral_axis_id: string | null;
  tradition_id: string | null;
  title: string;
  norm_type: string;         // duty|prohibition|ideal|counsel|custom|taboo|other
  scope: string | null;      // universal|community|individual|ritual
  description_md: string | null;
  created_at: string;
}

export interface WvNormSource {
  id: string;
  norm_id: string;
  source_type: string;       // scripture|commentary|institution|thinker|tradition|legal
  source_ref: string;        // WV:source_id or external ref
  locator: string | null;
  excerpt: string | null;
  note: string | null;
  created_at: string;
}

export interface WvVirtueProfile {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  description_md: string | null;
  scripture_refs: string | null; // JSON [ref_string]
  created_at: string;
}

export interface WvViceProfile {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvCovenantFramework {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  parties: string | null;         // JSON [{role,identity}]
  covenant_type: string;          // unilateral|bilateral|universal|communal|conditional|eternal
  key_sign: string | null;
  key_obligation: string | null;
  memory_practice: string | null;
  renewal_pattern: string | null;
  description_md: string | null;
  corpus_refs: string | null;     // JSON [corpus_unit_id]
  meta_json: string | null;
  created_at: string;
}

export interface WvSacrificeFramework {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  sacrifice_type: string;         // ritual|moral|communal|testing|substitution|atonement|surrender|remembrance|other
  key_example: string | null;
  theological_role: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvRevelationModel {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  revelation_type: string;        // prophetic|scriptural|incarnational|recitational|mystical|legal|natural|spirit_based|other
  medium: string | null;          // word|law|person|spirit|scripture
  continuity: string | null;      // ongoing|closed|progressive|final
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvPropheticModel {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  model_role: string;             // messenger|exemplar|mediator|lawgiver|suffering_servant|reformer|warner|intercessor|other
  key_attributes: string | null;  // JSON [string]
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvDivineHumanRelation {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  relation_type: string;          // covenantal|filial|servant|mystical|contractual|fearful|other
  key_qualities: string | null;   // JSON [string]
  description_md: string | null;
  created_at: string;
}

export interface WvLawMoralityLink {
  id: string;
  tradition_id: string | null;
  law_system: string;
  morality_domain: string;
  link_type: string;              // grounds|expresses|teaches|enforces|supplements|transcends|other
  description_md: string | null;
  created_at: string;
}

export interface WvSalvationRedemptionModel {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  model_type: string;             // moral|substitutionary|participatory|progressive|restorative|covenantal|mystical|other
  sin_diagnosis: string | null;
  remedy: string | null;
  final_hope: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface MoralAxisCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  axis_type?: string;
  description_md?: string | null;
  domain_id?: string | null;
  sort_order?: number;
}

export interface MoralNormCreate {
  title: string;
  moral_axis_id?: string | null;
  tradition_id?: string | null;
  norm_type?: string;
  scope?: string | null;
  description_md?: string | null;
}

export interface NormSourceCreate {
  norm_id: string;
  source_type?: string;
  source_ref: string;
  locator?: string | null;
  excerpt?: string | null;
  note?: string | null;
}

export interface VirtueProfileCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  description_md?: string | null;
  scripture_refs?: string | null;
}

export interface ViceProfileCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  description_md?: string | null;
}

export interface CovenantFrameworkCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  parties?: string | null;
  covenant_type?: string;
  key_sign?: string | null;
  key_obligation?: string | null;
  memory_practice?: string | null;
  renewal_pattern?: string | null;
  description_md?: string | null;
  corpus_refs?: string | null;
  meta_json?: string | null;
}

export interface SacrificeFrameworkCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  sacrifice_type?: string;
  key_example?: string | null;
  theological_role?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface RevelationModelCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  revelation_type?: string;
  medium?: string | null;
  continuity?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface PropheticModelCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  model_role?: string;
  key_attributes?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface DivineHumanRelationCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  relation_type?: string;
  key_qualities?: string | null;
  description_md?: string | null;
}

export interface LawMoralityLinkCreate {
  law_system: string;
  morality_domain: string;
  tradition_id?: string | null;
  link_type?: string;
  description_md?: string | null;
}

export interface SalvationModelCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  model_type?: string;
  sin_diagnosis?: string | null;
  remedy?: string | null;
  final_hope?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

// ── Column lists ─────────────────────────────────────────────────────────────

const AXIS_COLS =
  `id, slug, title, title_ar, axis_type, description_md, domain_id, sort_order, created_at`;

const NORM_COLS =
  `id, moral_axis_id, tradition_id, title, norm_type, scope, description_md, created_at`;

const NORM_SRC_COLS =
  `id, norm_id, source_type, source_ref, locator, excerpt, note, created_at`;

const VIRTUE_COLS =
  `id, slug, title, title_ar, tradition_id, moral_axis_id, description_md, scripture_refs, created_at`;

const VICE_COLS =
  `id, slug, title, title_ar, tradition_id, moral_axis_id, description_md, created_at`;

const COVENANT_COLS =
  `id, slug, title, tradition_id, parties, covenant_type, key_sign, key_obligation, ` +
  `memory_practice, renewal_pattern, description_md, corpus_refs, meta_json, created_at`;

const SACRIFICE_COLS =
  `id, slug, title, tradition_id, sacrifice_type, key_example, theological_role, ` +
  `description_md, meta_json, created_at`;

const REV_COLS =
  `id, slug, title, tradition_id, revelation_type, medium, continuity, ` +
  `description_md, meta_json, created_at`;

const PROPH_COLS =
  `id, slug, title, tradition_id, model_role, key_attributes, description_md, meta_json, created_at`;

const DHR_COLS =
  `id, slug, title, tradition_id, relation_type, key_qualities, description_md, created_at`;

const LML_COLS =
  `id, tradition_id, law_system, morality_domain, link_type, description_md, created_at`;

const SRM_COLS =
  `id, slug, title, tradition_id, model_type, sin_diagnosis, remedy, final_hope, ` +
  `description_md, meta_json, created_at`;

// ── Repo ─────────────────────────────────────────────────────────────────────

export class MoralRepo {
  constructor(private db: D1Database) {}

  // ── wv_moral_axes ──────────────────────────────────────────────────────────

  listAxes(opts: { axis_type?: string | null } & PaginateOptions = {}) {
    const { axis_type } = opts;
    const where  = axis_type ? 'WHERE axis_type = ?' : '';
    const params = axis_type ? [axis_type] : [];
    return paginate<WvMoralAxis>(
      this.db,
      `SELECT ${AXIS_COLS} FROM wv_moral_axes ${where} ORDER BY sort_order, title`,
      `SELECT COUNT(*) AS count FROM wv_moral_axes ${where}`,
      params, opts,
    );
  }

  findAxisById(id: string): Promise<WvMoralAxis | null> {
    return queryOne<WvMoralAxis>(
      this.db, `SELECT ${AXIS_COLS} FROM wv_moral_axes WHERE id = ?`, [id],
    );
  }

  async createAxis(input: MoralAxisCreate): Promise<WvMoralAxis> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_moral_axes
         (id, slug, title, title_ar, axis_type, description_md, domain_id, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.title_ar ?? null,
        input.axis_type ?? 'relational',
        input.description_md ?? null,
        input.domain_id ?? null,
        input.sort_order ?? 0,
        now,
      ],
    );
    return (await this.findAxisById(id))!;
  }

  // ── wv_moral_norms ─────────────────────────────────────────────────────────

  listNorms(opts: {
    moral_axis_id?: string | null;
    tradition_id?: string | null;
  } & PaginateOptions = {}) {
    const { moral_axis_id, tradition_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (moral_axis_id) { conds.push('moral_axis_id = ?'); params.push(moral_axis_id); }
    if (tradition_id)  { conds.push('tradition_id = ?');  params.push(tradition_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvMoralNorm>(
      this.db,
      `SELECT ${NORM_COLS} FROM wv_moral_norms ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_moral_norms ${where}`,
      params, opts,
    );
  }

  findNormById(id: string): Promise<WvMoralNorm | null> {
    return queryOne<WvMoralNorm>(
      this.db, `SELECT ${NORM_COLS} FROM wv_moral_norms WHERE id = ?`, [id],
    );
  }

  async createNorm(input: MoralNormCreate): Promise<WvMoralNorm> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_moral_norms
         (id, moral_axis_id, tradition_id, title, norm_type, scope, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.moral_axis_id ?? null,
        input.tradition_id ?? null,
        input.title,
        input.norm_type ?? 'duty',
        input.scope ?? null,
        input.description_md ?? null,
        now,
      ],
    );
    return (await this.findNormById(id))!;
  }

  // ── wv_norm_sources ────────────────────────────────────────────────────────

  normSources(normId: string): Promise<WvNormSource[]> {
    return query<WvNormSource>(
      this.db,
      `SELECT ${NORM_SRC_COLS} FROM wv_norm_sources WHERE norm_id = ? ORDER BY source_type`,
      [normId],
    );
  }

  findNormSourceById(id: string): Promise<WvNormSource | null> {
    return queryOne<WvNormSource>(
      this.db, `SELECT ${NORM_SRC_COLS} FROM wv_norm_sources WHERE id = ?`, [id],
    );
  }

  async createNormSource(input: NormSourceCreate): Promise<WvNormSource> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_norm_sources
         (id, norm_id, source_type, source_ref, locator, excerpt, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.norm_id,
        input.source_type ?? 'scripture',
        input.source_ref,
        input.locator ?? null,
        input.excerpt ?? null,
        input.note ?? null,
        now,
      ],
    );
    return (await this.findNormSourceById(id))!;
  }

  async removeNormSource(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_norm_sources WHERE id = ?`, [id]);
  }

  // ── wv_virtue_profiles ─────────────────────────────────────────────────────

  listVirtues(opts: {
    tradition_id?: string | null;
    moral_axis_id?: string | null;
  } & PaginateOptions = {}) {
    const { tradition_id, moral_axis_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (tradition_id)  { conds.push('tradition_id = ?');  params.push(tradition_id); }
    if (moral_axis_id) { conds.push('moral_axis_id = ?'); params.push(moral_axis_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvVirtueProfile>(
      this.db,
      `SELECT ${VIRTUE_COLS} FROM wv_virtue_profiles ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_virtue_profiles ${where}`,
      params, opts,
    );
  }

  findVirtueById(id: string): Promise<WvVirtueProfile | null> {
    return queryOne<WvVirtueProfile>(
      this.db, `SELECT ${VIRTUE_COLS} FROM wv_virtue_profiles WHERE id = ?`, [id],
    );
  }

  async createVirtue(input: VirtueProfileCreate): Promise<WvVirtueProfile> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_virtue_profiles
         (id, slug, title, title_ar, tradition_id, moral_axis_id,
          description_md, scripture_refs, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.title_ar ?? null,
        input.tradition_id ?? null,
        input.moral_axis_id ?? null,
        input.description_md ?? null,
        input.scripture_refs ?? null,
        now,
      ],
    );
    return (await this.findVirtueById(id))!;
  }

  // ── wv_vice_profiles ───────────────────────────────────────────────────────

  listVices(opts: {
    tradition_id?: string | null;
    moral_axis_id?: string | null;
  } & PaginateOptions = {}) {
    const { tradition_id, moral_axis_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (tradition_id)  { conds.push('tradition_id = ?');  params.push(tradition_id); }
    if (moral_axis_id) { conds.push('moral_axis_id = ?'); params.push(moral_axis_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvViceProfile>(
      this.db,
      `SELECT ${VICE_COLS} FROM wv_vice_profiles ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_vice_profiles ${where}`,
      params, opts,
    );
  }

  findViceById(id: string): Promise<WvViceProfile | null> {
    return queryOne<WvViceProfile>(
      this.db, `SELECT ${VICE_COLS} FROM wv_vice_profiles WHERE id = ?`, [id],
    );
  }

  async createVice(input: ViceProfileCreate): Promise<WvViceProfile> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_vice_profiles
         (id, slug, title, title_ar, tradition_id, moral_axis_id,
          description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.title_ar ?? null,
        input.tradition_id ?? null,
        input.moral_axis_id ?? null,
        input.description_md ?? null,
        now,
      ],
    );
    return (await this.findViceById(id))!;
  }

  // ── wv_covenant_frameworks ─────────────────────────────────────────────────

  listCovenants(opts: { tradition_id?: string | null } & PaginateOptions = {}) {
    const { tradition_id } = opts;
    const where  = tradition_id ? 'WHERE tradition_id = ?' : '';
    const params = tradition_id ? [tradition_id] : [];
    return paginate<WvCovenantFramework>(
      this.db,
      `SELECT ${COVENANT_COLS} FROM wv_covenant_frameworks ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_covenant_frameworks ${where}`,
      params, opts,
    );
  }

  findCovenantById(id: string): Promise<WvCovenantFramework | null> {
    return queryOne<WvCovenantFramework>(
      this.db, `SELECT ${COVENANT_COLS} FROM wv_covenant_frameworks WHERE id = ?`, [id],
    );
  }

  async createCovenant(input: CovenantFrameworkCreate): Promise<WvCovenantFramework> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_covenant_frameworks
         (id, slug, title, tradition_id, parties, covenant_type, key_sign, key_obligation,
          memory_practice, renewal_pattern, description_md, corpus_refs, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.tradition_id ?? null,
        input.parties ?? null,
        input.covenant_type ?? 'bilateral',
        input.key_sign ?? null,
        input.key_obligation ?? null,
        input.memory_practice ?? null,
        input.renewal_pattern ?? null,
        input.description_md ?? null,
        input.corpus_refs ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findCovenantById(id))!;
  }

  // ── wv_sacrifice_frameworks ────────────────────────────────────────────────

  listSacrifice(opts: { tradition_id?: string | null } & PaginateOptions = {}) {
    const { tradition_id } = opts;
    const where  = tradition_id ? 'WHERE tradition_id = ?' : '';
    const params = tradition_id ? [tradition_id] : [];
    return paginate<WvSacrificeFramework>(
      this.db,
      `SELECT ${SACRIFICE_COLS} FROM wv_sacrifice_frameworks ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_sacrifice_frameworks ${where}`,
      params, opts,
    );
  }

  findSacrificeById(id: string): Promise<WvSacrificeFramework | null> {
    return queryOne<WvSacrificeFramework>(
      this.db, `SELECT ${SACRIFICE_COLS} FROM wv_sacrifice_frameworks WHERE id = ?`, [id],
    );
  }

  async createSacrifice(input: SacrificeFrameworkCreate): Promise<WvSacrificeFramework> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_sacrifice_frameworks
         (id, slug, title, tradition_id, sacrifice_type, key_example,
          theological_role, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.tradition_id ?? null,
        input.sacrifice_type ?? 'ritual',
        input.key_example ?? null,
        input.theological_role ?? null,
        input.description_md ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findSacrificeById(id))!;
  }

  // ── wv_revelation_models ───────────────────────────────────────────────────

  listRevelationModels(opts: {
    tradition_id?: string | null;
    revelation_type?: string | null;
  } & PaginateOptions = {}) {
    const { tradition_id, revelation_type } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (tradition_id)   { conds.push('tradition_id = ?');   params.push(tradition_id); }
    if (revelation_type){ conds.push('revelation_type = ?'); params.push(revelation_type); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvRevelationModel>(
      this.db,
      `SELECT ${REV_COLS} FROM wv_revelation_models ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_revelation_models ${where}`,
      params, opts,
    );
  }

  findRevelationModelById(id: string): Promise<WvRevelationModel | null> {
    return queryOne<WvRevelationModel>(
      this.db, `SELECT ${REV_COLS} FROM wv_revelation_models WHERE id = ?`, [id],
    );
  }

  async createRevelationModel(input: RevelationModelCreate): Promise<WvRevelationModel> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_revelation_models
         (id, slug, title, tradition_id, revelation_type, medium,
          continuity, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.tradition_id ?? null,
        input.revelation_type ?? 'prophetic',
        input.medium ?? null,
        input.continuity ?? null,
        input.description_md ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findRevelationModelById(id))!;
  }

  // ── wv_prophetic_models ────────────────────────────────────────────────────

  listPropheticModels(opts: {
    tradition_id?: string | null;
    model_role?: string | null;
  } & PaginateOptions = {}) {
    const { tradition_id, model_role } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (tradition_id) { conds.push('tradition_id = ?'); params.push(tradition_id); }
    if (model_role)   { conds.push('model_role = ?');   params.push(model_role); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvPropheticModel>(
      this.db,
      `SELECT ${PROPH_COLS} FROM wv_prophetic_models ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_prophetic_models ${where}`,
      params, opts,
    );
  }

  findPropheticModelById(id: string): Promise<WvPropheticModel | null> {
    return queryOne<WvPropheticModel>(
      this.db, `SELECT ${PROPH_COLS} FROM wv_prophetic_models WHERE id = ?`, [id],
    );
  }

  async createPropheticModel(input: PropheticModelCreate): Promise<WvPropheticModel> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_prophetic_models
         (id, slug, title, tradition_id, model_role, key_attributes,
          description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.tradition_id ?? null,
        input.model_role ?? 'messenger',
        input.key_attributes ?? null,
        input.description_md ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findPropheticModelById(id))!;
  }

  // ── wv_divine_human_relations ──────────────────────────────────────────────

  listDivineHumanRelations(opts: {
    tradition_id?: string | null;
    relation_type?: string | null;
  } & PaginateOptions = {}) {
    const { tradition_id, relation_type } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (tradition_id)  { conds.push('tradition_id = ?');  params.push(tradition_id); }
    if (relation_type) { conds.push('relation_type = ?'); params.push(relation_type); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvDivineHumanRelation>(
      this.db,
      `SELECT ${DHR_COLS} FROM wv_divine_human_relations ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_divine_human_relations ${where}`,
      params, opts,
    );
  }

  findDivineHumanRelationById(id: string): Promise<WvDivineHumanRelation | null> {
    return queryOne<WvDivineHumanRelation>(
      this.db, `SELECT ${DHR_COLS} FROM wv_divine_human_relations WHERE id = ?`, [id],
    );
  }

  async createDivineHumanRelation(input: DivineHumanRelationCreate): Promise<WvDivineHumanRelation> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_divine_human_relations
         (id, slug, title, tradition_id, relation_type, key_qualities,
          description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.tradition_id ?? null,
        input.relation_type ?? 'covenantal',
        input.key_qualities ?? null,
        input.description_md ?? null,
        now,
      ],
    );
    return (await this.findDivineHumanRelationById(id))!;
  }

  // ── wv_law_morality_links ──────────────────────────────────────────────────

  listLawMoralityLinks(opts: {
    tradition_id?: string | null;
    link_type?: string | null;
  } & PaginateOptions = {}) {
    const { tradition_id, link_type } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (tradition_id) { conds.push('tradition_id = ?'); params.push(tradition_id); }
    if (link_type)    { conds.push('link_type = ?');    params.push(link_type); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvLawMoralityLink>(
      this.db,
      `SELECT ${LML_COLS} FROM wv_law_morality_links ${where} ORDER BY law_system`,
      `SELECT COUNT(*) AS count FROM wv_law_morality_links ${where}`,
      params, opts,
    );
  }

  findLawMoralityLinkById(id: string): Promise<WvLawMoralityLink | null> {
    return queryOne<WvLawMoralityLink>(
      this.db, `SELECT ${LML_COLS} FROM wv_law_morality_links WHERE id = ?`, [id],
    );
  }

  async createLawMoralityLink(input: LawMoralityLinkCreate): Promise<WvLawMoralityLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_law_morality_links
         (id, tradition_id, law_system, morality_domain, link_type, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.tradition_id ?? null,
        input.law_system,
        input.morality_domain,
        input.link_type ?? 'grounds',
        input.description_md ?? null,
        now,
      ],
    );
    return (await this.findLawMoralityLinkById(id))!;
  }

  // ── wv_salvation_redemption_models ─────────────────────────────────────────

  listSalvationModels(opts: {
    tradition_id?: string | null;
    model_type?: string | null;
  } & PaginateOptions = {}) {
    const { tradition_id, model_type } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (tradition_id) { conds.push('tradition_id = ?'); params.push(tradition_id); }
    if (model_type)   { conds.push('model_type = ?');   params.push(model_type); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvSalvationRedemptionModel>(
      this.db,
      `SELECT ${SRM_COLS} FROM wv_salvation_redemption_models ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_salvation_redemption_models ${where}`,
      params, opts,
    );
  }

  findSalvationModelById(id: string): Promise<WvSalvationRedemptionModel | null> {
    return queryOne<WvSalvationRedemptionModel>(
      this.db, `SELECT ${SRM_COLS} FROM wv_salvation_redemption_models WHERE id = ?`, [id],
    );
  }

  async createSalvationModel(input: SalvationModelCreate): Promise<WvSalvationRedemptionModel> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_salvation_redemption_models
         (id, slug, title, tradition_id, model_type, sin_diagnosis, remedy,
          final_hope, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.tradition_id ?? null,
        input.model_type ?? 'moral',
        input.sin_diagnosis ?? null,
        input.remedy ?? null,
        input.final_hope ?? null,
        input.description_md ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findSalvationModelById(id))!;
  }
}

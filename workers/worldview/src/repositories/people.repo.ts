// ─── PeopleRepo — L2 figures + organizations ─────────────────────────────────
// Covers: wv_people, wv_people_aliases, wv_people_relations,
//         wv_organizations, wv_affiliations, wv_source_people
// Canonical columns per 001_wv_schema.sql §2.3-§2.7, §2.10

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WvPerson {
  id: string;                    // WV:ULID
  slug: string | null;
  name: string;
  name_ar: string | null;
  person_type: string;           // prophet|companion|scholar|jurist|theologian|philosopher|ruler|reformer|critic|contemporary|historical_figure|other
  tradition_id: string | null;
  era: string | null;
  birth_year: number | null;
  death_year: number | null;
  birth_location_id: string | null;
  death_location_id: string | null;
  nationality: string | null;
  affiliation: string | null;
  bio_md: string | null;
  visibility: string;            // private|workspace
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvPersonAlias {
  id: string;
  person_id: string;
  alias: string;
  alias_type: string;            // transliteration|honorific|title|kunya|nisba|laqab|other
  language: string | null;
  created_at: string;
}

export interface WvPersonRelation {
  id: string;
  from_person_id: string;
  to_person_id: string;
  relation_type: string;         // teacher_of|student_of|influenced|opponent_of|successor_of|lineage|contemporary_of|responded_to|collaborated_with|other
  note: string | null;
  source_ref: string | null;
  created_at: string;
}

export interface WvOrganization {
  id: string;
  slug: string;
  title: string;
  org_type: string;              // religious_body|council|seminary|missionary_agency|court|movement_office|academic|government|media|other
  tradition_id: string | null;
  location_id: string | null;
  period_id: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvAffiliation {
  id: string;
  entity_ref: string;            // WV:id of person|organization|source
  entity_type: string;           // person|organization|source
  target_type: string;           // school|tradition|branch|institution|movement
  target_id: string;
  affil_role: string | null;     // founder|member|critic|convert
  period_label: string | null;
  note: string | null;
  created_at: string;
}

export interface WvSourcePerson {
  id: string;
  source_id: string;
  person_id: string;
  role: string;                  // author|editor|translator|speaker|host|guest|compiler|contributor
  created_at: string;
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface PersonCreate {
  name: string;
  name_ar?: string | null;
  slug?: string | null;
  person_type?: string;
  tradition_id?: string | null;
  era?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  birth_location_id?: string | null;
  death_location_id?: string | null;
  nationality?: string | null;
  affiliation?: string | null;
  bio_md?: string | null;
  visibility?: string;
  meta_json?: string | null;
}

export interface PersonPatch {
  name?: string;
  name_ar?: string | null;
  slug?: string | null;
  person_type?: string;
  tradition_id?: string | null;
  era?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  birth_location_id?: string | null;
  death_location_id?: string | null;
  nationality?: string | null;
  affiliation?: string | null;
  bio_md?: string | null;
  visibility?: string;
  meta_json?: string | null;
}

export interface AliasCreate {
  alias: string;
  alias_type?: string;
  language?: string | null;
}

export interface PersonRelationCreate {
  from_person_id: string;
  to_person_id: string;
  relation_type?: string;
  note?: string | null;
  source_ref?: string | null;
}

export interface OrgCreate {
  slug: string;
  title: string;
  org_type?: string;
  tradition_id?: string | null;
  location_id?: string | null;
  period_id?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface OrgPatch {
  title?: string;
  org_type?: string;
  tradition_id?: string | null;
  location_id?: string | null;
  period_id?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface AffiliationCreate {
  entity_ref: string;
  entity_type: string;
  target_type: string;
  target_id: string;
  affil_role?: string | null;
  period_label?: string | null;
  note?: string | null;
}

// ── Column lists ─────────────────────────────────────────────────────────────

const PERSON_COLS =
  `id, slug, name, name_ar, person_type, tradition_id, era, birth_year, death_year, ` +
  `birth_location_id, death_location_id, nationality, affiliation, bio_md, ` +
  `visibility, meta_json, created_at, updated_at`;

const ALIAS_COLS =
  `id, person_id, alias, alias_type, language, created_at`;

const RELATION_COLS =
  `id, from_person_id, to_person_id, relation_type, note, source_ref, created_at`;

const ORG_COLS =
  `id, slug, title, org_type, tradition_id, location_id, period_id, ` +
  `description_md, meta_json, created_at`;

const AFFIL_COLS =
  `id, entity_ref, entity_type, target_type, target_id, affil_role, period_label, note, created_at`;

const SP_COLS =
  `id, source_id, person_id, role, created_at`;

// ── Repo ─────────────────────────────────────────────────────────────────────

export class PeopleRepo {
  constructor(private db: D1Database) {}

  // ── wv_people ──────────────────────────────────────────────────────────────

  list(opts: {
    tradition_id?: string | null;
    visibility?: string | null;
    person_type?: string | null;
  } & PaginateOptions = {}) {
    const { tradition_id, visibility, person_type } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (tradition_id) { conds.push('tradition_id = ?'); params.push(tradition_id); }
    if (visibility)   { conds.push('visibility = ?');   params.push(visibility); }
    if (person_type)  { conds.push('person_type = ?');  params.push(person_type); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvPerson>(
      this.db,
      `SELECT ${PERSON_COLS} FROM wv_people ${where} ORDER BY name`,
      `SELECT COUNT(*) AS count FROM wv_people ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<WvPerson | null> {
    return queryOne<WvPerson>(
      this.db, `SELECT ${PERSON_COLS} FROM wv_people WHERE id = ?`, [id],
    );
  }

  findBySlug(slug: string): Promise<WvPerson | null> {
    return queryOne<WvPerson>(
      this.db, `SELECT ${PERSON_COLS} FROM wv_people WHERE slug = ?`, [slug],
    );
  }

  async create(input: PersonCreate): Promise<WvPerson> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_people
         (id, slug, name, name_ar, person_type, tradition_id, era,
          birth_year, death_year, birth_location_id, death_location_id,
          nationality, affiliation, bio_md, visibility, meta_json,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug ?? null,
        input.name,
        input.name_ar ?? null,
        input.person_type ?? 'scholar',
        input.tradition_id ?? null,
        input.era ?? null,
        input.birth_year ?? null,
        input.death_year ?? null,
        input.birth_location_id ?? null,
        input.death_location_id ?? null,
        input.nationality ?? null,
        input.affiliation ?? null,
        input.bio_md ?? null,
        input.visibility ?? 'workspace',
        input.meta_json ?? null,
        now, now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: PersonPatch): Promise<WvPerson | null> {
    const now  = new Date().toISOString();
    const sets: string[]   = ['updated_at = ?'];
    const vals: unknown[]  = [now];

    const MAP: [keyof PersonPatch, string][] = [
      ['name',              'name = ?'],
      ['name_ar',           'name_ar = ?'],
      ['slug',              'slug = ?'],
      ['person_type',       'person_type = ?'],
      ['tradition_id',      'tradition_id = ?'],
      ['era',               'era = ?'],
      ['birth_year',        'birth_year = ?'],
      ['death_year',        'death_year = ?'],
      ['birth_location_id', 'birth_location_id = ?'],
      ['death_location_id', 'death_location_id = ?'],
      ['nationality',       'nationality = ?'],
      ['affiliation',       'affiliation = ?'],
      ['bio_md',            'bio_md = ?'],
      ['visibility',        'visibility = ?'],
      ['meta_json',         'meta_json = ?'],
    ];
    for (const [key, sql] of MAP) {
      if (key in patch) { sets.push(sql); vals.push(patch[key] ?? null); }
    }
    vals.push(id);
    await execute(
      this.db,
      `UPDATE wv_people SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_people WHERE id = ?`, [id]);
  }

  // ── wv_people_aliases ──────────────────────────────────────────────────────

  aliases(personId: string): Promise<WvPersonAlias[]> {
    return query<WvPersonAlias>(
      this.db,
      `SELECT ${ALIAS_COLS} FROM wv_people_aliases WHERE person_id = ? ORDER BY alias_type, alias`,
      [personId],
    );
  }

  async addAlias(personId: string, input: AliasCreate): Promise<WvPersonAlias> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_people_aliases (id, person_id, alias, alias_type, language, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, personId, input.alias, input.alias_type ?? 'transliteration', input.language ?? null, now],
    );
    return (await queryOne<WvPersonAlias>(
      this.db, `SELECT ${ALIAS_COLS} FROM wv_people_aliases WHERE id = ?`, [id],
    ))!;
  }

  async removeAlias(aliasId: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_people_aliases WHERE id = ?`, [aliasId]);
  }

  // ── wv_people_relations ────────────────────────────────────────────────────

  relations(personId: string): Promise<WvPersonRelation[]> {
    return query<WvPersonRelation>(
      this.db,
      `SELECT ${RELATION_COLS} FROM wv_people_relations
       WHERE from_person_id = ? OR to_person_id = ?
       ORDER BY relation_type`,
      [personId, personId],
    );
  }

  async addRelation(input: PersonRelationCreate): Promise<WvPersonRelation> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_people_relations
         (id, from_person_id, to_person_id, relation_type, note, source_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.from_person_id,
        input.to_person_id,
        input.relation_type ?? 'influenced',
        input.note ?? null,
        input.source_ref ?? null,
        now,
      ],
    );
    return (await queryOne<WvPersonRelation>(
      this.db, `SELECT ${RELATION_COLS} FROM wv_people_relations WHERE id = ?`, [id],
    ))!;
  }

  async removeRelation(relationId: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_people_relations WHERE id = ?`, [relationId]);
  }

  // ── wv_organizations ───────────────────────────────────────────────────────

  organizations(opts: {
    org_type?: string | null;
    tradition_id?: string | null;
  } & PaginateOptions = {}) {
    const { org_type, tradition_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (org_type)     { conds.push('org_type = ?');     params.push(org_type); }
    if (tradition_id) { conds.push('tradition_id = ?'); params.push(tradition_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvOrganization>(
      this.db,
      `SELECT ${ORG_COLS} FROM wv_organizations ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_organizations ${where}`,
      params, opts,
    );
  }

  findOrgById(id: string): Promise<WvOrganization | null> {
    return queryOne<WvOrganization>(
      this.db, `SELECT ${ORG_COLS} FROM wv_organizations WHERE id = ?`, [id],
    );
  }

  async createOrg(input: OrgCreate): Promise<WvOrganization> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_organizations
         (id, slug, title, org_type, tradition_id, location_id, period_id,
          description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.org_type ?? 'religious_body',
        input.tradition_id ?? null,
        input.location_id ?? null,
        input.period_id ?? null,
        input.description_md ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findOrgById(id))!;
  }

  async patchOrg(id: string, patch: OrgPatch): Promise<WvOrganization | null> {
    const sets: string[]   = [];
    const vals: unknown[]  = [];

    const MAP: [keyof OrgPatch, string][] = [
      ['title',          'title = ?'],
      ['org_type',       'org_type = ?'],
      ['tradition_id',   'tradition_id = ?'],
      ['location_id',    'location_id = ?'],
      ['period_id',      'period_id = ?'],
      ['description_md', 'description_md = ?'],
      ['meta_json',      'meta_json = ?'],
    ];
    for (const [key, sql] of MAP) {
      if (key in patch) { sets.push(sql); vals.push(patch[key] ?? null); }
    }
    if (!sets.length) return this.findOrgById(id);

    vals.push(id);
    await execute(
      this.db,
      `UPDATE wv_organizations SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findOrgById(id);
  }

  // ── wv_affiliations ────────────────────────────────────────────────────────

  affiliations(entityRef: string): Promise<WvAffiliation[]> {
    return query<WvAffiliation>(
      this.db,
      `SELECT ${AFFIL_COLS} FROM wv_affiliations WHERE entity_ref = ? ORDER BY target_type`,
      [entityRef],
    );
  }

  async addAffiliation(input: AffiliationCreate): Promise<WvAffiliation> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_affiliations
         (id, entity_ref, entity_type, target_type, target_id, affil_role,
          period_label, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.entity_ref,
        input.entity_type,
        input.target_type,
        input.target_id,
        input.affil_role ?? null,
        input.period_label ?? null,
        input.note ?? null,
        now,
      ],
    );
    return (await queryOne<WvAffiliation>(
      this.db, `SELECT ${AFFIL_COLS} FROM wv_affiliations WHERE id = ?`, [id],
    ))!;
  }

  async removeAffiliation(affiliationId: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_affiliations WHERE id = ?`, [affiliationId]);
  }

  // ── wv_source_people ───────────────────────────────────────────────────────

  sourcePeople(sourceId: string): Promise<WvSourcePerson[]> {
    return query<WvSourcePerson>(
      this.db,
      `SELECT ${SP_COLS} FROM wv_source_people WHERE source_id = ? ORDER BY role`,
      [sourceId],
    );
  }

  personSources(personId: string): Promise<WvSourcePerson[]> {
    return query<WvSourcePerson>(
      this.db,
      `SELECT ${SP_COLS} FROM wv_source_people WHERE person_id = ? ORDER BY created_at DESC`,
      [personId],
    );
  }

  async linkPersonToSource(
    sourceId: string,
    personId: string,
    role: string = 'author',
  ): Promise<WvSourcePerson> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT OR IGNORE INTO wv_source_people (id, source_id, person_id, role, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, sourceId, personId, role, now],
    );
    return (await queryOne<WvSourcePerson>(
      this.db,
      `SELECT ${SP_COLS} FROM wv_source_people
       WHERE source_id = ? AND person_id = ? AND role = ?`,
      [sourceId, personId, role],
    ))!;
  }

  async unlinkPersonFromSource(
    sourceId: string,
    personId: string,
    role: string,
  ): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM wv_source_people WHERE source_id = ? AND person_id = ? AND role = ?`,
      [sourceId, personId, role],
    );
  }
}

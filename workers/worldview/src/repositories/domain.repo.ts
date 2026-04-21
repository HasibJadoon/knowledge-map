// ─── DomainRepo — L1 coordinate ontology ────────────────────────────────────
// Covers: wv_domains, wv_periods, wv_regions, wv_locations, wv_institutions
// Canonical columns per 001_wv_schema.sql §1.1, §1.6-§1.9

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WvDomain {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface WvPeriod {
  id: string;
  slug: string;
  title: string;
  period_type: string;       // era|century|epoch|generation|reign|phase
  start_year: number | null;
  end_year: number | null;
  is_approximate: number;    // 0|1
  civilizational_label: string | null;
  description_md: string | null;
  sort_order: number;
  created_at: string;
}

export interface WvRegion {
  id: string;
  slug: string;
  title: string;
  region_type: string;       // macro|civilizational|geopolitical|cultural|diaspora
  parent_id: string | null;
  description_md: string | null;
  bounding_box: string | null; // JSON {north,south,east,west}
  created_at: string;
}

export interface WvLocation {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  location_type: string;     // city|site|institution|pilgrimage_node|debate_center|monastery|seminary|court|university|region|other
  region_id: string | null;
  latitude: number | null;
  longitude: number | null;
  modern_name: string | null;
  modern_country: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvInstitution {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  institution_type: string;  // religious|educational|legal|charitable|political|monastic|missionary|court|council|waqf|other
  tradition_id: string | null;
  location_id: string | null;
  period_id: string | null;
  founded_year: number | null;
  dissolved_year: number | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface DomainCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  sort_order?: number;
}

export interface PeriodCreate {
  slug: string;
  title: string;
  period_type?: string;
  start_year?: number | null;
  end_year?: number | null;
  is_approximate?: number;
  civilizational_label?: string | null;
  description_md?: string | null;
  sort_order?: number;
}

export interface RegionCreate {
  slug: string;
  title: string;
  region_type?: string;
  parent_id?: string | null;
  description_md?: string | null;
  bounding_box?: string | null;
}

export interface LocationCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  location_type?: string;
  region_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  modern_name?: string | null;
  modern_country?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface InstitutionCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  institution_type?: string;
  tradition_id?: string | null;
  location_id?: string | null;
  period_id?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface InstitutionPatch {
  title?: string;
  title_ar?: string | null;
  institution_type?: string;
  tradition_id?: string | null;
  location_id?: string | null;
  period_id?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  description_md?: string | null;
  meta_json?: string | null;
}

// ── Column lists ─────────────────────────────────────────────────────────────

const DOMAIN_COLS =
  `id, slug, title, title_ar, description, sort_order, created_at`;

const PERIOD_COLS =
  `id, slug, title, period_type, start_year, end_year, is_approximate, ` +
  `civilizational_label, description_md, sort_order, created_at`;

const REGION_COLS =
  `id, slug, title, region_type, parent_id, description_md, bounding_box, created_at`;

const LOCATION_COLS =
  `id, slug, title, title_ar, location_type, region_id, latitude, longitude, ` +
  `modern_name, modern_country, description_md, meta_json, created_at`;

const INST_COLS =
  `id, slug, title, title_ar, institution_type, tradition_id, location_id, period_id, ` +
  `founded_year, dissolved_year, description_md, meta_json, created_at, updated_at`;

// ── Repo ─────────────────────────────────────────────────────────────────────

export class DomainRepo {
  constructor(private db: D1Database) {}

  // ── wv_domains ─────────────────────────────────────────────────────────────

  listDomains(opts: PaginateOptions = {}) {
    return paginate<WvDomain>(
      this.db,
      `SELECT ${DOMAIN_COLS} FROM wv_domains ORDER BY sort_order, title`,
      `SELECT COUNT(*) AS count FROM wv_domains`,
      [], opts,
    );
  }

  findDomainById(id: string): Promise<WvDomain | null> {
    return queryOne<WvDomain>(
      this.db, `SELECT ${DOMAIN_COLS} FROM wv_domains WHERE id = ?`, [id],
    );
  }

  async createDomain(input: DomainCreate): Promise<WvDomain> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_domains (id, slug, title, title_ar, description, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.title_ar ?? null,
        input.description ?? null,
        input.sort_order ?? 0,
        now,
      ],
    );
    return (await this.findDomainById(id))!;
  }

  // ── wv_periods ─────────────────────────────────────────────────────────────

  listPeriods(opts: { period_type?: string | null } & PaginateOptions = {}) {
    const { period_type } = opts;
    const where  = period_type ? 'WHERE period_type = ?' : '';
    const params = period_type ? [period_type] : [];
    return paginate<WvPeriod>(
      this.db,
      `SELECT ${PERIOD_COLS} FROM wv_periods ${where} ORDER BY sort_order, start_year`,
      `SELECT COUNT(*) AS count FROM wv_periods ${where}`,
      params, opts,
    );
  }

  findPeriodById(id: string): Promise<WvPeriod | null> {
    return queryOne<WvPeriod>(
      this.db, `SELECT ${PERIOD_COLS} FROM wv_periods WHERE id = ?`, [id],
    );
  }

  async createPeriod(input: PeriodCreate): Promise<WvPeriod> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_periods
         (id, slug, title, period_type, start_year, end_year, is_approximate,
          civilizational_label, description_md, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.period_type ?? 'era',
        input.start_year ?? null,
        input.end_year ?? null,
        input.is_approximate ?? 0,
        input.civilizational_label ?? null,
        input.description_md ?? null,
        input.sort_order ?? 0,
        now,
      ],
    );
    return (await this.findPeriodById(id))!;
  }

  // ── wv_regions ─────────────────────────────────────────────────────────────

  listRegions(opts: { region_type?: string | null; parent_id?: string | null } & PaginateOptions = {}) {
    const { region_type, parent_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (region_type) { conds.push('region_type = ?'); params.push(region_type); }
    if (parent_id)   { conds.push('parent_id = ?');   params.push(parent_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvRegion>(
      this.db,
      `SELECT ${REGION_COLS} FROM wv_regions ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_regions ${where}`,
      params, opts,
    );
  }

  findRegionById(id: string): Promise<WvRegion | null> {
    return queryOne<WvRegion>(
      this.db, `SELECT ${REGION_COLS} FROM wv_regions WHERE id = ?`, [id],
    );
  }

  async createRegion(input: RegionCreate): Promise<WvRegion> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_regions
         (id, slug, title, region_type, parent_id, description_md, bounding_box, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.region_type ?? 'macro',
        input.parent_id ?? null,
        input.description_md ?? null,
        input.bounding_box ?? null,
        now,
      ],
    );
    return (await this.findRegionById(id))!;
  }

  // ── wv_locations ───────────────────────────────────────────────────────────

  listLocations(opts: {
    location_type?: string | null;
    region_id?: string | null;
  } & PaginateOptions = {}) {
    const { location_type, region_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (location_type) { conds.push('location_type = ?'); params.push(location_type); }
    if (region_id)     { conds.push('region_id = ?');     params.push(region_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvLocation>(
      this.db,
      `SELECT ${LOCATION_COLS} FROM wv_locations ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_locations ${where}`,
      params, opts,
    );
  }

  findLocationById(id: string): Promise<WvLocation | null> {
    return queryOne<WvLocation>(
      this.db, `SELECT ${LOCATION_COLS} FROM wv_locations WHERE id = ?`, [id],
    );
  }

  async createLocation(input: LocationCreate): Promise<WvLocation> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_locations
         (id, slug, title, title_ar, location_type, region_id, latitude, longitude,
          modern_name, modern_country, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.title_ar ?? null,
        input.location_type ?? 'city',
        input.region_id ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        input.modern_name ?? null,
        input.modern_country ?? null,
        input.description_md ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findLocationById(id))!;
  }

  // ── wv_institutions ────────────────────────────────────────────────────────

  listInstitutions(opts: {
    institution_type?: string | null;
    tradition_id?: string | null;
    location_id?: string | null;
  } & PaginateOptions = {}) {
    const { institution_type, tradition_id, location_id } = opts;
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (institution_type) { conds.push('institution_type = ?'); params.push(institution_type); }
    if (tradition_id)     { conds.push('tradition_id = ?');     params.push(tradition_id); }
    if (location_id)      { conds.push('location_id = ?');      params.push(location_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvInstitution>(
      this.db,
      `SELECT ${INST_COLS} FROM wv_institutions ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_institutions ${where}`,
      params, opts,
    );
  }

  findInstitutionById(id: string): Promise<WvInstitution | null> {
    return queryOne<WvInstitution>(
      this.db, `SELECT ${INST_COLS} FROM wv_institutions WHERE id = ?`, [id],
    );
  }

  async createInstitution(input: InstitutionCreate): Promise<WvInstitution> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_institutions
         (id, slug, title, title_ar, institution_type, tradition_id, location_id, period_id,
          founded_year, dissolved_year, description_md, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.title_ar ?? null,
        input.institution_type ?? 'religious',
        input.tradition_id ?? null,
        input.location_id ?? null,
        input.period_id ?? null,
        input.founded_year ?? null,
        input.dissolved_year ?? null,
        input.description_md ?? null,
        input.meta_json ?? null,
        now, now,
      ],
    );
    return (await this.findInstitutionById(id))!;
  }

  async patchInstitution(id: string, patch: InstitutionPatch): Promise<WvInstitution | null> {
    const now  = new Date().toISOString();
    const sets: string[]   = ['updated_at = ?'];
    const vals: unknown[]  = [now];

    const MAP: [keyof InstitutionPatch, string][] = [
      ['title',            'title = ?'],
      ['title_ar',         'title_ar = ?'],
      ['institution_type', 'institution_type = ?'],
      ['tradition_id',     'tradition_id = ?'],
      ['location_id',      'location_id = ?'],
      ['period_id',        'period_id = ?'],
      ['founded_year',     'founded_year = ?'],
      ['dissolved_year',   'dissolved_year = ?'],
      ['description_md',   'description_md = ?'],
      ['meta_json',        'meta_json = ?'],
    ];
    for (const [key, sql] of MAP) {
      if (key in patch) { sets.push(sql); vals.push(patch[key] ?? null); }
    }
    vals.push(id);
    await execute(
      this.db,
      `UPDATE wv_institutions SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findInstitutionById(id);
  }
}

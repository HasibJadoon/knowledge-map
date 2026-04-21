// ─── Tradition schemas & types ────────────────────────────────────────────────
// Tables: wv_traditions, wv_tradition_branches, wv_schools, wv_movements

// ── wv_traditions ─────────────────────────────────────────────────────────────

export type WvTraditionType =
  | 'religion'
  | 'philosophy'
  | 'ideology'
  | 'cultural'
  | 'spiritual'
  | 'other';

export interface WvTradition {
  id: string;               // WV:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_type: WvTraditionType;
  domain_id: string | null;
  parent_id: string | null;
  founded_period: string | null;
  geographic_origin: string | null;
  scripture_refs: string | null;   // JSON [{title,lang,canon_status}]
  core_beliefs: string | null;     // JSON [string]
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvTraditionCreate {
  title: string;
  slug: string;
  tradition_type?: WvTraditionType;
  title_ar?: string | null;
  domain_id?: string | null;
  parent_id?: string | null;
  founded_period?: string | null;
  geographic_origin?: string | null;
  scripture_refs?: string | null;
  core_beliefs?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface WvTraditionPatch {
  title?: string;
  slug?: string;
  tradition_type?: WvTraditionType;
  title_ar?: string | null;
  domain_id?: string | null;
  parent_id?: string | null;
  founded_period?: string | null;
  geographic_origin?: string | null;
  scripture_refs?: string | null;
  core_beliefs?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export function validateWvTraditionCreate(
  body: unknown
): { data: WvTraditionCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (!b.title || typeof b.title !== 'string')
    return { error: 'title is required and must be a string' };
  if (!b.slug || typeof b.slug !== 'string')
    return { error: 'slug is required and must be a string' };
  const validTypes: WvTraditionType[] = [
    'religion', 'philosophy', 'ideology', 'cultural', 'spiritual', 'other',
  ];
  if (b.tradition_type !== undefined && !validTypes.includes(b.tradition_type as WvTraditionType))
    return { error: `tradition_type must be one of: ${validTypes.join(', ')}` };
  return {
    data: {
      title: b.title as string,
      slug: b.slug as string,
      tradition_type: (b.tradition_type as WvTraditionType) ?? 'religion',
      title_ar: (b.title_ar as string | null) ?? null,
      domain_id: (b.domain_id as string | null) ?? null,
      parent_id: (b.parent_id as string | null) ?? null,
      founded_period: (b.founded_period as string | null) ?? null,
      geographic_origin: (b.geographic_origin as string | null) ?? null,
      scripture_refs: (b.scripture_refs as string | null) ?? null,
      core_beliefs: (b.core_beliefs as string | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
      meta_json: (b.meta_json as string | null) ?? null,
    },
  };
}

export function validateWvTraditionPatch(
  body: unknown
): { data: WvTraditionPatch } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  const validTypes: WvTraditionType[] = [
    'religion', 'philosophy', 'ideology', 'cultural', 'spiritual', 'other',
  ];
  if (b.tradition_type !== undefined && !validTypes.includes(b.tradition_type as WvTraditionType))
    return { error: `tradition_type must be one of: ${validTypes.join(', ')}` };
  const patch: WvTraditionPatch = {};
  if (b.title !== undefined) patch.title = b.title as string;
  if (b.slug !== undefined) patch.slug = b.slug as string;
  if (b.tradition_type !== undefined) patch.tradition_type = b.tradition_type as WvTraditionType;
  if ('title_ar' in b) patch.title_ar = (b.title_ar as string | null) ?? null;
  if ('domain_id' in b) patch.domain_id = (b.domain_id as string | null) ?? null;
  if ('parent_id' in b) patch.parent_id = (b.parent_id as string | null) ?? null;
  if ('founded_period' in b) patch.founded_period = (b.founded_period as string | null) ?? null;
  if ('geographic_origin' in b) patch.geographic_origin = (b.geographic_origin as string | null) ?? null;
  if ('scripture_refs' in b) patch.scripture_refs = (b.scripture_refs as string | null) ?? null;
  if ('core_beliefs' in b) patch.core_beliefs = (b.core_beliefs as string | null) ?? null;
  if ('description_md' in b) patch.description_md = (b.description_md as string | null) ?? null;
  if ('meta_json' in b) patch.meta_json = (b.meta_json as string | null) ?? null;
  return { data: patch };
}

// ── wv_tradition_branches ──────────────────────────────────────────────────────

export type WvTraditionBranchType =
  | 'doctrinal'
  | 'legal'
  | 'liturgical'
  | 'ethnic'
  | 'regional'
  | 'reform'
  | 'other';

export interface WvTraditionBranch {
  id: string;               // WV:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_id: string;
  branch_type: WvTraditionBranchType;
  parent_id: string | null;
  description_md: string | null;
  period_range: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvTraditionBranchCreate {
  title: string;
  slug: string;
  tradition_id: string;
  branch_type?: WvTraditionBranchType;
  title_ar?: string | null;
  parent_id?: string | null;
  description_md?: string | null;
  period_range?: string | null;
}

export interface WvTraditionBranchPatch {
  title?: string;
  slug?: string;
  tradition_id?: string;
  branch_type?: WvTraditionBranchType;
  title_ar?: string | null;
  parent_id?: string | null;
  description_md?: string | null;
  period_range?: string | null;
}

export function validateWvTraditionBranchCreate(
  body: unknown
): { data: WvTraditionBranchCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (!b.title || typeof b.title !== 'string')
    return { error: 'title is required and must be a string' };
  if (!b.slug || typeof b.slug !== 'string')
    return { error: 'slug is required and must be a string' };
  if (!b.tradition_id || typeof b.tradition_id !== 'string')
    return { error: 'tradition_id is required and must be a string' };
  const validTypes: WvTraditionBranchType[] = [
    'doctrinal', 'legal', 'liturgical', 'ethnic', 'regional', 'reform', 'other',
  ];
  if (b.branch_type !== undefined && !validTypes.includes(b.branch_type as WvTraditionBranchType))
    return { error: `branch_type must be one of: ${validTypes.join(', ')}` };
  return {
    data: {
      title: b.title as string,
      slug: b.slug as string,
      tradition_id: b.tradition_id as string,
      branch_type: (b.branch_type as WvTraditionBranchType) ?? 'doctrinal',
      title_ar: (b.title_ar as string | null) ?? null,
      parent_id: (b.parent_id as string | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
      period_range: (b.period_range as string | null) ?? null,
    },
  };
}

// ── wv_schools ────────────────────────────────────────────────────────────────

export type WvSchoolType =
  | 'theological'
  | 'legal'
  | 'philosophical'
  | 'interpretive'
  | 'denominational'
  | 'other';

export interface WvSchool {
  id: string;               // WV:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  school_type: WvSchoolType;
  tradition_id: string | null;
  branch_id: string | null;
  founded_year: number | null;
  founder_name: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvSchoolCreate {
  title: string;
  slug: string;
  school_type?: WvSchoolType;
  title_ar?: string | null;
  tradition_id?: string | null;
  branch_id?: string | null;
  founded_year?: number | null;
  founder_name?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface WvSchoolPatch {
  title?: string;
  slug?: string;
  school_type?: WvSchoolType;
  title_ar?: string | null;
  tradition_id?: string | null;
  branch_id?: string | null;
  founded_year?: number | null;
  founder_name?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export function validateWvSchoolCreate(
  body: unknown
): { data: WvSchoolCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (!b.title || typeof b.title !== 'string')
    return { error: 'title is required and must be a string' };
  if (!b.slug || typeof b.slug !== 'string')
    return { error: 'slug is required and must be a string' };
  const validTypes: WvSchoolType[] = [
    'theological', 'legal', 'philosophical', 'interpretive', 'denominational', 'other',
  ];
  if (b.school_type !== undefined && !validTypes.includes(b.school_type as WvSchoolType))
    return { error: `school_type must be one of: ${validTypes.join(', ')}` };
  return {
    data: {
      title: b.title as string,
      slug: b.slug as string,
      school_type: (b.school_type as WvSchoolType) ?? 'theological',
      title_ar: (b.title_ar as string | null) ?? null,
      tradition_id: (b.tradition_id as string | null) ?? null,
      branch_id: (b.branch_id as string | null) ?? null,
      founded_year: (b.founded_year as number | null) ?? null,
      founder_name: (b.founder_name as string | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
      meta_json: (b.meta_json as string | null) ?? null,
    },
  };
}

// ── wv_movements ──────────────────────────────────────────────────────────────

export type WvMovementType =
  | 'revival'
  | 'reform'
  | 'monastic'
  | 'missionary'
  | 'nationalist'
  | 'secular'
  | 'liberation'
  | 'ideological'
  | 'modern'
  | 'other';

export interface WvMovement {
  id: string;               // WV:ULID
  slug: string;
  title: string;
  movement_type: WvMovementType;
  tradition_id: string | null;
  period_id: string | null;
  region_id: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvMovementCreate {
  title: string;
  slug: string;
  movement_type?: WvMovementType;
  tradition_id?: string | null;
  period_id?: string | null;
  region_id?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface WvMovementPatch {
  title?: string;
  slug?: string;
  movement_type?: WvMovementType;
  tradition_id?: string | null;
  period_id?: string | null;
  region_id?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export function validateWvMovementCreate(
  body: unknown
): { data: WvMovementCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (!b.title || typeof b.title !== 'string')
    return { error: 'title is required and must be a string' };
  if (!b.slug || typeof b.slug !== 'string')
    return { error: 'slug is required and must be a string' };
  const validTypes: WvMovementType[] = [
    'revival', 'reform', 'monastic', 'missionary', 'nationalist',
    'secular', 'liberation', 'ideological', 'modern', 'other',
  ];
  if (b.movement_type !== undefined && !validTypes.includes(b.movement_type as WvMovementType))
    return { error: `movement_type must be one of: ${validTypes.join(', ')}` };
  return {
    data: {
      title: b.title as string,
      slug: b.slug as string,
      movement_type: (b.movement_type as WvMovementType) ?? 'revival',
      tradition_id: (b.tradition_id as string | null) ?? null,
      period_id: (b.period_id as string | null) ?? null,
      region_id: (b.region_id as string | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
      meta_json: (b.meta_json as string | null) ?? null,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface Tradition {
  id: string;           // WV:ULID
  slug: string;
  label_en: string;
  label_ar: string | null;
  category: string;     // abrahamic | eastern | secular | tribal | other
  parent_id: string | null;
  created_at: string;
}

export interface TraditionCreate {
  slug: string;
  label_en: string;
  label_ar?: string | null;
  category?: string;
  parent_id?: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateWvTraditionBranchPatch(body: unknown): SchemaValidationResult<WvTraditionBranchPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('slug' in b) {
    if (typeof b.slug !== 'string') return { error: 'slug must be a string' };
    data.slug = b.slug;
  }
  if ('tradition_id' in b) {
    if (typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string' };
    data.tradition_id = b.tradition_id;
  }
  if ('branch_type' in b) {
    data.branch_type = b.branch_type;
  }
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('period_range' in b) {
    if (b.period_range !== null && typeof b.period_range !== 'string') return { error: 'period_range must be a string or null' };
    data.period_range = b.period_range;
  }

  return { data: data as unknown as WvTraditionBranchPatch };
}

export function validateWvSchoolPatch(body: unknown): SchemaValidationResult<WvSchoolPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('slug' in b) {
    if (typeof b.slug !== 'string') return { error: 'slug must be a string' };
    data.slug = b.slug;
  }
  if ('school_type' in b) {
    data.school_type = b.school_type;
  }
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('branch_id' in b) {
    if (b.branch_id !== null && typeof b.branch_id !== 'string') return { error: 'branch_id must be a string or null' };
    data.branch_id = b.branch_id;
  }
  if ('founded_year' in b) {
    if (b.founded_year !== null && (typeof b.founded_year !== 'number' || !Number.isFinite(b.founded_year))) return { error: 'founded_year must be a number or null' };
    data.founded_year = b.founded_year;
  }
  if ('founder_name' in b) {
    if (b.founder_name !== null && typeof b.founder_name !== 'string') return { error: 'founder_name must be a string or null' };
    data.founder_name = b.founder_name;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as WvSchoolPatch };
}

export function validateWvMovementPatch(body: unknown): SchemaValidationResult<WvMovementPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('slug' in b) {
    if (typeof b.slug !== 'string') return { error: 'slug must be a string' };
    data.slug = b.slug;
  }
  if ('movement_type' in b) {
    data.movement_type = b.movement_type;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('period_id' in b) {
    if (b.period_id !== null && typeof b.period_id !== 'string') return { error: 'period_id must be a string or null' };
    data.period_id = b.period_id;
  }
  if ('region_id' in b) {
    if (b.region_id !== null && typeof b.region_id !== 'string') return { error: 'region_id must be a string or null' };
    data.region_id = b.region_id;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as WvMovementPatch };
}

export function validateTraditionCreate(body: unknown): SchemaValidationResult<TraditionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.label_en !== 'string' || !b.label_en.trim()) return { error: 'label_en is required and must be a non-empty string' };
  data.label_en = b.label_en.trim();
  if ('label_ar' in b) {
    if (b.label_ar !== null && typeof b.label_ar !== 'string') return { error: 'label_ar must be a string or null' };
    data.label_ar = b.label_ar;
  }
  if ('category' in b) {
    if (typeof b.category !== 'string') return { error: 'category must be a string' };
    data.category = b.category;
  }
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }

  return { data: data as unknown as TraditionCreate };
}

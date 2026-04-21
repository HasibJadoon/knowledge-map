// ─── Domain schemas & types ────────────────────────────────────────────────────
// Tables: wv_domains, wv_periods, wv_regions, wv_locations, wv_institutions

// ── wv_domains ────────────────────────────────────────────────────────────────

export interface WvDomain {
  id: string;               // WV:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface WvDomainCreate {
  title: string;
  slug: string;
  title_ar?: string | null;
  description?: string | null;
  sort_order?: number;
}

export interface WvDomainPatch {
  title?: string;
  slug?: string;
  title_ar?: string | null;
  description?: string | null;
  sort_order?: number;
}

export function validateWvDomainCreate(
  body: unknown
): { data: WvDomainCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (!b.title || typeof b.title !== 'string')
    return { error: 'title is required and must be a string' };
  if (!b.slug || typeof b.slug !== 'string')
    return { error: 'slug is required and must be a string' };
  return {
    data: {
      title: b.title as string,
      slug: b.slug as string,
      title_ar: (b.title_ar as string | null) ?? null,
      description: (b.description as string | null) ?? null,
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : 0,
    },
  };
}

export function validateWvDomainPatch(
  body: unknown
): { data: WvDomainPatch } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  const patch: WvDomainPatch = {};
  if (b.title !== undefined) patch.title = b.title as string;
  if (b.slug !== undefined) patch.slug = b.slug as string;
  if ('title_ar' in b) patch.title_ar = (b.title_ar as string | null) ?? null;
  if ('description' in b) patch.description = (b.description as string | null) ?? null;
  if (b.sort_order !== undefined) patch.sort_order = b.sort_order as number;
  return { data: patch };
}

// ── wv_periods ────────────────────────────────────────────────────────────────

export type WvPeriodType = 'era' | 'century' | 'epoch' | 'generation' | 'reign' | 'phase';

export interface WvPeriod {
  id: string;               // WV:ULID
  slug: string;
  title: string;
  period_type: WvPeriodType;
  start_year: number | null;
  end_year: number | null;
  is_approximate: boolean;
  civilizational_label: string | null;
  description_md: string | null;
  sort_order: number;
  created_at: string;
}

export interface WvPeriodCreate {
  title: string;
  slug: string;
  period_type?: WvPeriodType;
  start_year?: number | null;
  end_year?: number | null;
  is_approximate?: boolean;
  civilizational_label?: string | null;
  description_md?: string | null;
  sort_order?: number;
}

export interface WvPeriodPatch {
  title?: string;
  slug?: string;
  period_type?: WvPeriodType;
  start_year?: number | null;
  end_year?: number | null;
  is_approximate?: boolean;
  civilizational_label?: string | null;
  description_md?: string | null;
  sort_order?: number;
}

export function validateWvPeriodCreate(
  body: unknown
): { data: WvPeriodCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (!b.title || typeof b.title !== 'string')
    return { error: 'title is required and must be a string' };
  if (!b.slug || typeof b.slug !== 'string')
    return { error: 'slug is required and must be a string' };
  const validTypes: WvPeriodType[] = ['era', 'century', 'epoch', 'generation', 'reign', 'phase'];
  if (b.period_type !== undefined && !validTypes.includes(b.period_type as WvPeriodType))
    return { error: `period_type must be one of: ${validTypes.join(', ')}` };
  return {
    data: {
      title: b.title as string,
      slug: b.slug as string,
      period_type: (b.period_type as WvPeriodType) ?? 'era',
      start_year: (b.start_year as number | null) ?? null,
      end_year: (b.end_year as number | null) ?? null,
      is_approximate: typeof b.is_approximate === 'boolean' ? b.is_approximate : false,
      civilizational_label: (b.civilizational_label as string | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : 0,
    },
  };
}

// ── wv_regions ────────────────────────────────────────────────────────────────

export type WvRegionType = 'macro' | 'civilizational' | 'geopolitical' | 'cultural' | 'diaspora';

export interface WvRegion {
  id: string;               // WV:ULID
  slug: string;
  title: string;
  region_type: WvRegionType;
  parent_id: string | null;
  description_md: string | null;
  bounding_box: string | null;   // JSON {north,south,east,west}
  created_at: string;
}

export interface WvRegionCreate {
  title: string;
  slug: string;
  region_type?: WvRegionType;
  parent_id?: string | null;
  description_md?: string | null;
  bounding_box?: string | null;
}

export interface WvRegionPatch {
  title?: string;
  slug?: string;
  region_type?: WvRegionType;
  parent_id?: string | null;
  description_md?: string | null;
  bounding_box?: string | null;
}

export function validateWvRegionCreate(
  body: unknown
): { data: WvRegionCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (!b.title || typeof b.title !== 'string')
    return { error: 'title is required and must be a string' };
  if (!b.slug || typeof b.slug !== 'string')
    return { error: 'slug is required and must be a string' };
  const validTypes: WvRegionType[] = [
    'macro', 'civilizational', 'geopolitical', 'cultural', 'diaspora',
  ];
  if (b.region_type !== undefined && !validTypes.includes(b.region_type as WvRegionType))
    return { error: `region_type must be one of: ${validTypes.join(', ')}` };
  return {
    data: {
      title: b.title as string,
      slug: b.slug as string,
      region_type: (b.region_type as WvRegionType) ?? 'macro',
      parent_id: (b.parent_id as string | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
      bounding_box: (b.bounding_box as string | null) ?? null,
    },
  };
}

// ── wv_locations ──────────────────────────────────────────────────────────────

export type WvLocationType =
  | 'city'
  | 'site'
  | 'institution'
  | 'pilgrimage_node'
  | 'debate_center'
  | 'monastery'
  | 'seminary'
  | 'court'
  | 'university'
  | 'region'
  | 'other';

export interface WvLocation {
  id: string;               // WV:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  location_type: WvLocationType;
  region_id: string | null;
  latitude: number | null;
  longitude: number | null;
  modern_name: string | null;
  modern_country: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvLocationCreate {
  title: string;
  slug: string;
  location_type?: WvLocationType;
  title_ar?: string | null;
  region_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  modern_name?: string | null;
  modern_country?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface WvLocationPatch {
  title?: string;
  slug?: string;
  location_type?: WvLocationType;
  title_ar?: string | null;
  region_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  modern_name?: string | null;
  modern_country?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export function validateWvLocationCreate(
  body: unknown
): { data: WvLocationCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (!b.title || typeof b.title !== 'string')
    return { error: 'title is required and must be a string' };
  if (!b.slug || typeof b.slug !== 'string')
    return { error: 'slug is required and must be a string' };
  const validTypes: WvLocationType[] = [
    'city', 'site', 'institution', 'pilgrimage_node', 'debate_center',
    'monastery', 'seminary', 'court', 'university', 'region', 'other',
  ];
  if (b.location_type !== undefined && !validTypes.includes(b.location_type as WvLocationType))
    return { error: `location_type must be one of: ${validTypes.join(', ')}` };
  return {
    data: {
      title: b.title as string,
      slug: b.slug as string,
      location_type: (b.location_type as WvLocationType) ?? 'city',
      title_ar: (b.title_ar as string | null) ?? null,
      region_id: (b.region_id as string | null) ?? null,
      latitude: (b.latitude as number | null) ?? null,
      longitude: (b.longitude as number | null) ?? null,
      modern_name: (b.modern_name as string | null) ?? null,
      modern_country: (b.modern_country as string | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
      meta_json: (b.meta_json as string | null) ?? null,
    },
  };
}

// ── wv_institutions ───────────────────────────────────────────────────────────

export type WvInstitutionType =
  | 'religious'
  | 'educational'
  | 'legal'
  | 'charitable'
  | 'political'
  | 'monastic'
  | 'missionary'
  | 'court'
  | 'council'
  | 'waqf'
  | 'other';

export interface WvInstitution {
  id: string;               // WV:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  institution_type: WvInstitutionType;
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

export interface WvInstitutionCreate {
  title: string;
  slug: string;
  institution_type?: WvInstitutionType;
  title_ar?: string | null;
  tradition_id?: string | null;
  location_id?: string | null;
  period_id?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface WvInstitutionPatch {
  title?: string;
  slug?: string;
  institution_type?: WvInstitutionType;
  title_ar?: string | null;
  tradition_id?: string | null;
  location_id?: string | null;
  period_id?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export function validateWvInstitutionCreate(
  body: unknown
): { data: WvInstitutionCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (!b.title || typeof b.title !== 'string')
    return { error: 'title is required and must be a string' };
  if (!b.slug || typeof b.slug !== 'string')
    return { error: 'slug is required and must be a string' };
  const validTypes: WvInstitutionType[] = [
    'religious', 'educational', 'legal', 'charitable', 'political',
    'monastic', 'missionary', 'court', 'council', 'waqf', 'other',
  ];
  if (b.institution_type !== undefined && !validTypes.includes(b.institution_type as WvInstitutionType))
    return { error: `institution_type must be one of: ${validTypes.join(', ')}` };
  return {
    data: {
      title: b.title as string,
      slug: b.slug as string,
      institution_type: (b.institution_type as WvInstitutionType) ?? 'religious',
      title_ar: (b.title_ar as string | null) ?? null,
      tradition_id: (b.tradition_id as string | null) ?? null,
      location_id: (b.location_id as string | null) ?? null,
      period_id: (b.period_id as string | null) ?? null,
      founded_year: (b.founded_year as number | null) ?? null,
      dissolved_year: (b.dissolved_year as number | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
      meta_json: (b.meta_json as string | null) ?? null,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

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

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateWvPeriodPatch(body: unknown): SchemaValidationResult<WvPeriodPatch> {
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
  if ('period_type' in b) {
    data.period_type = b.period_type;
  }
  if ('start_year' in b) {
    if (b.start_year !== null && (typeof b.start_year !== 'number' || !Number.isFinite(b.start_year))) return { error: 'start_year must be a number or null' };
    data.start_year = b.start_year;
  }
  if ('end_year' in b) {
    if (b.end_year !== null && (typeof b.end_year !== 'number' || !Number.isFinite(b.end_year))) return { error: 'end_year must be a number or null' };
    data.end_year = b.end_year;
  }
  if ('is_approximate' in b) {
    if (typeof b.is_approximate !== 'boolean') return { error: 'is_approximate must be a boolean' };
    data.is_approximate = b.is_approximate;
  }
  if ('civilizational_label' in b) {
    if (b.civilizational_label !== null && typeof b.civilizational_label !== 'string') return { error: 'civilizational_label must be a string or null' };
    data.civilizational_label = b.civilizational_label;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as WvPeriodPatch };
}

export function validateWvRegionPatch(body: unknown): SchemaValidationResult<WvRegionPatch> {
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
  if ('region_type' in b) {
    data.region_type = b.region_type;
  }
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('bounding_box' in b) {
    if (b.bounding_box !== null && typeof b.bounding_box !== 'string') return { error: 'bounding_box must be a string or null' };
    data.bounding_box = b.bounding_box;
  }

  return { data: data as unknown as WvRegionPatch };
}

export function validateWvLocationPatch(body: unknown): SchemaValidationResult<WvLocationPatch> {
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
  if ('location_type' in b) {
    data.location_type = b.location_type;
  }
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('region_id' in b) {
    if (b.region_id !== null && typeof b.region_id !== 'string') return { error: 'region_id must be a string or null' };
    data.region_id = b.region_id;
  }
  if ('latitude' in b) {
    if (b.latitude !== null && (typeof b.latitude !== 'number' || !Number.isFinite(b.latitude))) return { error: 'latitude must be a number or null' };
    data.latitude = b.latitude;
  }
  if ('longitude' in b) {
    if (b.longitude !== null && (typeof b.longitude !== 'number' || !Number.isFinite(b.longitude))) return { error: 'longitude must be a number or null' };
    data.longitude = b.longitude;
  }
  if ('modern_name' in b) {
    if (b.modern_name !== null && typeof b.modern_name !== 'string') return { error: 'modern_name must be a string or null' };
    data.modern_name = b.modern_name;
  }
  if ('modern_country' in b) {
    if (b.modern_country !== null && typeof b.modern_country !== 'string') return { error: 'modern_country must be a string or null' };
    data.modern_country = b.modern_country;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as WvLocationPatch };
}

export function validateWvInstitutionPatch(body: unknown): SchemaValidationResult<WvInstitutionPatch> {
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
  if ('institution_type' in b) {
    data.institution_type = b.institution_type;
  }
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('location_id' in b) {
    if (b.location_id !== null && typeof b.location_id !== 'string') return { error: 'location_id must be a string or null' };
    data.location_id = b.location_id;
  }
  if ('period_id' in b) {
    if (b.period_id !== null && typeof b.period_id !== 'string') return { error: 'period_id must be a string or null' };
    data.period_id = b.period_id;
  }
  if ('founded_year' in b) {
    if (b.founded_year !== null && (typeof b.founded_year !== 'number' || !Number.isFinite(b.founded_year))) return { error: 'founded_year must be a number or null' };
    data.founded_year = b.founded_year;
  }
  if ('dissolved_year' in b) {
    if (b.dissolved_year !== null && (typeof b.dissolved_year !== 'number' || !Number.isFinite(b.dissolved_year))) return { error: 'dissolved_year must be a number or null' };
    data.dissolved_year = b.dissolved_year;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as WvInstitutionPatch };
}

export function validateDomainCreate(body: unknown): SchemaValidationResult<DomainCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') return { error: 'description must be a string or null' };
    data.description = b.description;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as DomainCreate };
}

export function validatePeriodCreate(body: unknown): SchemaValidationResult<PeriodCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('period_type' in b) {
    if (typeof b.period_type !== 'string') return { error: 'period_type must be a string' };
    data.period_type = b.period_type;
  }
  if ('start_year' in b) {
    if (b.start_year !== null && (typeof b.start_year !== 'number' || !Number.isFinite(b.start_year))) return { error: 'start_year must be a number or null' };
    data.start_year = b.start_year;
  }
  if ('end_year' in b) {
    if (b.end_year !== null && (typeof b.end_year !== 'number' || !Number.isFinite(b.end_year))) return { error: 'end_year must be a number or null' };
    data.end_year = b.end_year;
  }
  if ('is_approximate' in b) {
    if (typeof b.is_approximate !== 'number' || !Number.isFinite(b.is_approximate)) return { error: 'is_approximate must be a number' };
    data.is_approximate = b.is_approximate;
  }
  if ('civilizational_label' in b) {
    if (b.civilizational_label !== null && typeof b.civilizational_label !== 'string') return { error: 'civilizational_label must be a string or null' };
    data.civilizational_label = b.civilizational_label;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as PeriodCreate };
}

export function validateRegionCreate(body: unknown): SchemaValidationResult<RegionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('region_type' in b) {
    if (typeof b.region_type !== 'string') return { error: 'region_type must be a string' };
    data.region_type = b.region_type;
  }
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('bounding_box' in b) {
    if (b.bounding_box !== null && typeof b.bounding_box !== 'string') return { error: 'bounding_box must be a string or null' };
    data.bounding_box = b.bounding_box;
  }

  return { data: data as unknown as RegionCreate };
}

export function validateLocationCreate(body: unknown): SchemaValidationResult<LocationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('location_type' in b) {
    if (typeof b.location_type !== 'string') return { error: 'location_type must be a string' };
    data.location_type = b.location_type;
  }
  if ('region_id' in b) {
    if (b.region_id !== null && typeof b.region_id !== 'string') return { error: 'region_id must be a string or null' };
    data.region_id = b.region_id;
  }
  if ('latitude' in b) {
    if (b.latitude !== null && (typeof b.latitude !== 'number' || !Number.isFinite(b.latitude))) return { error: 'latitude must be a number or null' };
    data.latitude = b.latitude;
  }
  if ('longitude' in b) {
    if (b.longitude !== null && (typeof b.longitude !== 'number' || !Number.isFinite(b.longitude))) return { error: 'longitude must be a number or null' };
    data.longitude = b.longitude;
  }
  if ('modern_name' in b) {
    if (b.modern_name !== null && typeof b.modern_name !== 'string') return { error: 'modern_name must be a string or null' };
    data.modern_name = b.modern_name;
  }
  if ('modern_country' in b) {
    if (b.modern_country !== null && typeof b.modern_country !== 'string') return { error: 'modern_country must be a string or null' };
    data.modern_country = b.modern_country;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as LocationCreate };
}

export function validateInstitutionCreate(body: unknown): SchemaValidationResult<InstitutionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('institution_type' in b) {
    if (typeof b.institution_type !== 'string') return { error: 'institution_type must be a string' };
    data.institution_type = b.institution_type;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('location_id' in b) {
    if (b.location_id !== null && typeof b.location_id !== 'string') return { error: 'location_id must be a string or null' };
    data.location_id = b.location_id;
  }
  if ('period_id' in b) {
    if (b.period_id !== null && typeof b.period_id !== 'string') return { error: 'period_id must be a string or null' };
    data.period_id = b.period_id;
  }
  if ('founded_year' in b) {
    if (b.founded_year !== null && (typeof b.founded_year !== 'number' || !Number.isFinite(b.founded_year))) return { error: 'founded_year must be a number or null' };
    data.founded_year = b.founded_year;
  }
  if ('dissolved_year' in b) {
    if (b.dissolved_year !== null && (typeof b.dissolved_year !== 'number' || !Number.isFinite(b.dissolved_year))) return { error: 'dissolved_year must be a number or null' };
    data.dissolved_year = b.dissolved_year;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as InstitutionCreate };
}

export function validateInstitutionPatch(body: unknown): SchemaValidationResult<InstitutionPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('institution_type' in b) {
    if (typeof b.institution_type !== 'string') return { error: 'institution_type must be a string' };
    data.institution_type = b.institution_type;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('location_id' in b) {
    if (b.location_id !== null && typeof b.location_id !== 'string') return { error: 'location_id must be a string or null' };
    data.location_id = b.location_id;
  }
  if ('period_id' in b) {
    if (b.period_id !== null && typeof b.period_id !== 'string') return { error: 'period_id must be a string or null' };
    data.period_id = b.period_id;
  }
  if ('founded_year' in b) {
    if (b.founded_year !== null && (typeof b.founded_year !== 'number' || !Number.isFinite(b.founded_year))) return { error: 'founded_year must be a number or null' };
    data.founded_year = b.founded_year;
  }
  if ('dissolved_year' in b) {
    if (b.dissolved_year !== null && (typeof b.dissolved_year !== 'number' || !Number.isFinite(b.dissolved_year))) return { error: 'dissolved_year must be a number or null' };
    data.dissolved_year = b.dissolved_year;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as InstitutionPatch };
}

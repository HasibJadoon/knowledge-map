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

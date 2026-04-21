// ─── People schemas & types ───────────────────────────────────────────────

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

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validatePersonCreate(body: unknown): SchemaValidationResult<PersonCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.name !== 'string' || !b.name.trim()) return { error: 'name is required and must be a non-empty string' };
  data.name = b.name.trim();
  if ('name_ar' in b) {
    if (b.name_ar !== null && typeof b.name_ar !== 'string') return { error: 'name_ar must be a string or null' };
    data.name_ar = b.name_ar;
  }
  if ('slug' in b) {
    if (b.slug !== null && typeof b.slug !== 'string') return { error: 'slug must be a string or null' };
    data.slug = b.slug;
  }
  if ('person_type' in b) {
    if (typeof b.person_type !== 'string') return { error: 'person_type must be a string' };
    data.person_type = b.person_type;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('era' in b) {
    if (b.era !== null && typeof b.era !== 'string') return { error: 'era must be a string or null' };
    data.era = b.era;
  }
  if ('birth_year' in b) {
    if (b.birth_year !== null && (typeof b.birth_year !== 'number' || !Number.isFinite(b.birth_year))) return { error: 'birth_year must be a number or null' };
    data.birth_year = b.birth_year;
  }
  if ('death_year' in b) {
    if (b.death_year !== null && (typeof b.death_year !== 'number' || !Number.isFinite(b.death_year))) return { error: 'death_year must be a number or null' };
    data.death_year = b.death_year;
  }
  if ('birth_location_id' in b) {
    if (b.birth_location_id !== null && typeof b.birth_location_id !== 'string') return { error: 'birth_location_id must be a string or null' };
    data.birth_location_id = b.birth_location_id;
  }
  if ('death_location_id' in b) {
    if (b.death_location_id !== null && typeof b.death_location_id !== 'string') return { error: 'death_location_id must be a string or null' };
    data.death_location_id = b.death_location_id;
  }
  if ('nationality' in b) {
    if (b.nationality !== null && typeof b.nationality !== 'string') return { error: 'nationality must be a string or null' };
    data.nationality = b.nationality;
  }
  if ('affiliation' in b) {
    if (b.affiliation !== null && typeof b.affiliation !== 'string') return { error: 'affiliation must be a string or null' };
    data.affiliation = b.affiliation;
  }
  if ('bio_md' in b) {
    if (b.bio_md !== null && typeof b.bio_md !== 'string') return { error: 'bio_md must be a string or null' };
    data.bio_md = b.bio_md;
  }
  if ('visibility' in b) {
    if (typeof b.visibility !== 'string') return { error: 'visibility must be a string' };
    data.visibility = b.visibility;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as PersonCreate };
}

export function validatePersonPatch(body: unknown): SchemaValidationResult<PersonPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('name' in b) {
    if (typeof b.name !== 'string') return { error: 'name must be a string' };
    data.name = b.name;
  }
  if ('name_ar' in b) {
    if (b.name_ar !== null && typeof b.name_ar !== 'string') return { error: 'name_ar must be a string or null' };
    data.name_ar = b.name_ar;
  }
  if ('slug' in b) {
    if (b.slug !== null && typeof b.slug !== 'string') return { error: 'slug must be a string or null' };
    data.slug = b.slug;
  }
  if ('person_type' in b) {
    if (typeof b.person_type !== 'string') return { error: 'person_type must be a string' };
    data.person_type = b.person_type;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('era' in b) {
    if (b.era !== null && typeof b.era !== 'string') return { error: 'era must be a string or null' };
    data.era = b.era;
  }
  if ('birth_year' in b) {
    if (b.birth_year !== null && (typeof b.birth_year !== 'number' || !Number.isFinite(b.birth_year))) return { error: 'birth_year must be a number or null' };
    data.birth_year = b.birth_year;
  }
  if ('death_year' in b) {
    if (b.death_year !== null && (typeof b.death_year !== 'number' || !Number.isFinite(b.death_year))) return { error: 'death_year must be a number or null' };
    data.death_year = b.death_year;
  }
  if ('birth_location_id' in b) {
    if (b.birth_location_id !== null && typeof b.birth_location_id !== 'string') return { error: 'birth_location_id must be a string or null' };
    data.birth_location_id = b.birth_location_id;
  }
  if ('death_location_id' in b) {
    if (b.death_location_id !== null && typeof b.death_location_id !== 'string') return { error: 'death_location_id must be a string or null' };
    data.death_location_id = b.death_location_id;
  }
  if ('nationality' in b) {
    if (b.nationality !== null && typeof b.nationality !== 'string') return { error: 'nationality must be a string or null' };
    data.nationality = b.nationality;
  }
  if ('affiliation' in b) {
    if (b.affiliation !== null && typeof b.affiliation !== 'string') return { error: 'affiliation must be a string or null' };
    data.affiliation = b.affiliation;
  }
  if ('bio_md' in b) {
    if (b.bio_md !== null && typeof b.bio_md !== 'string') return { error: 'bio_md must be a string or null' };
    data.bio_md = b.bio_md;
  }
  if ('visibility' in b) {
    if (typeof b.visibility !== 'string') return { error: 'visibility must be a string' };
    data.visibility = b.visibility;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as PersonPatch };
}

export function validateAliasCreate(body: unknown): SchemaValidationResult<AliasCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.alias !== 'string' || !b.alias.trim()) return { error: 'alias is required and must be a non-empty string' };
  data.alias = b.alias.trim();
  if ('alias_type' in b) {
    if (typeof b.alias_type !== 'string') return { error: 'alias_type must be a string' };
    data.alias_type = b.alias_type;
  }
  if ('language' in b) {
    if (b.language !== null && typeof b.language !== 'string') return { error: 'language must be a string or null' };
    data.language = b.language;
  }

  return { data: data as unknown as AliasCreate };
}

export function validatePersonRelationCreate(body: unknown): SchemaValidationResult<PersonRelationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.from_person_id !== 'string' || !b.from_person_id.trim()) return { error: 'from_person_id is required and must be a non-empty string' };
  data.from_person_id = b.from_person_id.trim();
  if (typeof b.to_person_id !== 'string' || !b.to_person_id.trim()) return { error: 'to_person_id is required and must be a non-empty string' };
  data.to_person_id = b.to_person_id.trim();
  if ('relation_type' in b) {
    if (typeof b.relation_type !== 'string') return { error: 'relation_type must be a string' };
    data.relation_type = b.relation_type;
  }
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }
  if ('source_ref' in b) {
    if (b.source_ref !== null && typeof b.source_ref !== 'string') return { error: 'source_ref must be a string or null' };
    data.source_ref = b.source_ref;
  }

  return { data: data as unknown as PersonRelationCreate };
}

export function validateOrgCreate(body: unknown): SchemaValidationResult<OrgCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('org_type' in b) {
    if (typeof b.org_type !== 'string') return { error: 'org_type must be a string' };
    data.org_type = b.org_type;
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
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as OrgCreate };
}

export function validateOrgPatch(body: unknown): SchemaValidationResult<OrgPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('org_type' in b) {
    if (typeof b.org_type !== 'string') return { error: 'org_type must be a string' };
    data.org_type = b.org_type;
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
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as OrgPatch };
}

export function validateAffiliationCreate(body: unknown): SchemaValidationResult<AffiliationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.entity_ref !== 'string' || !b.entity_ref.trim()) return { error: 'entity_ref is required and must be a non-empty string' };
  data.entity_ref = b.entity_ref.trim();
  if (typeof b.entity_type !== 'string' || !b.entity_type.trim()) return { error: 'entity_type is required and must be a non-empty string' };
  data.entity_type = b.entity_type.trim();
  if (typeof b.target_type !== 'string' || !b.target_type.trim()) return { error: 'target_type is required and must be a non-empty string' };
  data.target_type = b.target_type.trim();
  if (typeof b.target_id !== 'string' || !b.target_id.trim()) return { error: 'target_id is required and must be a non-empty string' };
  data.target_id = b.target_id.trim();
  if ('affil_role' in b) {
    if (b.affil_role !== null && typeof b.affil_role !== 'string') return { error: 'affil_role must be a string or null' };
    data.affil_role = b.affil_role;
  }
  if ('period_label' in b) {
    if (b.period_label !== null && typeof b.period_label !== 'string') return { error: 'period_label must be a string or null' };
    data.period_label = b.period_label;
  }
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }

  return { data: data as unknown as AffiliationCreate };
}

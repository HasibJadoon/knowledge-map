// ─── Source schemas & types ───────────────────────────────────────────────

export interface WvSource {
  id: string;            // WV:ULID
  slug: string | null;
  title: string;
  title_ar: string | null;
  source_type: string;   // book|article|lecture|talk|manuscript|video|podcast|classical_text|fatwa|document|other
  source_domain: string; // general|classical_text|academic|journalistic|media|other
  tradition_id: string | null;
  language: string | null;
  published_year: number | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  description_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvSourceUnit {
  id: string;
  source_id: string;
  parent_id: string | null;
  unit_type: string;     // volume|chapter|section|paragraph|footnote|appendix|other
  title: string | null;
  unit_index: number | null;
  page_start: number | null;
  page_end: number | null;
  text_excerpt: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvSourceChunk {
  id: string;
  source_id: string;
  source_unit_id: string | null;
  chunk_index: number;
  heading_norm: string | null;
  page_no: number | null;
  token_count: number | null;
  text_content: string;
  chunk_kind: string | null;
  is_embedded: number;   // 0|1
  created_at: string;
}

export interface SourceCreate {
  title: string;
  title_ar?: string | null;
  source_type?: string;
  source_domain?: string;
  tradition_id?: string | null;
  language?: string;
  published_year?: number | null;
  publisher?: string | null;
  description_md?: string | null;
  url?: string | null;
  slug?: string | null;
}

export interface SourcePatch {
  title?: string;
  title_ar?: string | null;
  source_type?: string;
  source_domain?: string;
  tradition_id?: string | null;
  language?: string;
  published_year?: number | null;
  publisher?: string | null;
  description_md?: string | null;
  url?: string | null;
  slug?: string | null;
}

export interface UnitCreate {
  source_id: string;
  parent_id?: string | null;
  unit_type?: string;
  title?: string | null;
  unit_index?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  text_excerpt?: string | null;
  description_md?: string | null;
}

export interface UnitPatch {
  title?: string | null;
  unit_type?: string;
  unit_index?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  text_excerpt?: string | null;
  description_md?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateSourceCreate(body: unknown): SchemaValidationResult<SourceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('source_type' in b) {
    if (typeof b.source_type !== 'string') return { error: 'source_type must be a string' };
    data.source_type = b.source_type;
  }
  if ('source_domain' in b) {
    if (typeof b.source_domain !== 'string') return { error: 'source_domain must be a string' };
    data.source_domain = b.source_domain;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('language' in b) {
    if (typeof b.language !== 'string') return { error: 'language must be a string' };
    data.language = b.language;
  }
  if ('published_year' in b) {
    if (b.published_year !== null && (typeof b.published_year !== 'number' || !Number.isFinite(b.published_year))) return { error: 'published_year must be a number or null' };
    data.published_year = b.published_year;
  }
  if ('publisher' in b) {
    if (b.publisher !== null && typeof b.publisher !== 'string') return { error: 'publisher must be a string or null' };
    data.publisher = b.publisher;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('url' in b) {
    if (b.url !== null && typeof b.url !== 'string') return { error: 'url must be a string or null' };
    data.url = b.url;
  }
  if ('slug' in b) {
    if (b.slug !== null && typeof b.slug !== 'string') return { error: 'slug must be a string or null' };
    data.slug = b.slug;
  }

  return { data: data as unknown as SourceCreate };
}

export function validateSourcePatch(body: unknown): SchemaValidationResult<SourcePatch> {
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
  if ('source_type' in b) {
    if (typeof b.source_type !== 'string') return { error: 'source_type must be a string' };
    data.source_type = b.source_type;
  }
  if ('source_domain' in b) {
    if (typeof b.source_domain !== 'string') return { error: 'source_domain must be a string' };
    data.source_domain = b.source_domain;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('language' in b) {
    if (typeof b.language !== 'string') return { error: 'language must be a string' };
    data.language = b.language;
  }
  if ('published_year' in b) {
    if (b.published_year !== null && (typeof b.published_year !== 'number' || !Number.isFinite(b.published_year))) return { error: 'published_year must be a number or null' };
    data.published_year = b.published_year;
  }
  if ('publisher' in b) {
    if (b.publisher !== null && typeof b.publisher !== 'string') return { error: 'publisher must be a string or null' };
    data.publisher = b.publisher;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('url' in b) {
    if (b.url !== null && typeof b.url !== 'string') return { error: 'url must be a string or null' };
    data.url = b.url;
  }
  if ('slug' in b) {
    if (b.slug !== null && typeof b.slug !== 'string') return { error: 'slug must be a string or null' };
    data.slug = b.slug;
  }

  return { data: data as unknown as SourcePatch };
}

export function validateUnitCreate(body: unknown): SchemaValidationResult<UnitCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.source_id !== 'string' || !b.source_id.trim()) return { error: 'source_id is required and must be a non-empty string' };
  data.source_id = b.source_id.trim();
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }
  if ('unit_type' in b) {
    if (typeof b.unit_type !== 'string') return { error: 'unit_type must be a string' };
    data.unit_type = b.unit_type;
  }
  if ('title' in b) {
    if (b.title !== null && typeof b.title !== 'string') return { error: 'title must be a string or null' };
    data.title = b.title;
  }
  if ('unit_index' in b) {
    if (b.unit_index !== null && (typeof b.unit_index !== 'number' || !Number.isFinite(b.unit_index))) return { error: 'unit_index must be a number or null' };
    data.unit_index = b.unit_index;
  }
  if ('page_start' in b) {
    if (b.page_start !== null && (typeof b.page_start !== 'number' || !Number.isFinite(b.page_start))) return { error: 'page_start must be a number or null' };
    data.page_start = b.page_start;
  }
  if ('page_end' in b) {
    if (b.page_end !== null && (typeof b.page_end !== 'number' || !Number.isFinite(b.page_end))) return { error: 'page_end must be a number or null' };
    data.page_end = b.page_end;
  }
  if ('text_excerpt' in b) {
    if (b.text_excerpt !== null && typeof b.text_excerpt !== 'string') return { error: 'text_excerpt must be a string or null' };
    data.text_excerpt = b.text_excerpt;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as UnitCreate };
}

export function validateUnitPatch(body: unknown): SchemaValidationResult<UnitPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (b.title !== null && typeof b.title !== 'string') return { error: 'title must be a string or null' };
    data.title = b.title;
  }
  if ('unit_type' in b) {
    if (typeof b.unit_type !== 'string') return { error: 'unit_type must be a string' };
    data.unit_type = b.unit_type;
  }
  if ('unit_index' in b) {
    if (b.unit_index !== null && (typeof b.unit_index !== 'number' || !Number.isFinite(b.unit_index))) return { error: 'unit_index must be a number or null' };
    data.unit_index = b.unit_index;
  }
  if ('page_start' in b) {
    if (b.page_start !== null && (typeof b.page_start !== 'number' || !Number.isFinite(b.page_start))) return { error: 'page_start must be a number or null' };
    data.page_start = b.page_start;
  }
  if ('page_end' in b) {
    if (b.page_end !== null && (typeof b.page_end !== 'number' || !Number.isFinite(b.page_end))) return { error: 'page_end must be a number or null' };
    data.page_end = b.page_end;
  }
  if ('text_excerpt' in b) {
    if (b.text_excerpt !== null && typeof b.text_excerpt !== 'string') return { error: 'text_excerpt must be a string or null' };
    data.text_excerpt = b.text_excerpt;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as UnitPatch };
}

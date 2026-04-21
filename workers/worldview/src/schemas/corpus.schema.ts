// ─── Corpus schemas & types ───────────────────────────────────────────────

export interface WvScripturalCorpus {
  id: string;              // WV:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_id: string | null;
  corpus_type: string;     // scripture|hadith|commentary|creed|liturgy|apocrypha|other
  language: string | null;
  canon_status: string | null; // canonical|deuterocanonical|disputed|rejected
  date_range: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvCorpusUnit {
  id: string;
  corpus_id: string;
  parent_id: string | null;
  unit_type: string;       // book|chapter|passage|pericope|episode|scene|verse_range|other
  title: string | null;
  unit_index: number | null;
  start_ref: string | null;
  end_ref: string | null;
  text_excerpt: string | null;
  description_md: string | null;
  qr_scope_ref: string | null; // 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  meta_json: string | null;
  created_at: string;
}

export interface CorpusCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  tradition_id?: string | null;
  corpus_type?: string;
  language?: string | null;
  canon_status?: string | null;
  date_range?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface CorpusPatch {
  title?: string;
  title_ar?: string | null;
  tradition_id?: string | null;
  corpus_type?: string;
  language?: string | null;
  canon_status?: string | null;
  date_range?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface CorpusUnitCreate {
  corpus_id: string;
  parent_id?: string | null;
  unit_type?: string;
  title?: string | null;
  unit_index?: number | null;
  start_ref?: string | null;
  end_ref?: string | null;
  text_excerpt?: string | null;
  description_md?: string | null;
  qr_scope_ref?: string | null;
  meta_json?: string | null;
}

export interface CorpusUnitPatch {
  unit_type?: string;
  title?: string | null;
  unit_index?: number | null;
  start_ref?: string | null;
  end_ref?: string | null;
  text_excerpt?: string | null;
  description_md?: string | null;
  qr_scope_ref?: string | null;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateCorpusCreate(body: unknown): SchemaValidationResult<CorpusCreate> {
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
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('corpus_type' in b) {
    if (typeof b.corpus_type !== 'string') return { error: 'corpus_type must be a string' };
    data.corpus_type = b.corpus_type;
  }
  if ('language' in b) {
    if (b.language !== null && typeof b.language !== 'string') return { error: 'language must be a string or null' };
    data.language = b.language;
  }
  if ('canon_status' in b) {
    if (b.canon_status !== null && typeof b.canon_status !== 'string') return { error: 'canon_status must be a string or null' };
    data.canon_status = b.canon_status;
  }
  if ('date_range' in b) {
    if (b.date_range !== null && typeof b.date_range !== 'string') return { error: 'date_range must be a string or null' };
    data.date_range = b.date_range;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CorpusCreate };
}

export function validateCorpusPatch(body: unknown): SchemaValidationResult<CorpusPatch> {
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
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('corpus_type' in b) {
    if (typeof b.corpus_type !== 'string') return { error: 'corpus_type must be a string' };
    data.corpus_type = b.corpus_type;
  }
  if ('language' in b) {
    if (b.language !== null && typeof b.language !== 'string') return { error: 'language must be a string or null' };
    data.language = b.language;
  }
  if ('canon_status' in b) {
    if (b.canon_status !== null && typeof b.canon_status !== 'string') return { error: 'canon_status must be a string or null' };
    data.canon_status = b.canon_status;
  }
  if ('date_range' in b) {
    if (b.date_range !== null && typeof b.date_range !== 'string') return { error: 'date_range must be a string or null' };
    data.date_range = b.date_range;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CorpusPatch };
}

export function validateCorpusUnitCreate(body: unknown): SchemaValidationResult<CorpusUnitCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.corpus_id !== 'string' || !b.corpus_id.trim()) return { error: 'corpus_id is required and must be a non-empty string' };
  data.corpus_id = b.corpus_id.trim();
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
  if ('start_ref' in b) {
    if (b.start_ref !== null && typeof b.start_ref !== 'string') return { error: 'start_ref must be a string or null' };
    data.start_ref = b.start_ref;
  }
  if ('end_ref' in b) {
    if (b.end_ref !== null && typeof b.end_ref !== 'string') return { error: 'end_ref must be a string or null' };
    data.end_ref = b.end_ref;
  }
  if ('text_excerpt' in b) {
    if (b.text_excerpt !== null && typeof b.text_excerpt !== 'string') return { error: 'text_excerpt must be a string or null' };
    data.text_excerpt = b.text_excerpt;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('qr_scope_ref' in b) {
    if (b.qr_scope_ref !== null && typeof b.qr_scope_ref !== 'string') return { error: 'qr_scope_ref must be a string or null' };
    data.qr_scope_ref = b.qr_scope_ref;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CorpusUnitCreate };
}

export function validateCorpusUnitPatch(body: unknown): SchemaValidationResult<CorpusUnitPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

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
  if ('start_ref' in b) {
    if (b.start_ref !== null && typeof b.start_ref !== 'string') return { error: 'start_ref must be a string or null' };
    data.start_ref = b.start_ref;
  }
  if ('end_ref' in b) {
    if (b.end_ref !== null && typeof b.end_ref !== 'string') return { error: 'end_ref must be a string or null' };
    data.end_ref = b.end_ref;
  }
  if ('text_excerpt' in b) {
    if (b.text_excerpt !== null && typeof b.text_excerpt !== 'string') return { error: 'text_excerpt must be a string or null' };
    data.text_excerpt = b.text_excerpt;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('qr_scope_ref' in b) {
    if (b.qr_scope_ref !== null && typeof b.qr_scope_ref !== 'string') return { error: 'qr_scope_ref must be a string or null' };
    data.qr_scope_ref = b.qr_scope_ref;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CorpusUnitPatch };
}

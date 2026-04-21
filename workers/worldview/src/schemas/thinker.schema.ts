// ─── Thinker schemas & types ───────────────────────────────────────────────

export interface Thinker {
  id: string;               // WV:ULID
  name_en: string;
  name_ar: string | null;
  tradition_id: string | null; // WV:ULID
  birth_year: number | null;
  death_year: number | null;
  bio_summary: string | null;
  created_at: string;
}

export interface ThinkerCreate {
  name_en: string;
  name_ar?: string | null;
  tradition_id?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  bio_summary?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateThinkerCreate(body: unknown): SchemaValidationResult<ThinkerCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.name_en !== 'string' || !b.name_en.trim()) return { error: 'name_en is required and must be a non-empty string' };
  data.name_en = b.name_en.trim();
  if ('name_ar' in b) {
    if (b.name_ar !== null && typeof b.name_ar !== 'string') return { error: 'name_ar must be a string or null' };
    data.name_ar = b.name_ar;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('birth_year' in b) {
    if (b.birth_year !== null && (typeof b.birth_year !== 'number' || !Number.isFinite(b.birth_year))) return { error: 'birth_year must be a number or null' };
    data.birth_year = b.birth_year;
  }
  if ('death_year' in b) {
    if (b.death_year !== null && (typeof b.death_year !== 'number' || !Number.isFinite(b.death_year))) return { error: 'death_year must be a number or null' };
    data.death_year = b.death_year;
  }
  if ('bio_summary' in b) {
    if (b.bio_summary !== null && typeof b.bio_summary !== 'string') return { error: 'bio_summary must be a string or null' };
    data.bio_summary = b.bio_summary;
  }

  return { data: data as unknown as ThinkerCreate };
}

// ─── Domain schemas & types ───────────────────────────────────────────────────

export interface ArDomain {
  id: string;                        // AR:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface ArDomainCreate {
  title: string;
  slug?: string;
  title_ar?: string | null;
  description?: string | null;
  sort_order?: number;
}

export interface ArDomainPatch {
  slug?: string;
  title?: string;
  title_ar?: string | null;
  description?: string | null;
  sort_order?: number;
}

// ─── Domain Phrase ────────────────────────────────────────────────────────────

export interface ArDomainPhrase {
  id: string;                        // AR:ULID
  domain_id: string;
  arabic: string;
  transliteration: string | null;
  meaning_en: string;
  usage_context: string | null;
  level: string | null;              // A1–C2
  vocab_id: string | null;
  created_at: string;
}

export interface ArDomainPhraseCreate {
  domain_id: string;
  arabic: string;
  meaning_en: string;
  transliteration?: string | null;
  usage_context?: string | null;
  level?: string | null;
  vocab_id?: string | null;
}

export interface ArDomainPhrasePatch {
  arabic?: string;
  transliteration?: string | null;
  meaning_en?: string;
  usage_context?: string | null;
  level?: string | null;
  vocab_id?: string | null;
}

// ─── Scenario ─────────────────────────────────────────────────────────────────

export interface ArScenario {
  id: string;                        // AR:ULID
  domain_id: string;
  title: string;
  title_ar: string | null;
  scenario_type: string;
  level: string | null;              // A1–C2
  description_md: string | null;
  vocab_set_json: string | null;     // JSON [vocab_id]
  meta_json: string | null;
  created_at: string;
}

export interface ArScenarioCreate {
  domain_id: string;
  title: string;
  scenario_type?: string;
  level?: string | null;
  description_md?: string | null;
  title_ar?: string | null;
}

export interface ArScenarioPatch {
  title?: string;
  title_ar?: string | null;
  scenario_type?: string;
  level?: string | null;
  description_md?: string | null;
  vocab_set_json?: string | null;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validateArDomainCreate(
  body: unknown,
): { data: ArDomainCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  return {
    data: {
      title: (b.title as string).trim(),
      slug: typeof b.slug === 'string' ? b.slug.trim() : undefined,
      title_ar: typeof b.title_ar === 'string' ? b.title_ar : b.title_ar === null ? null : undefined,
      description: typeof b.description === 'string' ? b.description : b.description === null ? null : undefined,
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : undefined,
    },
  };
}

export function validateArDomainPhraseCreate(
  body: unknown,
): { data: ArDomainPhraseCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.domain_id || typeof b.domain_id !== 'string') {
    return { error: 'domain_id is required and must be a string' };
  }
  if (!b.arabic || typeof b.arabic !== 'string' || b.arabic.trim() === '') {
    return { error: 'arabic is required and must be a non-empty string' };
  }
  if (!b.meaning_en || typeof b.meaning_en !== 'string' || b.meaning_en.trim() === '') {
    return { error: 'meaning_en is required and must be a non-empty string' };
  }

  return {
    data: {
      domain_id: b.domain_id as string,
      arabic: (b.arabic as string).trim(),
      meaning_en: (b.meaning_en as string).trim(),
      transliteration: typeof b.transliteration === 'string' ? b.transliteration : b.transliteration === null ? null : undefined,
      usage_context: typeof b.usage_context === 'string' ? b.usage_context : b.usage_context === null ? null : undefined,
      level: typeof b.level === 'string' ? b.level : b.level === null ? null : undefined,
      vocab_id: typeof b.vocab_id === 'string' ? b.vocab_id : b.vocab_id === null ? null : undefined,
    },
  };
}

export function validateArScenarioCreate(
  body: unknown,
): { data: ArScenarioCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.domain_id || typeof b.domain_id !== 'string') {
    return { error: 'domain_id is required and must be a string' };
  }
  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  return {
    data: {
      domain_id: b.domain_id as string,
      title: (b.title as string).trim(),
      scenario_type: typeof b.scenario_type === 'string' ? b.scenario_type : undefined,
      level: typeof b.level === 'string' ? b.level : b.level === null ? null : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : b.description_md === null ? null : undefined,
      title_ar: typeof b.title_ar === 'string' ? b.title_ar : b.title_ar === null ? null : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface Domain {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface DomainCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  sort_order?: number;
}

export interface DomainPhrase {
  id: string;
  domain_id: string;
  arabic: string;
  transliteration: string | null;
  meaning_en: string;
  usage_context: string | null;
  level: string | null;
  vocab_id: string | null;    // link to ar_vocabulary if exists
  created_at: string;
}

export interface DomainPhraseCreate {
  arabic: string;
  transliteration?: string | null;
  meaning_en: string;
  usage_context?: string | null;
  level?: string | null;
  vocab_id?: string | null;
}

export interface Scenario {
  id: string;
  domain_id: string;
  title: string;
  title_ar: string | null;
  scenario_type: string;      // dialogue|reading|listening|writing|speaking|other
  level: string | null;
  description_md: string | null;
  vocab_set_json: string | null;  // JSON [vocab_id]
  meta_json: string | null;
  created_at: string;
}

export interface ScenarioCreate {
  title: string;
  title_ar?: string | null;
  scenario_type?: string;
  level?: string | null;
  description_md?: string | null;
  vocab_set_json?: string | null;
  meta_json?: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArDomainPatch(body: unknown): SchemaValidationResult<ArDomainPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('slug' in b) {
    if (typeof b.slug !== 'string') return { error: 'slug must be a string' };
    data.slug = b.slug;
  }
  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
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

  return { data: data as unknown as ArDomainPatch };
}

export function validateArDomainPhrasePatch(body: unknown): SchemaValidationResult<ArDomainPhrasePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('arabic' in b) {
    if (typeof b.arabic !== 'string') return { error: 'arabic must be a string' };
    data.arabic = b.arabic;
  }
  if ('transliteration' in b) {
    if (b.transliteration !== null && typeof b.transliteration !== 'string') return { error: 'transliteration must be a string or null' };
    data.transliteration = b.transliteration;
  }
  if ('meaning_en' in b) {
    if (typeof b.meaning_en !== 'string') return { error: 'meaning_en must be a string' };
    data.meaning_en = b.meaning_en;
  }
  if ('usage_context' in b) {
    if (b.usage_context !== null && typeof b.usage_context !== 'string') return { error: 'usage_context must be a string or null' };
    data.usage_context = b.usage_context;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('vocab_id' in b) {
    if (b.vocab_id !== null && typeof b.vocab_id !== 'string') return { error: 'vocab_id must be a string or null' };
    data.vocab_id = b.vocab_id;
  }

  return { data: data as unknown as ArDomainPhrasePatch };
}

export function validateArScenarioPatch(body: unknown): SchemaValidationResult<ArScenarioPatch> {
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
  if ('scenario_type' in b) {
    if (typeof b.scenario_type !== 'string') return { error: 'scenario_type must be a string' };
    data.scenario_type = b.scenario_type;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('vocab_set_json' in b) {
    if (b.vocab_set_json !== null && typeof b.vocab_set_json !== 'string') return { error: 'vocab_set_json must be a string or null' };
    data.vocab_set_json = b.vocab_set_json;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArScenarioPatch };
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

export function validateDomainPhraseCreate(body: unknown): SchemaValidationResult<DomainPhraseCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.arabic !== 'string' || !b.arabic.trim()) return { error: 'arabic is required and must be a non-empty string' };
  data.arabic = b.arabic.trim();
  if ('transliteration' in b) {
    if (b.transliteration !== null && typeof b.transliteration !== 'string') return { error: 'transliteration must be a string or null' };
    data.transliteration = b.transliteration;
  }
  if (typeof b.meaning_en !== 'string' || !b.meaning_en.trim()) return { error: 'meaning_en is required and must be a non-empty string' };
  data.meaning_en = b.meaning_en.trim();
  if ('usage_context' in b) {
    if (b.usage_context !== null && typeof b.usage_context !== 'string') return { error: 'usage_context must be a string or null' };
    data.usage_context = b.usage_context;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('vocab_id' in b) {
    if (b.vocab_id !== null && typeof b.vocab_id !== 'string') return { error: 'vocab_id must be a string or null' };
    data.vocab_id = b.vocab_id;
  }

  return { data: data as unknown as DomainPhraseCreate };
}

export function validateScenarioCreate(body: unknown): SchemaValidationResult<ScenarioCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('scenario_type' in b) {
    if (typeof b.scenario_type !== 'string') return { error: 'scenario_type must be a string' };
    data.scenario_type = b.scenario_type;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('vocab_set_json' in b) {
    if (b.vocab_set_json !== null && typeof b.vocab_set_json !== 'string') return { error: 'vocab_set_json must be a string or null' };
    data.vocab_set_json = b.vocab_set_json;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ScenarioCreate };
}

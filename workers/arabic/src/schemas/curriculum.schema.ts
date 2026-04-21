// ─── Curriculum schemas & types ───────────────────────────────────────────────

export type ArCurriculumDiscipline =
  | 'nahw'
  | 'sarf'
  | 'balagha'
  | 'vocabulary'
  | 'reading'
  | 'custom';

export interface ArCurriculum {
  id: string;                        // AR:ULID
  slug: string;
  title: string;
  discipline: ArCurriculumDiscipline;
  level: string | null;              // A1–C2
  track_id: string | null;
  container_id: string | null;
  description_md: string | null;
  sort_order: number;
  created_at: string;
}

export interface ArCurriculumCreate {
  title: string;
  discipline?: ArCurriculumDiscipline;
  slug?: string;
  level?: string | null;
  track_id?: string | null;
  container_id?: string | null;
  description_md?: string | null;
}

export interface ArCurriculumPatch {
  title?: string;
  discipline?: ArCurriculumDiscipline;
  slug?: string;
  level?: string | null;
  track_id?: string | null;
  container_id?: string | null;
  description_md?: string | null;
  sort_order?: number;
}

// ─── Curriculum Unit ──────────────────────────────────────────────────────────

export interface ArCurriculumUnit {
  id: string;                        // AR:ULID
  curriculum_id: string;
  parent_id: string | null;
  title: string;
  al_concept_ref: string | null;     // AL:<nahw|sarf|balagha_concept_id>
  unit_index: number;
  description_md: string | null;
  examples_json: string | null;      // JSON [{arabic, translation, notes}]
  created_at: string;
}

export interface ArCurriculumUnitCreate {
  curriculum_id: string;
  title: string;
  al_concept_ref?: string | null;
  unit_index?: number;
  description_md?: string | null;
  examples_json?: string | null;
  parent_id?: string | null;
}

export interface ArCurriculumUnitPatch {
  title?: string;
  al_concept_ref?: string | null;
  unit_index?: number;
  description_md?: string | null;
  examples_json?: string | null;
  parent_id?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_DISCIPLINES: ArCurriculumDiscipline[] = [
  'nahw', 'sarf', 'balagha', 'vocabulary', 'reading', 'custom',
];

export function validateArCurriculumCreate(
  body: unknown,
): { data: ArCurriculumCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  if (b.discipline !== undefined && !VALID_DISCIPLINES.includes(b.discipline as ArCurriculumDiscipline)) {
    return { error: `discipline must be one of: ${VALID_DISCIPLINES.join(', ')}` };
  }

  return {
    data: {
      title: (b.title as string).trim(),
      discipline: b.discipline !== undefined ? (b.discipline as ArCurriculumDiscipline) : undefined,
      slug: typeof b.slug === 'string' ? b.slug.trim() : undefined,
      level: typeof b.level === 'string' ? b.level : b.level === null ? null : undefined,
      track_id: typeof b.track_id === 'string' ? b.track_id : b.track_id === null ? null : undefined,
      container_id: typeof b.container_id === 'string' ? b.container_id : b.container_id === null ? null : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : b.description_md === null ? null : undefined,
    },
  };
}

export function validateArCurriculumUnitCreate(
  body: unknown,
): { data: ArCurriculumUnitCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.curriculum_id || typeof b.curriculum_id !== 'string') {
    return { error: 'curriculum_id is required and must be a string' };
  }
  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  return {
    data: {
      curriculum_id: b.curriculum_id as string,
      title: (b.title as string).trim(),
      al_concept_ref: typeof b.al_concept_ref === 'string' ? b.al_concept_ref : b.al_concept_ref === null ? null : undefined,
      unit_index: typeof b.unit_index === 'number' ? b.unit_index : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : b.description_md === null ? null : undefined,
      examples_json: typeof b.examples_json === 'string' ? b.examples_json : b.examples_json === null ? null : undefined,
      parent_id: typeof b.parent_id === 'string' ? b.parent_id : b.parent_id === null ? null : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface Curriculum {
  id: string;
  slug: string;
  title: string;
  discipline: string;         // sarf|nahw|balagha|combined|vocab|reading|other
  level: string | null;       // A1–C2
  track_id: string | null;
  container_id: string | null;
  description_md: string | null;
  sort_order: number;
  created_at: string;
}

export interface CurriculumCreate {
  slug: string;
  title: string;
  discipline?: string;
  level?: string | null;
  track_id?: string | null;
  container_id?: string | null;
  description_md?: string | null;
  sort_order?: number;
}

export interface CurriculumUnit {
  id: string;
  curriculum_id: string;
  parent_id: string | null;
  title: string;
  al_concept_ref: string | null;  // AL:<ar_ling_nahw|sarf|balagha_concept_id>
  unit_index: number;
  description_md: string | null;
  examples_json: string | null;   // JSON [{arabic, translation, notes}]
  created_at: string;
}

export interface CurriculumUnitCreate {
  curriculum_id: string;
  parent_id?: string | null;
  title: string;
  al_concept_ref?: string | null;
  unit_index?: number;
  description_md?: string | null;
  examples_json?: string | null;
}

export interface CurriculumUnitPatch {
  title?: string;
  al_concept_ref?: string | null;
  unit_index?: number;
  description_md?: string | null;
  examples_json?: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArCurriculumPatch(body: unknown): SchemaValidationResult<ArCurriculumPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('discipline' in b) {
    data.discipline = b.discipline;
  }
  if ('slug' in b) {
    if (typeof b.slug !== 'string') return { error: 'slug must be a string' };
    data.slug = b.slug;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('track_id' in b) {
    if (b.track_id !== null && typeof b.track_id !== 'string') return { error: 'track_id must be a string or null' };
    data.track_id = b.track_id;
  }
  if ('container_id' in b) {
    if (b.container_id !== null && typeof b.container_id !== 'string') return { error: 'container_id must be a string or null' };
    data.container_id = b.container_id;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as ArCurriculumPatch };
}

export function validateArCurriculumUnitPatch(body: unknown): SchemaValidationResult<ArCurriculumUnitPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('al_concept_ref' in b) {
    if (b.al_concept_ref !== null && typeof b.al_concept_ref !== 'string') return { error: 'al_concept_ref must be a string or null' };
    data.al_concept_ref = b.al_concept_ref;
  }
  if ('unit_index' in b) {
    if (typeof b.unit_index !== 'number' || !Number.isFinite(b.unit_index)) return { error: 'unit_index must be a number' };
    data.unit_index = b.unit_index;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('examples_json' in b) {
    if (b.examples_json !== null && typeof b.examples_json !== 'string') return { error: 'examples_json must be a string or null' };
    data.examples_json = b.examples_json;
  }
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }

  return { data: data as unknown as ArCurriculumUnitPatch };
}

export function validateCurriculumCreate(body: unknown): SchemaValidationResult<CurriculumCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('discipline' in b) {
    if (typeof b.discipline !== 'string') return { error: 'discipline must be a string' };
    data.discipline = b.discipline;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('track_id' in b) {
    if (b.track_id !== null && typeof b.track_id !== 'string') return { error: 'track_id must be a string or null' };
    data.track_id = b.track_id;
  }
  if ('container_id' in b) {
    if (b.container_id !== null && typeof b.container_id !== 'string') return { error: 'container_id must be a string or null' };
    data.container_id = b.container_id;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as CurriculumCreate };
}

export function validateCurriculumUnitCreate(body: unknown): SchemaValidationResult<CurriculumUnitCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.curriculum_id !== 'string' || !b.curriculum_id.trim()) return { error: 'curriculum_id is required and must be a non-empty string' };
  data.curriculum_id = b.curriculum_id.trim();
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('al_concept_ref' in b) {
    if (b.al_concept_ref !== null && typeof b.al_concept_ref !== 'string') return { error: 'al_concept_ref must be a string or null' };
    data.al_concept_ref = b.al_concept_ref;
  }
  if ('unit_index' in b) {
    if (typeof b.unit_index !== 'number' || !Number.isFinite(b.unit_index)) return { error: 'unit_index must be a number' };
    data.unit_index = b.unit_index;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('examples_json' in b) {
    if (b.examples_json !== null && typeof b.examples_json !== 'string') return { error: 'examples_json must be a string or null' };
    data.examples_json = b.examples_json;
  }

  return { data: data as unknown as CurriculumUnitCreate };
}

export function validateCurriculumUnitPatch(body: unknown): SchemaValidationResult<CurriculumUnitPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('al_concept_ref' in b) {
    if (b.al_concept_ref !== null && typeof b.al_concept_ref !== 'string') return { error: 'al_concept_ref must be a string or null' };
    data.al_concept_ref = b.al_concept_ref;
  }
  if ('unit_index' in b) {
    if (typeof b.unit_index !== 'number' || !Number.isFinite(b.unit_index)) return { error: 'unit_index must be a number' };
    data.unit_index = b.unit_index;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('examples_json' in b) {
    if (b.examples_json !== null && typeof b.examples_json !== 'string') return { error: 'examples_json must be a string or null' };
    data.examples_json = b.examples_json;
  }

  return { data: data as unknown as CurriculumUnitPatch };
}

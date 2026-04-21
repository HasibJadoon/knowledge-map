// ─── Container schemas & types ────────────────────────────────────────────────

export type ArContainerType = 'book' | 'course' | 'lesson_set' | 'custom';

export interface ArContainer {
  id: string;                        // AR:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  container_type: ArContainerType;
  track_id: string | null;
  level: string | null;              // A1–C2
  description_md: string | null;
  cover_ref: string | null;          // CM:<media_id>
  source_ref: string | null;         // CM:<source_id> | AL:<source_id>
  sort_order: number;
  is_published: boolean;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArContainerCreate {
  title: string;
  container_type?: ArContainerType;
  slug?: string;
  title_ar?: string | null;
  track_id?: string | null;
  level?: string | null;
  description_md?: string | null;
  is_published?: boolean;
}

export interface ArContainerPatch {
  title?: string;
  container_type?: ArContainerType;
  slug?: string;
  title_ar?: string | null;
  track_id?: string | null;
  level?: string | null;
  description_md?: string | null;
  cover_ref?: string | null;
  source_ref?: string | null;
  sort_order?: number;
  is_published?: boolean;
  meta_json?: string | null;
}

// ─── Container Unit ───────────────────────────────────────────────────────────

export type ArContainerUnitType = 'chapter' | 'module' | 'lesson' | 'exercise_set';

export interface ArContainerUnit {
  id: string;                        // AR:ULID
  container_id: string;
  parent_id: string | null;
  title: string;
  title_ar: string | null;
  unit_type: ArContainerUnitType;
  unit_index: number;
  description_md: string | null;
  estimated_mins: number | null;
  skill_focus: string | null;
  al_concept_refs: string | null;    // JSON ['AL:<id>']
  qr_scope_ref: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface ArContainerUnitCreate {
  container_id: string;
  title: string;
  unit_type?: ArContainerUnitType;
  unit_index?: number;
  description_md?: string | null;
  estimated_mins?: number | null;
  skill_focus?: string | null;
  al_concept_refs?: string | null;
  qr_scope_ref?: string | null;
  parent_id?: string | null;
}

export interface ArContainerUnitPatch {
  title?: string;
  title_ar?: string | null;
  unit_type?: ArContainerUnitType;
  unit_index?: number;
  description_md?: string | null;
  estimated_mins?: number | null;
  skill_focus?: string | null;
  al_concept_refs?: string | null;
  qr_scope_ref?: string | null;
  parent_id?: string | null;
  meta_json?: string | null;
}

// ─── Container Unit Task ──────────────────────────────────────────────────────

export interface ArContainerUnitTask {
  id: string;                        // AR:ULID
  unit_id: string;
  parent_task_id: string | null;
  title: string;
  task_type: string;
  task_index: number;
  step_no: number | null;
  description_md: string | null;
  estimated_mins: number | null;
  al_concept_ref: string | null;     // AL:<concept_id>
  meta_json: string | null;
  created_at: string;
}

export interface ArContainerUnitTaskCreate {
  unit_id: string;
  title: string;
  task_type?: string;
  task_index?: number;
  step_no?: number | null;
  description_md?: string | null;
  estimated_mins?: number | null;
  al_concept_ref?: string | null;
  parent_task_id?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_CONTAINER_TYPES: ArContainerType[] = ['book', 'course', 'lesson_set', 'custom'];
const VALID_UNIT_TYPES: ArContainerUnitType[] = ['chapter', 'module', 'lesson', 'exercise_set'];

export function validateArContainerCreate(
  body: unknown,
): { data: ArContainerCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  if (b.container_type !== undefined && !VALID_CONTAINER_TYPES.includes(b.container_type as ArContainerType)) {
    return { error: `container_type must be one of: ${VALID_CONTAINER_TYPES.join(', ')}` };
  }

  return {
    data: {
      title: (b.title as string).trim(),
      container_type: b.container_type !== undefined ? (b.container_type as ArContainerType) : undefined,
      slug: typeof b.slug === 'string' ? b.slug.trim() : undefined,
      title_ar: typeof b.title_ar === 'string' ? b.title_ar : b.title_ar === null ? null : undefined,
      track_id: typeof b.track_id === 'string' ? b.track_id : b.track_id === null ? null : undefined,
      level: typeof b.level === 'string' ? b.level : b.level === null ? null : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : b.description_md === null ? null : undefined,
      is_published: typeof b.is_published === 'boolean' ? b.is_published : undefined,
    },
  };
}

export function validateArContainerUnitCreate(
  body: unknown,
): { data: ArContainerUnitCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.container_id || typeof b.container_id !== 'string') {
    return { error: 'container_id is required and must be a string' };
  }
  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  if (b.unit_type !== undefined && !VALID_UNIT_TYPES.includes(b.unit_type as ArContainerUnitType)) {
    return { error: `unit_type must be one of: ${VALID_UNIT_TYPES.join(', ')}` };
  }

  return {
    data: {
      container_id: b.container_id as string,
      title: (b.title as string).trim(),
      unit_type: b.unit_type !== undefined ? (b.unit_type as ArContainerUnitType) : undefined,
      unit_index: typeof b.unit_index === 'number' ? b.unit_index : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : b.description_md === null ? null : undefined,
      estimated_mins: typeof b.estimated_mins === 'number' ? b.estimated_mins : b.estimated_mins === null ? null : undefined,
      skill_focus: typeof b.skill_focus === 'string' ? b.skill_focus : b.skill_focus === null ? null : undefined,
      al_concept_refs: typeof b.al_concept_refs === 'string' ? b.al_concept_refs : b.al_concept_refs === null ? null : undefined,
      qr_scope_ref: typeof b.qr_scope_ref === 'string' ? b.qr_scope_ref : b.qr_scope_ref === null ? null : undefined,
      parent_id: typeof b.parent_id === 'string' ? b.parent_id : b.parent_id === null ? null : undefined,
    },
  };
}

export function validateArContainerUnitTaskCreate(
  body: unknown,
): { data: ArContainerUnitTaskCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.unit_id || typeof b.unit_id !== 'string') {
    return { error: 'unit_id is required and must be a string' };
  }
  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  return {
    data: {
      unit_id: b.unit_id as string,
      title: (b.title as string).trim(),
      task_type: typeof b.task_type === 'string' ? b.task_type : undefined,
      task_index: typeof b.task_index === 'number' ? b.task_index : undefined,
      step_no: typeof b.step_no === 'number' ? b.step_no : b.step_no === null ? null : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : b.description_md === null ? null : undefined,
      estimated_mins: typeof b.estimated_mins === 'number' ? b.estimated_mins : b.estimated_mins === null ? null : undefined,
      al_concept_ref: typeof b.al_concept_ref === 'string' ? b.al_concept_ref : b.al_concept_ref === null ? null : undefined,
      parent_task_id: typeof b.parent_task_id === 'string' ? b.parent_task_id : b.parent_task_id === null ? null : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface Container {
  id: string;               // AR:ULID
  title: string;
  container_type: string;   // course | book | unit | chapter
  parent_id: string | null; // AR:ULID of parent container
  sort_order: number;
  status: string;           // active | archived | draft
  created_at: string;
}

export interface ContainerCreate {
  title: string;
  container_type: string;
  parent_id?: string | null;
  sort_order?: number;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArContainerPatch(body: unknown): SchemaValidationResult<ArContainerPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('container_type' in b) {
    data.container_type = b.container_type;
  }
  if ('slug' in b) {
    if (typeof b.slug !== 'string') return { error: 'slug must be a string' };
    data.slug = b.slug;
  }
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('track_id' in b) {
    if (b.track_id !== null && typeof b.track_id !== 'string') return { error: 'track_id must be a string or null' };
    data.track_id = b.track_id;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('cover_ref' in b) {
    if (b.cover_ref !== null && typeof b.cover_ref !== 'string') return { error: 'cover_ref must be a string or null' };
    data.cover_ref = b.cover_ref;
  }
  if ('source_ref' in b) {
    if (b.source_ref !== null && typeof b.source_ref !== 'string') return { error: 'source_ref must be a string or null' };
    data.source_ref = b.source_ref;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }
  if ('is_published' in b) {
    if (typeof b.is_published !== 'boolean') return { error: 'is_published must be a boolean' };
    data.is_published = b.is_published;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArContainerPatch };
}

export function validateArContainerUnitPatch(body: unknown): SchemaValidationResult<ArContainerUnitPatch> {
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
  if ('unit_type' in b) {
    data.unit_type = b.unit_type;
  }
  if ('unit_index' in b) {
    if (typeof b.unit_index !== 'number' || !Number.isFinite(b.unit_index)) return { error: 'unit_index must be a number' };
    data.unit_index = b.unit_index;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('estimated_mins' in b) {
    if (b.estimated_mins !== null && (typeof b.estimated_mins !== 'number' || !Number.isFinite(b.estimated_mins))) return { error: 'estimated_mins must be a number or null' };
    data.estimated_mins = b.estimated_mins;
  }
  if ('skill_focus' in b) {
    if (b.skill_focus !== null && typeof b.skill_focus !== 'string') return { error: 'skill_focus must be a string or null' };
    data.skill_focus = b.skill_focus;
  }
  if ('al_concept_refs' in b) {
    if (b.al_concept_refs !== null && typeof b.al_concept_refs !== 'string') return { error: 'al_concept_refs must be a string or null' };
    data.al_concept_refs = b.al_concept_refs;
  }
  if ('qr_scope_ref' in b) {
    if (b.qr_scope_ref !== null && typeof b.qr_scope_ref !== 'string') return { error: 'qr_scope_ref must be a string or null' };
    data.qr_scope_ref = b.qr_scope_ref;
  }
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArContainerUnitPatch };
}

export function validateContainerCreate(body: unknown): SchemaValidationResult<ContainerCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if (typeof b.container_type !== 'string' || !b.container_type.trim()) return { error: 'container_type is required and must be a non-empty string' };
  data.container_type = b.container_type.trim();
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as ContainerCreate };
}

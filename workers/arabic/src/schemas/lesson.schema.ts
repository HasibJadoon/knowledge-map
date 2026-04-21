// ─── Lesson schemas & types ───────────────────────────────────────────────────

export type ArLessonType = 'explanation' | 'practice' | 'mixed' | 'assessment';
export type ArSkillFocus = 'reading' | 'writing' | 'listening' | 'speaking' | 'grammar' | 'vocabulary';

export interface ArLesson {
  id: string;                        // AR:ULID
  unit_id: string | null;
  title: string;
  title_ar: string | null;
  lesson_type: ArLessonType;
  level: string | null;              // A1–C2
  skill_focus: ArSkillFocus | null;
  content_md: string;
  vocab_ids_json: string | null;     // JSON [vocab_id]
  grammar_ids_json: string | null;   // JSON [grammar_id]
  qr_scope_ref: string | null;
  estimated_mins: number | null;
  is_published: boolean;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArLessonCreate {
  unit_id: string;
  title: string;
  lesson_type?: ArLessonType;
  level?: string | null;
  skill_focus?: ArSkillFocus | null;
  content_md?: string | null;
  estimated_mins?: number | null;
  is_published?: boolean;
  qr_scope_ref?: string | null;
  title_ar?: string | null;
}

export interface ArLessonPatch {
  unit_id?: string | null;
  title?: string;
  title_ar?: string | null;
  lesson_type?: ArLessonType;
  level?: string | null;
  skill_focus?: ArSkillFocus | null;
  content_md?: string;
  vocab_ids_json?: string | null;
  grammar_ids_json?: string | null;
  qr_scope_ref?: string | null;
  estimated_mins?: number | null;
  is_published?: boolean;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_LESSON_TYPES: ArLessonType[] = ['explanation', 'practice', 'mixed', 'assessment'];
const VALID_SKILL_FOCUSES: ArSkillFocus[] = ['reading', 'writing', 'listening', 'speaking', 'grammar', 'vocabulary'];

export function validateArLessonCreate(
  body: unknown,
): { data: ArLessonCreate } | { error: string } {
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
  if (b.lesson_type !== undefined && !VALID_LESSON_TYPES.includes(b.lesson_type as ArLessonType)) {
    return { error: `lesson_type must be one of: ${VALID_LESSON_TYPES.join(', ')}` };
  }
  if (
    b.skill_focus !== undefined &&
    b.skill_focus !== null &&
    !VALID_SKILL_FOCUSES.includes(b.skill_focus as ArSkillFocus)
  ) {
    return { error: `skill_focus must be one of: ${VALID_SKILL_FOCUSES.join(', ')}` };
  }

  return {
    data: {
      unit_id: b.unit_id as string,
      title: (b.title as string).trim(),
      lesson_type: b.lesson_type !== undefined ? (b.lesson_type as ArLessonType) : undefined,
      level: typeof b.level === 'string' ? b.level : b.level === null ? null : undefined,
      skill_focus: b.skill_focus !== undefined ? (b.skill_focus as ArSkillFocus | null) : undefined,
      content_md: typeof b.content_md === 'string' ? b.content_md : undefined,
      estimated_mins: typeof b.estimated_mins === 'number' ? b.estimated_mins : b.estimated_mins === null ? null : undefined,
      is_published: typeof b.is_published === 'boolean' ? b.is_published : undefined,
      qr_scope_ref: typeof b.qr_scope_ref === 'string' ? b.qr_scope_ref : b.qr_scope_ref === null ? null : undefined,
      title_ar: typeof b.title_ar === 'string' ? b.title_ar : b.title_ar === null ? null : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface Lesson {
  id: string;           // AR:ULID
  container_id: string; // AR:ULID
  title: string;
  lesson_type: string;  // vocabulary | grammar | reading | exercise
  sort_order: number;
  status: string;       // draft | published | archived
  created_at: string;
}

export interface LessonCreate {
  container_id: string;
  title: string;
  lesson_type: string;
  sort_order?: number;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArLessonPatch(body: unknown): SchemaValidationResult<ArLessonPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('unit_id' in b) {
    if (b.unit_id !== null && typeof b.unit_id !== 'string') return { error: 'unit_id must be a string or null' };
    data.unit_id = b.unit_id;
  }
  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('lesson_type' in b) {
    data.lesson_type = b.lesson_type;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('skill_focus' in b) {
    data.skill_focus = b.skill_focus;
  }
  if ('content_md' in b) {
    if (typeof b.content_md !== 'string') return { error: 'content_md must be a string' };
    data.content_md = b.content_md;
  }
  if ('vocab_ids_json' in b) {
    if (b.vocab_ids_json !== null && typeof b.vocab_ids_json !== 'string') return { error: 'vocab_ids_json must be a string or null' };
    data.vocab_ids_json = b.vocab_ids_json;
  }
  if ('grammar_ids_json' in b) {
    if (b.grammar_ids_json !== null && typeof b.grammar_ids_json !== 'string') return { error: 'grammar_ids_json must be a string or null' };
    data.grammar_ids_json = b.grammar_ids_json;
  }
  if ('qr_scope_ref' in b) {
    if (b.qr_scope_ref !== null && typeof b.qr_scope_ref !== 'string') return { error: 'qr_scope_ref must be a string or null' };
    data.qr_scope_ref = b.qr_scope_ref;
  }
  if ('estimated_mins' in b) {
    if (b.estimated_mins !== null && (typeof b.estimated_mins !== 'number' || !Number.isFinite(b.estimated_mins))) return { error: 'estimated_mins must be a number or null' };
    data.estimated_mins = b.estimated_mins;
  }
  if ('is_published' in b) {
    if (typeof b.is_published !== 'boolean') return { error: 'is_published must be a boolean' };
    data.is_published = b.is_published;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArLessonPatch };
}

export function validateLessonCreate(body: unknown): SchemaValidationResult<LessonCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.container_id !== 'string' || !b.container_id.trim()) return { error: 'container_id is required and must be a non-empty string' };
  data.container_id = b.container_id.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if (typeof b.lesson_type !== 'string' || !b.lesson_type.trim()) return { error: 'lesson_type is required and must be a non-empty string' };
  data.lesson_type = b.lesson_type.trim();
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as LessonCreate };
}

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

// ─── Exercise schemas & types ─────────────────────────────────────────────────

export type ArExerciseType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'translation'
  | 'parsing'
  | 'matching'
  | 'free_write';

export type ArExerciseDifficulty = 'easy' | 'medium' | 'hard';

export interface ArExercise {
  id: string;                        // AR:ULID
  lesson_id: string | null;
  unit_id: string | null;
  exercise_type: ArExerciseType;
  prompt_ar: string | null;
  prompt_en: string | null;
  options_json: string | null;       // JSON [{text, is_correct}] for MCQ
  answer_json: string | null;        // correct answer payload
  explanation_md: string | null;
  vocab_id: string | null;
  grammar_id: string | null;
  al_concept_ref: string | null;     // AL:<concept_id>
  qr_scope_ref: string | null;
  level: string | null;
  skill_focus: string | null;
  difficulty: ArExerciseDifficulty;
  meta_json: string | null;
  created_at: string;
}

export interface ArExerciseCreate {
  prompt_ar: string;
  exercise_type?: ArExerciseType;
  lesson_id?: string | null;
  unit_id?: string | null;
  prompt_en?: string | null;
  options_json?: string | null;
  answer_json?: string | null;
  explanation_md?: string | null;
  level?: string | null;
  difficulty?: ArExerciseDifficulty;
  vocab_id?: string | null;
  grammar_id?: string | null;
}

export interface ArExercisePatch {
  lesson_id?: string | null;
  unit_id?: string | null;
  exercise_type?: ArExerciseType;
  prompt_ar?: string;
  prompt_en?: string | null;
  options_json?: string | null;
  answer_json?: string | null;
  explanation_md?: string | null;
  vocab_id?: string | null;
  grammar_id?: string | null;
  al_concept_ref?: string | null;
  qr_scope_ref?: string | null;
  level?: string | null;
  skill_focus?: string | null;
  difficulty?: ArExerciseDifficulty;
  meta_json?: string | null;
}

// ─── Exercise Attempt ─────────────────────────────────────────────────────────

export interface ArExerciseAttempt {
  id: string;                        // AR:ULID
  exercise_id: string;
  core_user_ref: string;             // CORE:<user_id>
  response_json: string | null;
  is_correct: boolean;
  score: number | null;
  time_spent_secs: number | null;
  attempt_number: number;
  attempted_at: string;
}

export interface ArExerciseAttemptCreate {
  exercise_id: string;
  core_user_ref: string;
  response_json?: string | null;
  is_correct?: boolean;
  score?: number | null;
  time_spent_secs?: number | null;
  attempt_number?: number;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_EXERCISE_TYPES: ArExerciseType[] = [
  'multiple_choice', 'fill_blank', 'translation', 'parsing', 'matching', 'free_write',
];
const VALID_DIFFICULTIES: ArExerciseDifficulty[] = ['easy', 'medium', 'hard'];

export function validateArExerciseCreate(
  body: unknown,
): { data: ArExerciseCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.prompt_ar || typeof b.prompt_ar !== 'string' || b.prompt_ar.trim() === '') {
    return { error: 'prompt_ar is required and must be a non-empty string' };
  }
  if (b.exercise_type !== undefined && !VALID_EXERCISE_TYPES.includes(b.exercise_type as ArExerciseType)) {
    return { error: `exercise_type must be one of: ${VALID_EXERCISE_TYPES.join(', ')}` };
  }
  if (b.difficulty !== undefined && !VALID_DIFFICULTIES.includes(b.difficulty as ArExerciseDifficulty)) {
    return { error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` };
  }

  return {
    data: {
      prompt_ar: (b.prompt_ar as string).trim(),
      exercise_type: b.exercise_type !== undefined ? (b.exercise_type as ArExerciseType) : undefined,
      lesson_id: typeof b.lesson_id === 'string' ? b.lesson_id : b.lesson_id === null ? null : undefined,
      unit_id: typeof b.unit_id === 'string' ? b.unit_id : b.unit_id === null ? null : undefined,
      prompt_en: typeof b.prompt_en === 'string' ? b.prompt_en : b.prompt_en === null ? null : undefined,
      options_json: typeof b.options_json === 'string' ? b.options_json : b.options_json === null ? null : undefined,
      answer_json: typeof b.answer_json === 'string' ? b.answer_json : b.answer_json === null ? null : undefined,
      explanation_md: typeof b.explanation_md === 'string' ? b.explanation_md : b.explanation_md === null ? null : undefined,
      level: typeof b.level === 'string' ? b.level : b.level === null ? null : undefined,
      difficulty: b.difficulty !== undefined ? (b.difficulty as ArExerciseDifficulty) : undefined,
      vocab_id: typeof b.vocab_id === 'string' ? b.vocab_id : b.vocab_id === null ? null : undefined,
      grammar_id: typeof b.grammar_id === 'string' ? b.grammar_id : b.grammar_id === null ? null : undefined,
    },
  };
}

export function validateArExerciseAttemptCreate(
  body: unknown,
): { data: ArExerciseAttemptCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.exercise_id || typeof b.exercise_id !== 'string') {
    return { error: 'exercise_id is required and must be a string' };
  }
  if (!b.core_user_ref || typeof b.core_user_ref !== 'string') {
    return { error: 'core_user_ref is required and must be a string' };
  }

  return {
    data: {
      exercise_id: b.exercise_id as string,
      core_user_ref: b.core_user_ref as string,
      response_json: typeof b.response_json === 'string' ? b.response_json : b.response_json === null ? null : undefined,
      is_correct: typeof b.is_correct === 'boolean' ? b.is_correct : undefined,
      score: typeof b.score === 'number' ? b.score : b.score === null ? null : undefined,
      time_spent_secs: typeof b.time_spent_secs === 'number' ? b.time_spent_secs : b.time_spent_secs === null ? null : undefined,
      attempt_number: typeof b.attempt_number === 'number' ? b.attempt_number : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface Exercise {
  id: string;               // AR:ULID
  lesson_id: string;        // AR:ULID
  exercise_type: string;    // flashcard | fill-blank | mcq | translation | parsing
  prompt: string;
  answer: string | null;
  options_json: string | null; // JSON array of MCQ choices
  sort_order: number;
  status: string;
  created_at: string;
}

export interface ExerciseCreate {
  lesson_id: string;
  exercise_type: string;
  prompt: string;
  answer?: string | null;
  options_json?: string | null;
  sort_order?: number;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArExercisePatch(body: unknown): SchemaValidationResult<ArExercisePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('lesson_id' in b) {
    if (b.lesson_id !== null && typeof b.lesson_id !== 'string') return { error: 'lesson_id must be a string or null' };
    data.lesson_id = b.lesson_id;
  }
  if ('unit_id' in b) {
    if (b.unit_id !== null && typeof b.unit_id !== 'string') return { error: 'unit_id must be a string or null' };
    data.unit_id = b.unit_id;
  }
  if ('exercise_type' in b) {
    data.exercise_type = b.exercise_type;
  }
  if ('prompt_ar' in b) {
    if (typeof b.prompt_ar !== 'string') return { error: 'prompt_ar must be a string' };
    data.prompt_ar = b.prompt_ar;
  }
  if ('prompt_en' in b) {
    if (b.prompt_en !== null && typeof b.prompt_en !== 'string') return { error: 'prompt_en must be a string or null' };
    data.prompt_en = b.prompt_en;
  }
  if ('options_json' in b) {
    if (b.options_json !== null && typeof b.options_json !== 'string') return { error: 'options_json must be a string or null' };
    data.options_json = b.options_json;
  }
  if ('answer_json' in b) {
    if (b.answer_json !== null && typeof b.answer_json !== 'string') return { error: 'answer_json must be a string or null' };
    data.answer_json = b.answer_json;
  }
  if ('explanation_md' in b) {
    if (b.explanation_md !== null && typeof b.explanation_md !== 'string') return { error: 'explanation_md must be a string or null' };
    data.explanation_md = b.explanation_md;
  }
  if ('vocab_id' in b) {
    if (b.vocab_id !== null && typeof b.vocab_id !== 'string') return { error: 'vocab_id must be a string or null' };
    data.vocab_id = b.vocab_id;
  }
  if ('grammar_id' in b) {
    if (b.grammar_id !== null && typeof b.grammar_id !== 'string') return { error: 'grammar_id must be a string or null' };
    data.grammar_id = b.grammar_id;
  }
  if ('al_concept_ref' in b) {
    if (b.al_concept_ref !== null && typeof b.al_concept_ref !== 'string') return { error: 'al_concept_ref must be a string or null' };
    data.al_concept_ref = b.al_concept_ref;
  }
  if ('qr_scope_ref' in b) {
    if (b.qr_scope_ref !== null && typeof b.qr_scope_ref !== 'string') return { error: 'qr_scope_ref must be a string or null' };
    data.qr_scope_ref = b.qr_scope_ref;
  }
  if ('level' in b) {
    if (b.level !== null && typeof b.level !== 'string') return { error: 'level must be a string or null' };
    data.level = b.level;
  }
  if ('skill_focus' in b) {
    if (b.skill_focus !== null && typeof b.skill_focus !== 'string') return { error: 'skill_focus must be a string or null' };
    data.skill_focus = b.skill_focus;
  }
  if ('difficulty' in b) {
    data.difficulty = b.difficulty;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArExercisePatch };
}

export function validateExerciseCreate(body: unknown): SchemaValidationResult<ExerciseCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.lesson_id !== 'string' || !b.lesson_id.trim()) return { error: 'lesson_id is required and must be a non-empty string' };
  data.lesson_id = b.lesson_id.trim();
  if (typeof b.exercise_type !== 'string' || !b.exercise_type.trim()) return { error: 'exercise_type is required and must be a non-empty string' };
  data.exercise_type = b.exercise_type.trim();
  if (typeof b.prompt !== 'string' || !b.prompt.trim()) return { error: 'prompt is required and must be a non-empty string' };
  data.prompt = b.prompt.trim();
  if ('answer' in b) {
    if (b.answer !== null && typeof b.answer !== 'string') return { error: 'answer must be a string or null' };
    data.answer = b.answer;
  }
  if ('options_json' in b) {
    if (b.options_json !== null && typeof b.options_json !== 'string') return { error: 'options_json must be a string or null' };
    data.options_json = b.options_json;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as ExerciseCreate };
}

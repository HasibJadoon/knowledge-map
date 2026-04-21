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

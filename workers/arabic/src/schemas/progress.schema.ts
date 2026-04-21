// ─── Progress schemas & types ───────────────────────────────────────────────

export interface TaskCompletion {
  id: string;
  task_id: string;
  core_user_ref: string;
  completed_at: string;
  time_spent_mins: number | null;
  notes: string | null;
}

export interface UnitProgress {
  id: string;
  unit_id: string;
  core_user_ref: string;
  status: string;             // not_started|in_progress|completed|revisiting
  progress_pct: number;       // 0–100
  last_activity_at: string | null;
  completed_at: string | null;
  meta_json: string | null;
}

export interface UnitProgressInput {
  unit_id: string;
  core_user_ref: string;
  status?: string;
  progress_pct?: number;
  last_activity_at?: string | null;
  completed_at?: string | null;
  meta_json?: string | null;
}

export interface MasteryProfile {
  id: string;
  core_user_ref: string;
  track_id: string | null;
  skill: string;              // sarf|nahw|balagha|vocab_size|reading|listening|other
  mastery_score: number;      // 0–1
  items_mastered: number;
  items_learning: number;
  last_assessed_at: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasteryInput {
  core_user_ref: string;
  track_id: string | null;
  skill: string;
  mastery_score: number;
  items_mastered?: number;
  items_learning?: number;
  last_assessed_at?: string | null;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateUnitProgressInput(body: unknown): SchemaValidationResult<UnitProgressInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.unit_id !== 'string' || !b.unit_id.trim()) return { error: 'unit_id is required and must be a non-empty string' };
  data.unit_id = b.unit_id.trim();
  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if ('status' in b) {
    if (typeof b.status !== 'string') return { error: 'status must be a string' };
    data.status = b.status;
  }
  if ('progress_pct' in b) {
    if (typeof b.progress_pct !== 'number' || !Number.isFinite(b.progress_pct)) return { error: 'progress_pct must be a number' };
    data.progress_pct = b.progress_pct;
  }
  if ('last_activity_at' in b) {
    if (b.last_activity_at !== null && typeof b.last_activity_at !== 'string') return { error: 'last_activity_at must be a string or null' };
    data.last_activity_at = b.last_activity_at;
  }
  if ('completed_at' in b) {
    if (b.completed_at !== null && typeof b.completed_at !== 'string') return { error: 'completed_at must be a string or null' };
    data.completed_at = b.completed_at;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as UnitProgressInput };
}

export function validateMasteryInput(body: unknown): SchemaValidationResult<MasteryInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if (b.track_id !== null && typeof b.track_id !== 'string') return { error: 'track_id is required and must be a string or null' };
  data.track_id = typeof b.track_id === 'string' ? b.track_id.trim() : null;
  if (typeof b.skill !== 'string' || !b.skill.trim()) return { error: 'skill is required and must be a non-empty string' };
  data.skill = b.skill.trim();
  if (typeof b.mastery_score !== 'number' || !Number.isFinite(b.mastery_score)) return { error: 'mastery_score is required and must be a number' };
  data.mastery_score = b.mastery_score;
  if ('items_mastered' in b) {
    if (typeof b.items_mastered !== 'number' || !Number.isFinite(b.items_mastered)) return { error: 'items_mastered must be a number' };
    data.items_mastered = b.items_mastered;
  }
  if ('items_learning' in b) {
    if (typeof b.items_learning !== 'number' || !Number.isFinite(b.items_learning)) return { error: 'items_learning must be a number' };
    data.items_learning = b.items_learning;
  }
  if ('last_assessed_at' in b) {
    if (b.last_assessed_at !== null && typeof b.last_assessed_at !== 'string') return { error: 'last_assessed_at must be a string or null' };
    data.last_assessed_at = b.last_assessed_at;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as MasteryInput };
}

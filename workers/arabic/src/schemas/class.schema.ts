// ─── Class schemas & types ────────────────────────────────────────────────────

export type ArClassType = 'live' | 'self_paced' | 'blended';
export type ArClassStatus = 'draft' | 'active' | 'completed' | 'archived';
export type ArClassVisibility = 'private' | 'workspace' | 'public';
export type ArEnrolmentRole = 'student' | 'auditor';
export type ArEnrolmentStatus = 'active' | 'completed' | 'withdrawn';
export type ArAssignmentStatus = 'draft' | 'active' | 'closed';
export type ArSubmissionStatus = 'submitted' | 'graded' | 'returned';

// ─── Class ────────────────────────────────────────────────────────────────────

export interface ArClass {
  id: string;                        // AR:ULID
  slug: string | null;
  title: string;
  description_md: string | null;
  class_type: ArClassType;
  container_id: string | null;
  curriculum_id: string | null;
  teacher_ref: string;               // CORE:<user_id>
  core_ws_ref: string;               // CORE:<workspace_id>
  status: ArClassStatus;
  start_date: string | null;
  end_date: string | null;
  max_enrolments: number | null;
  visibility: ArClassVisibility;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArClassCreate {
  title: string;
  class_type?: ArClassType;
  slug?: string | null;
  teacher_ref?: string | null;
  core_ws_ref?: string | null;
  container_id?: string | null;
  curriculum_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  max_enrolments?: number | null;
  visibility?: ArClassVisibility;
}

export interface ArClassPatch {
  slug?: string | null;
  title?: string;
  description_md?: string | null;
  class_type?: ArClassType;
  container_id?: string | null;
  curriculum_id?: string | null;
  teacher_ref?: string;
  core_ws_ref?: string;
  status?: ArClassStatus;
  start_date?: string | null;
  end_date?: string | null;
  max_enrolments?: number | null;
  visibility?: ArClassVisibility;
  meta_json?: string | null;
}

// ─── Class Enrolment ──────────────────────────────────────────────────────────

export interface ArClassEnrolment {
  id: string;                        // AR:ULID
  class_id: string;
  student_ref: string;               // CORE:<user_id>
  role: ArEnrolmentRole;
  status: ArEnrolmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  meta_json: string | null;
}

export interface ArClassEnrolmentCreate {
  class_id: string;
  student_ref: string;
  role?: ArEnrolmentRole;
  status?: ArEnrolmentStatus;
}

// ─── Class Resources ──────────────────────────────────────────────────────────

export interface ArClassResource {
  id: string;
  class_id: string;
  resource_ref: string;
  resource_type: string;
  resource_label: string | null;
  sort_order: number;
  is_required: boolean;
  added_by_ref: string | null;
  added_at: string;
}

export interface ArClassResourceCreate {
  class_id: string;
  resource_ref: string;
  resource_type: string;
  resource_label?: string | null;
  sort_order?: number;
  is_required?: boolean;
  added_by_ref?: string | null;
}

// ─── Class Assignment ─────────────────────────────────────────────────────────

export interface ArClassAssignment {
  id: string;                        // AR:ULID
  class_id: string;
  title: string;
  instructions_md: string | null;
  resource_refs: string | null;      // JSON [typed_refs]
  due_date: string | null;
  weight: number;
  status: ArAssignmentStatus;
  meta_json: string | null;
  created_at: string;
}

export interface ArAssignmentCreate {
  class_id: string;
  title: string;
  instructions_md?: string | null;
  due_date?: string | null;
  weight?: number;
  resource_refs?: string | null;
}

export interface ArAssignmentPatch {
  title?: string;
  instructions_md?: string | null;
  resource_refs?: string | null;
  due_date?: string | null;
  weight?: number;
  status?: ArAssignmentStatus;
  meta_json?: string | null;
}

// ─── Assignment Submission ────────────────────────────────────────────────────

export interface ArAssignmentSubmission {
  id: string;                        // AR:ULID
  assignment_id: string;
  student_ref: string;               // CORE:<user_id>
  submission_type: string;
  content_md: string | null;
  cm_doc_ref: string | null;         // CM:<doc_id>
  score: number | null;
  feedback_md: string | null;
  graded_by_ref: string | null;
  status: ArSubmissionStatus;
  submitted_at: string;
  graded_at: string | null;
}

export interface ArSubmissionCreate {
  assignment_id: string;
  student_ref: string;
  submission_type?: string;
  content_md?: string | null;
  cm_doc_ref?: string | null;
}

export interface ArSubmissionPatch {
  submission_type?: string;
  content_md?: string | null;
  cm_doc_ref?: string | null;
  score?: number | null;
  feedback_md?: string | null;
  graded_by_ref?: string | null;
  status?: ArSubmissionStatus;
  graded_at?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_CLASS_TYPES: ArClassType[] = ['live', 'self_paced', 'blended'];
const VALID_CLASS_STATUSES: ArClassStatus[] = ['draft', 'active', 'completed', 'archived'];
const VALID_VISIBILITIES: ArClassVisibility[] = ['private', 'workspace', 'public'];
const VALID_ENROLMENT_ROLES: ArEnrolmentRole[] = ['student', 'auditor'];
const VALID_ENROLMENT_STATUSES: ArEnrolmentStatus[] = ['active', 'completed', 'withdrawn'];
const VALID_ASSIGNMENT_STATUSES: ArAssignmentStatus[] = ['draft', 'active', 'closed'];

export function validateArClassCreate(
  body: unknown,
): { data: ArClassCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }
  if (b.class_type !== undefined && !VALID_CLASS_TYPES.includes(b.class_type as ArClassType)) {
    return { error: `class_type must be one of: ${VALID_CLASS_TYPES.join(', ')}` };
  }
  if (b.visibility !== undefined && !VALID_VISIBILITIES.includes(b.visibility as ArClassVisibility)) {
    return { error: `visibility must be one of: ${VALID_VISIBILITIES.join(', ')}` };
  }

  return {
    data: {
      title: (b.title as string).trim(),
      class_type: b.class_type !== undefined ? (b.class_type as ArClassType) : undefined,
      slug: typeof b.slug === 'string' ? b.slug.trim() : b.slug === null ? null : undefined,
      teacher_ref: typeof b.teacher_ref === 'string' ? b.teacher_ref : b.teacher_ref === null ? null : undefined,
      core_ws_ref: typeof b.core_ws_ref === 'string' ? b.core_ws_ref : b.core_ws_ref === null ? null : undefined,
      container_id: typeof b.container_id === 'string' ? b.container_id : b.container_id === null ? null : undefined,
      curriculum_id: typeof b.curriculum_id === 'string' ? b.curriculum_id : b.curriculum_id === null ? null : undefined,
      start_date: typeof b.start_date === 'string' ? b.start_date : b.start_date === null ? null : undefined,
      end_date: typeof b.end_date === 'string' ? b.end_date : b.end_date === null ? null : undefined,
      max_enrolments: typeof b.max_enrolments === 'number' ? b.max_enrolments : b.max_enrolments === null ? null : undefined,
      visibility: b.visibility !== undefined ? (b.visibility as ArClassVisibility) : undefined,
    },
  };
}

export function validateArClassEnrolmentCreate(
  body: unknown,
): { data: ArClassEnrolmentCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.class_id || typeof b.class_id !== 'string') {
    return { error: 'class_id is required and must be a string' };
  }
  if (!b.student_ref || typeof b.student_ref !== 'string') {
    return { error: 'student_ref is required and must be a string' };
  }
  if (b.role !== undefined && !VALID_ENROLMENT_ROLES.includes(b.role as ArEnrolmentRole)) {
    return { error: `role must be one of: ${VALID_ENROLMENT_ROLES.join(', ')}` };
  }
  if (b.status !== undefined && !VALID_ENROLMENT_STATUSES.includes(b.status as ArEnrolmentStatus)) {
    return { error: `status must be one of: ${VALID_ENROLMENT_STATUSES.join(', ')}` };
  }

  return {
    data: {
      class_id: b.class_id as string,
      student_ref: b.student_ref as string,
      role: b.role !== undefined ? (b.role as ArEnrolmentRole) : undefined,
      status: b.status !== undefined ? (b.status as ArEnrolmentStatus) : undefined,
    },
  };
}

export function validateArAssignmentCreate(
  body: unknown,
): { data: ArAssignmentCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.class_id || typeof b.class_id !== 'string') {
    return { error: 'class_id is required and must be a string' };
  }
  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  return {
    data: {
      class_id: b.class_id as string,
      title: (b.title as string).trim(),
      instructions_md: typeof b.instructions_md === 'string' ? b.instructions_md : b.instructions_md === null ? null : undefined,
      due_date: typeof b.due_date === 'string' ? b.due_date : b.due_date === null ? null : undefined,
      weight: typeof b.weight === 'number' ? b.weight : undefined,
      resource_refs: typeof b.resource_refs === 'string' ? b.resource_refs : b.resource_refs === null ? null : undefined,
    },
  };
}

export function validateArSubmissionCreate(
  body: unknown,
): { data: ArSubmissionCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.assignment_id || typeof b.assignment_id !== 'string') {
    return { error: 'assignment_id is required and must be a string' };
  }
  if (!b.student_ref || typeof b.student_ref !== 'string') {
    return { error: 'student_ref is required and must be a string' };
  }

  return {
    data: {
      assignment_id: b.assignment_id as string,
      student_ref: b.student_ref as string,
      submission_type: typeof b.submission_type === 'string' ? b.submission_type : undefined,
      content_md: typeof b.content_md === 'string' ? b.content_md : b.content_md === null ? null : undefined,
      cm_doc_ref: typeof b.cm_doc_ref === 'string' ? b.cm_doc_ref : b.cm_doc_ref === null ? null : undefined,
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface ClassEnrolment {
  id: string;
  class_id: string;
  student_ref: string;        // CORE:<user_id>
  role: string;               // student|teacher_assistant|observer|auditor
  status: string;             // invited|active|paused|withdrawn|completed
  enrolled_at: string;
  completed_at: string | null;
  meta_json: string | null;
}

export interface ClassResource {
  id: string;
  class_id: string;
  resource_ref: string;       // typed ref: CM:<doc_id>|AR:<vocab_id>|etc.
  resource_type: string;      // cm_doc|lesson|exercise_set|vocab_list|grammar_note|media|other
  resource_label: string | null;
  sort_order: number;
  is_required: number;
  added_by_ref: string | null;
  added_at: string;
}

export interface ClassResourceInput {
  resource_ref: string;
  resource_type: string;
  resource_label?: string | null;
  sort_order?: number;
  is_required?: number;
  added_by_ref?: string | null;
}

export interface ClassAssignment {
  id: string;
  class_id: string;
  title: string;
  instructions_md: string | null;
  resource_refs: string | null;   // JSON [typed_refs]
  due_date: string | null;
  weight: number;
  status: string;             // open|closed|graded
  meta_json: string | null;
  created_at: string;
}

export interface ClassAssignmentCreate {
  title: string;
  instructions_md?: string | null;
  resource_refs?: string | null;
  due_date?: string | null;
  weight?: number;
  meta_json?: string | null;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_ref: string;
  submission_type: string;    // text|file|audio|link|other
  content_md: string | null;
  cm_doc_ref: string | null;
  score: number | null;
  feedback_md: string | null;
  graded_by_ref: string | null;
  status: string;             // draft|submitted|graded|returned
  submitted_at: string;
  graded_at: string | null;
}

export interface SubmissionInput {
  student_ref: string;
  submission_type?: string;
  content_md?: string | null;
  cm_doc_ref?: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateArClassPatch(body: unknown): SchemaValidationResult<ArClassPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('slug' in b) {
    if (b.slug !== null && typeof b.slug !== 'string') return { error: 'slug must be a string or null' };
    data.slug = b.slug;
  }
  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('class_type' in b) {
    data.class_type = b.class_type;
  }
  if ('container_id' in b) {
    if (b.container_id !== null && typeof b.container_id !== 'string') return { error: 'container_id must be a string or null' };
    data.container_id = b.container_id;
  }
  if ('curriculum_id' in b) {
    if (b.curriculum_id !== null && typeof b.curriculum_id !== 'string') return { error: 'curriculum_id must be a string or null' };
    data.curriculum_id = b.curriculum_id;
  }
  if ('teacher_ref' in b) {
    if (typeof b.teacher_ref !== 'string') return { error: 'teacher_ref must be a string' };
    data.teacher_ref = b.teacher_ref;
  }
  if ('core_ws_ref' in b) {
    if (typeof b.core_ws_ref !== 'string') return { error: 'core_ws_ref must be a string' };
    data.core_ws_ref = b.core_ws_ref;
  }
  if ('status' in b) {
    data.status = b.status;
  }
  if ('start_date' in b) {
    if (b.start_date !== null && typeof b.start_date !== 'string') return { error: 'start_date must be a string or null' };
    data.start_date = b.start_date;
  }
  if ('end_date' in b) {
    if (b.end_date !== null && typeof b.end_date !== 'string') return { error: 'end_date must be a string or null' };
    data.end_date = b.end_date;
  }
  if ('max_enrolments' in b) {
    if (b.max_enrolments !== null && (typeof b.max_enrolments !== 'number' || !Number.isFinite(b.max_enrolments))) return { error: 'max_enrolments must be a number or null' };
    data.max_enrolments = b.max_enrolments;
  }
  if ('visibility' in b) {
    data.visibility = b.visibility;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArClassPatch };
}

export function validateArClassResourceCreate(body: unknown): SchemaValidationResult<ArClassResourceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.class_id !== 'string' || !b.class_id.trim()) return { error: 'class_id is required and must be a non-empty string' };
  data.class_id = b.class_id.trim();
  if (typeof b.resource_ref !== 'string' || !b.resource_ref.trim()) return { error: 'resource_ref is required and must be a non-empty string' };
  data.resource_ref = b.resource_ref.trim();
  if (typeof b.resource_type !== 'string' || !b.resource_type.trim()) return { error: 'resource_type is required and must be a non-empty string' };
  data.resource_type = b.resource_type.trim();
  if ('resource_label' in b) {
    if (b.resource_label !== null && typeof b.resource_label !== 'string') return { error: 'resource_label must be a string or null' };
    data.resource_label = b.resource_label;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }
  if ('is_required' in b) {
    if (typeof b.is_required !== 'boolean') return { error: 'is_required must be a boolean' };
    data.is_required = b.is_required;
  }
  if ('added_by_ref' in b) {
    if (b.added_by_ref !== null && typeof b.added_by_ref !== 'string') return { error: 'added_by_ref must be a string or null' };
    data.added_by_ref = b.added_by_ref;
  }

  return { data: data as unknown as ArClassResourceCreate };
}

export function validateArAssignmentPatch(body: unknown): SchemaValidationResult<ArAssignmentPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('instructions_md' in b) {
    if (b.instructions_md !== null && typeof b.instructions_md !== 'string') return { error: 'instructions_md must be a string or null' };
    data.instructions_md = b.instructions_md;
  }
  if ('resource_refs' in b) {
    if (b.resource_refs !== null && typeof b.resource_refs !== 'string') return { error: 'resource_refs must be a string or null' };
    data.resource_refs = b.resource_refs;
  }
  if ('due_date' in b) {
    if (b.due_date !== null && typeof b.due_date !== 'string') return { error: 'due_date must be a string or null' };
    data.due_date = b.due_date;
  }
  if ('weight' in b) {
    if (typeof b.weight !== 'number' || !Number.isFinite(b.weight)) return { error: 'weight must be a number' };
    data.weight = b.weight;
  }
  if ('status' in b) {
    data.status = b.status;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArAssignmentPatch };
}

export function validateArSubmissionPatch(body: unknown): SchemaValidationResult<ArSubmissionPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('submission_type' in b) {
    if (typeof b.submission_type !== 'string') return { error: 'submission_type must be a string' };
    data.submission_type = b.submission_type;
  }
  if ('content_md' in b) {
    if (b.content_md !== null && typeof b.content_md !== 'string') return { error: 'content_md must be a string or null' };
    data.content_md = b.content_md;
  }
  if ('cm_doc_ref' in b) {
    if (b.cm_doc_ref !== null && typeof b.cm_doc_ref !== 'string') return { error: 'cm_doc_ref must be a string or null' };
    data.cm_doc_ref = b.cm_doc_ref;
  }
  if ('score' in b) {
    if (b.score !== null && (typeof b.score !== 'number' || !Number.isFinite(b.score))) return { error: 'score must be a number or null' };
    data.score = b.score;
  }
  if ('feedback_md' in b) {
    if (b.feedback_md !== null && typeof b.feedback_md !== 'string') return { error: 'feedback_md must be a string or null' };
    data.feedback_md = b.feedback_md;
  }
  if ('graded_by_ref' in b) {
    if (b.graded_by_ref !== null && typeof b.graded_by_ref !== 'string') return { error: 'graded_by_ref must be a string or null' };
    data.graded_by_ref = b.graded_by_ref;
  }
  if ('status' in b) {
    data.status = b.status;
  }
  if ('graded_at' in b) {
    if (b.graded_at !== null && typeof b.graded_at !== 'string') return { error: 'graded_at must be a string or null' };
    data.graded_at = b.graded_at;
  }

  return { data: data as unknown as ArSubmissionPatch };
}

export function validateClassResourceInput(body: unknown): SchemaValidationResult<ClassResourceInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.resource_ref !== 'string' || !b.resource_ref.trim()) return { error: 'resource_ref is required and must be a non-empty string' };
  data.resource_ref = b.resource_ref.trim();
  if (typeof b.resource_type !== 'string' || !b.resource_type.trim()) return { error: 'resource_type is required and must be a non-empty string' };
  data.resource_type = b.resource_type.trim();
  if ('resource_label' in b) {
    if (b.resource_label !== null && typeof b.resource_label !== 'string') return { error: 'resource_label must be a string or null' };
    data.resource_label = b.resource_label;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }
  if ('is_required' in b) {
    if (typeof b.is_required !== 'number' || !Number.isFinite(b.is_required)) return { error: 'is_required must be a number' };
    data.is_required = b.is_required;
  }
  if ('added_by_ref' in b) {
    if (b.added_by_ref !== null && typeof b.added_by_ref !== 'string') return { error: 'added_by_ref must be a string or null' };
    data.added_by_ref = b.added_by_ref;
  }

  return { data: data as unknown as ClassResourceInput };
}

export function validateClassAssignmentCreate(body: unknown): SchemaValidationResult<ClassAssignmentCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('instructions_md' in b) {
    if (b.instructions_md !== null && typeof b.instructions_md !== 'string') return { error: 'instructions_md must be a string or null' };
    data.instructions_md = b.instructions_md;
  }
  if ('resource_refs' in b) {
    if (b.resource_refs !== null && typeof b.resource_refs !== 'string') return { error: 'resource_refs must be a string or null' };
    data.resource_refs = b.resource_refs;
  }
  if ('due_date' in b) {
    if (b.due_date !== null && typeof b.due_date !== 'string') return { error: 'due_date must be a string or null' };
    data.due_date = b.due_date;
  }
  if ('weight' in b) {
    if (typeof b.weight !== 'number' || !Number.isFinite(b.weight)) return { error: 'weight must be a number' };
    data.weight = b.weight;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ClassAssignmentCreate };
}

export function validateSubmissionInput(body: unknown): SchemaValidationResult<SubmissionInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.student_ref !== 'string' || !b.student_ref.trim()) return { error: 'student_ref is required and must be a non-empty string' };
  data.student_ref = b.student_ref.trim();
  if ('submission_type' in b) {
    if (typeof b.submission_type !== 'string') return { error: 'submission_type must be a string' };
    data.submission_type = b.submission_type;
  }
  if ('content_md' in b) {
    if (b.content_md !== null && typeof b.content_md !== 'string') return { error: 'content_md must be a string or null' };
    data.content_md = b.content_md;
  }
  if ('cm_doc_ref' in b) {
    if (b.cm_doc_ref !== null && typeof b.cm_doc_ref !== 'string') return { error: 'cm_doc_ref must be a string or null' };
    data.cm_doc_ref = b.cm_doc_ref;
  }

  return { data: data as unknown as SubmissionInput };
}

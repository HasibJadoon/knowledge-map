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

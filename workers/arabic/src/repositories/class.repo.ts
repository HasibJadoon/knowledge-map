// ─── ClassRepo — ar_classes + ar_class_enrolments + ar_class_resources ────────
//              + ar_class_assignments + ar_assignment_submissions
// Teacher-led delivery shell: class lifecycle, enrolments, resources,
// assignments and graded submissions.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ArClass {
  id: string;
  slug: string | null;
  title: string;
  description_md: string | null;
  class_type: string;         // course|workshop|tutoring|group_study|other
  container_id: string | null;
  curriculum_id: string | null;
  teacher_ref: string;        // CORE:<user_id>
  core_ws_ref: string;        // CORE:<workspace_id>
  status: string;             // draft|active|paused|completed|archived
  start_date: string | null;
  end_date: string | null;
  max_enrolments: number | null;
  visibility: string;         // private|workspace|public
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArClassCreate {
  slug?: string | null;
  title: string;
  description_md?: string | null;
  class_type?: string;
  container_id?: string | null;
  curriculum_id?: string | null;
  teacher_ref: string;
  core_ws_ref: string;
  start_date?: string | null;
  end_date?: string | null;
  max_enrolments?: number | null;
  visibility?: string;
  meta_json?: string | null;
}

export interface ArClassPatch {
  title?: string;
  description_md?: string | null;
  class_type?: string;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  max_enrolments?: number | null;
  visibility?: string;
  meta_json?: string | null;
}

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

// ── Column lists ──────────────────────────────────────────────────────────────

const CLASS_COLS = `id, slug, title, description_md, class_type,
  container_id, curriculum_id, teacher_ref, core_ws_ref, status,
  start_date, end_date, max_enrolments, visibility, meta_json,
  created_at, updated_at`;

const ENROL_COLS = `id, class_id, student_ref, role, status,
  enrolled_at, completed_at, meta_json`;

const RESOURCE_COLS = `id, class_id, resource_ref, resource_type,
  resource_label, sort_order, is_required, added_by_ref, added_at`;

const ASSIGN_COLS = `id, class_id, title, instructions_md, resource_refs,
  due_date, weight, status, meta_json, created_at`;

const SUB_COLS = `id, assignment_id, student_ref, submission_type,
  content_md, cm_doc_ref, score, feedback_md, graded_by_ref,
  status, submitted_at, graded_at`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class ClassRepo {
  constructor(private db: D1Database) {}

  // ── Classes ──────────────────────────────────────────────────────────────────

  list(workspaceRef: string, opts: PaginateOptions = {}) {
    return paginate<ArClass>(
      this.db,
      `SELECT ${CLASS_COLS} FROM ar_classes WHERE core_ws_ref = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM ar_classes WHERE core_ws_ref = ?`,
      [workspaceRef],
      opts,
    );
  }

  findById(id: string): Promise<ArClass | null> {
    return queryOne<ArClass>(
      this.db,
      `SELECT ${CLASS_COLS} FROM ar_classes WHERE id = ?`,
      [id],
    );
  }

  findBySlug(slug: string): Promise<ArClass | null> {
    return queryOne<ArClass>(
      this.db,
      `SELECT ${CLASS_COLS} FROM ar_classes WHERE slug = ?`,
      [slug],
    );
  }

  async create(input: ArClassCreate): Promise<ArClass> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_classes
         (id, slug, title, description_md, class_type,
          container_id, curriculum_id, teacher_ref, core_ws_ref, status,
          start_date, end_date, max_enrolments, visibility, meta_json,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug ?? null,
        input.title,
        input.description_md ?? null,
        input.class_type ?? 'course',
        input.container_id ?? null,
        input.curriculum_id ?? null,
        input.teacher_ref,
        input.core_ws_ref,
        input.start_date ?? null,
        input.end_date ?? null,
        input.max_enrolments ?? null,
        input.visibility ?? 'workspace',
        input.meta_json ?? null,
        now,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: ArClassPatch): Promise<ArClass | null> {
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [now];
    if (patch.title          !== undefined) { sets.push('title = ?');          vals.push(patch.title); }
    if (patch.description_md !== undefined) { sets.push('description_md = ?'); vals.push(patch.description_md); }
    if (patch.class_type     !== undefined) { sets.push('class_type = ?');     vals.push(patch.class_type); }
    if (patch.status         !== undefined) { sets.push('status = ?');         vals.push(patch.status); }
    if (patch.start_date     !== undefined) { sets.push('start_date = ?');     vals.push(patch.start_date); }
    if (patch.end_date       !== undefined) { sets.push('end_date = ?');       vals.push(patch.end_date); }
    if (patch.max_enrolments !== undefined) { sets.push('max_enrolments = ?'); vals.push(patch.max_enrolments); }
    if (patch.visibility     !== undefined) { sets.push('visibility = ?');     vals.push(patch.visibility); }
    if (patch.meta_json      !== undefined) { sets.push('meta_json = ?');      vals.push(patch.meta_json); }
    vals.push(id);
    await execute(
      this.db,
      `UPDATE ar_classes SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findById(id);
  }

  // ── Enrolments ───────────────────────────────────────────────────────────────

  enrolments(classId: string): Promise<ClassEnrolment[]> {
    return query<ClassEnrolment>(
      this.db,
      `SELECT ${ENROL_COLS} FROM ar_class_enrolments
       WHERE class_id = ? ORDER BY enrolled_at`,
      [classId],
    );
  }

  async enrol(classId: string, studentRef: string): Promise<ClassEnrolment> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT OR IGNORE INTO ar_class_enrolments
         (id, class_id, student_ref, role, status, enrolled_at, completed_at, meta_json)
       VALUES (?, ?, ?, 'student', 'active', ?, NULL, NULL)`,
      [id, classId, studentRef, now],
    );
    return (await queryOne<ClassEnrolment>(
      this.db,
      `SELECT ${ENROL_COLS} FROM ar_class_enrolments WHERE class_id = ? AND student_ref = ?`,
      [classId, studentRef],
    ))!;
  }

  async unenrol(classId: string, studentRef: string): Promise<void> {
    const now = new Date().toISOString();
    await execute(
      this.db,
      `UPDATE ar_class_enrolments
       SET status = 'withdrawn', completed_at = ?
       WHERE class_id = ? AND student_ref = ?`,
      [now, classId, studentRef],
    );
  }

  // ── Resources ────────────────────────────────────────────────────────────────

  resources(classId: string): Promise<ClassResource[]> {
    return query<ClassResource>(
      this.db,
      `SELECT ${RESOURCE_COLS} FROM ar_class_resources
       WHERE class_id = ? ORDER BY sort_order`,
      [classId],
    );
  }

  async addResource(classId: string, input: ClassResourceInput): Promise<ClassResource> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT OR IGNORE INTO ar_class_resources
         (id, class_id, resource_ref, resource_type, resource_label,
          sort_order, is_required, added_by_ref, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        classId,
        input.resource_ref,
        input.resource_type,
        input.resource_label ?? null,
        input.sort_order ?? 0,
        input.is_required ?? 1,
        input.added_by_ref ?? null,
        now,
      ],
    );
    return (await queryOne<ClassResource>(
      this.db,
      `SELECT ${RESOURCE_COLS} FROM ar_class_resources WHERE class_id = ? AND resource_ref = ?`,
      [classId, input.resource_ref],
    ))!;
  }

  // ── Assignments ──────────────────────────────────────────────────────────────

  assignments(classId: string, opts: PaginateOptions = {}) {
    return paginate<ClassAssignment>(
      this.db,
      `SELECT ${ASSIGN_COLS} FROM ar_class_assignments WHERE class_id = ? ORDER BY due_date NULLS LAST, created_at`,
      `SELECT COUNT(*) AS count FROM ar_class_assignments WHERE class_id = ?`,
      [classId],
      opts,
    );
  }

  findAssignment(id: string): Promise<ClassAssignment | null> {
    return queryOne<ClassAssignment>(
      this.db,
      `SELECT ${ASSIGN_COLS} FROM ar_class_assignments WHERE id = ?`,
      [id],
    );
  }

  async createAssignment(classId: string, input: ClassAssignmentCreate): Promise<ClassAssignment> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_class_assignments
         (id, class_id, title, instructions_md, resource_refs,
          due_date, weight, status, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      [
        id,
        classId,
        input.title,
        input.instructions_md ?? null,
        input.resource_refs ?? null,
        input.due_date ?? null,
        input.weight ?? 1.0,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findAssignment(id))!;
  }

  // ── Submissions ──────────────────────────────────────────────────────────────

  submissions(assignmentId: string): Promise<AssignmentSubmission[]> {
    return query<AssignmentSubmission>(
      this.db,
      `SELECT ${SUB_COLS} FROM ar_assignment_submissions
       WHERE assignment_id = ? ORDER BY submitted_at`,
      [assignmentId],
    );
  }

  async submit(assignmentId: string, input: SubmissionInput): Promise<AssignmentSubmission> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT OR REPLACE INTO ar_assignment_submissions
         (id, assignment_id, student_ref, submission_type, content_md,
          cm_doc_ref, score, feedback_md, graded_by_ref, status,
          submitted_at, graded_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 'submitted', ?, NULL)`,
      [
        id,
        assignmentId,
        input.student_ref,
        input.submission_type ?? 'text',
        input.content_md ?? null,
        input.cm_doc_ref ?? null,
        now,
      ],
    );
    return (await queryOne<AssignmentSubmission>(
      this.db,
      `SELECT ${SUB_COLS} FROM ar_assignment_submissions
       WHERE assignment_id = ? AND student_ref = ?`,
      [assignmentId, input.student_ref],
    ))!;
  }

  async grade(
    submissionId: string,
    score: number,
    feedbackMd: string,
  ): Promise<AssignmentSubmission | null> {
    const now = new Date().toISOString();
    await execute(
      this.db,
      `UPDATE ar_assignment_submissions
       SET score = ?, feedback_md = ?, status = 'graded', graded_at = ?
       WHERE id = ?`,
      [score, feedbackMd, now, submissionId],
    );
    return queryOne<AssignmentSubmission>(
      this.db,
      `SELECT ${SUB_COLS} FROM ar_assignment_submissions WHERE id = ?`,
      [submissionId],
    );
  }
}

// ─── Review schemas & types ───────────────────────────────────────────────

export interface DueTask {
  id: string;
  plan_id: string;
  title: string;
  task_type: string;
  status: string;
  priority: string | null;
  resource_ref: string | null;
  due_date: string | null;
  next_review_at: string | null;
  srs_quality: number | null;
}

export interface SrsFeedback {
  task_id: string;
  next_review_at: string;
}

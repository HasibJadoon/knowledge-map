/**
 * CANONICAL WEEKLY TASK
 * Matches `sp_weekly_tasks` table.
 * - Kanban-first workflow + optional reporting status
 * - Links to sp_weekly_plans via week_start
 * - Optional direct FKs to ar_lesson / worldview_claim / content_item
 * - task_json is structured wrapper (kind + data) for future-proofing
 */

export interface WeeklyTask {
  entity_type: 'weekly_task';
  id: number;

  user_id: number | null;

  week_start: string;
  title: string;

  task_type: WeeklyTaskType;

  kanban_state: WeeklyKanbanState;
  status: WeeklyTaskStatus;

  priority: TaskPriority;
  points: number | null;
  due_date: string | null;
  order_index: number;

  task: WeeklyTaskPayload;

  ar_lesson_id: number | null;
  worldview_claim_id: string | null;
  content_item_id: number | null;

  created_at: string;
  updated_at: string | null;
}

export type WeeklyTaskType = 'arabic' | 'worldview' | 'content' | 'crossref' | 'admin';

export type WeeklyKanbanState = 'backlog' | 'planned' | 'doing' | 'blocked' | 'done';

export type WeeklyTaskStatus = 'planned' | 'doing' | 'done';

export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export interface WeeklyTaskPayload {
  kind: string;
  data: Record<string, unknown>;
}

export class WeeklyTaskModel {
  constructor(public data: WeeklyTask) {}
}

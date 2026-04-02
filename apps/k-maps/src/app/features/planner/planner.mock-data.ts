import type { PlannerAccordionNote, PlannerPlanState, PlannerSection } from './planner-workspace.models';

export const PLANNER_SECTION_BLUEPRINT: PlannerSection[] = [
  { id: 'main-thought', title: 'Main Thought', body: '' },
  { id: 'breakdown', title: 'Breakdown', body: '' },
  { id: 'possible-outputs', title: 'Possible Outputs', body: '' },
  { id: 'notes', title: 'Notes', body: '' },
  { id: 'references', title: 'References', body: '' },
];

export const PLANNER_ACCORDION_BLUEPRINT: PlannerAccordionNote[] = [
  { id: 'source', label: 'Source', content: '' },
  { id: 'quote', label: 'Quote', content: '' },
  { id: 'resources', label: 'Resources', content: '' },
];

export const EMPTY_PLAN_STATE: PlannerPlanState = {
  summary: '',
  sections: PLANNER_SECTION_BLUEPRINT.map((section) => ({ ...section })),
  accordion_notes: PLANNER_ACCORDION_BLUEPRINT.map((note) => ({ ...note })),
  pushed_to_feed_at: null,
  pushed_to_kanban_at: null,
  kanban_task_id: null,
  feed_item_id: null,
};

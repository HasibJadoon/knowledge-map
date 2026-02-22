import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlannerInboxPage } from './planner-inbox.page';
import { PlannerKanbanPage } from './planner-kanban.page';
import { PlannerLessonsPage } from './planner-lessons.page';
import { PlannerPodcastPage } from './planner-podcast.page';
import { PlannerReviewPage } from './planner-review.page';
import { PlannerTabsPage } from '../planner-tabs.page';
import { WeeklyPlanPage } from './weekly-plan.page';

const routes: Routes = [
  {
    path: '',
    component: PlannerTabsPage,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'week',
      },
      {
        path: 'week',
        component: WeeklyPlanPage,
      },
      {
        path: 'week/:weekStart',
        component: WeeklyPlanPage,
      },
      {
        path: 'kanban',
        component: PlannerKanbanPage,
      },
      {
        path: 'inbox',
        component: PlannerInboxPage,
      },
      {
        path: 'lessons',
        component: PlannerLessonsPage,
      },
      {
        path: 'podcast',
        component: PlannerPodcastPage,
      },
      {
        path: 'review',
        component: PlannerReviewPage,
      },
      {
        path: 'review/:weekStart',
        component: PlannerReviewPage,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WeeklyPlanPageRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlannerTabsPage } from '../pages/planner-tabs/planner-tabs.page';

const routes: Routes = [
  {
    path: 'week',
    component: PlannerTabsPage,
  },
  {
    path: 'week/:weekStart',
    component: PlannerTabsPage,
  },
  {
    path: 'kanban',
    component: PlannerTabsPage,
  },
  {
    path: 'inbox',
    component: PlannerTabsPage,
  },
  {
    path: 'lessons',
    component: PlannerTabsPage,
  },
  {
    path: 'podcast',
    component: PlannerTabsPage,
  },
  {
    path: 'review',
    component: PlannerTabsPage,
  },
  {
    path: 'review/:weekStart',
    component: PlannerTabsPage,
  },
  {
    path: '',
    component: PlannerTabsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WeeklyPlanPageRoutingModule {}

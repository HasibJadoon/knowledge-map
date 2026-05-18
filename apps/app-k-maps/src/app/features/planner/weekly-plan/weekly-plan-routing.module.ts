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
    path: 'capture',
    component: PlannerTabsPage,
  },
  {
    path: 'plan',
    component: PlannerTabsPage,
  },
  {
    path: 'kanban',
    component: PlannerTabsPage,
  },
  {
    path: 'calendar',
    component: PlannerTabsPage,
  },
  {
    path: 'timeline',
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

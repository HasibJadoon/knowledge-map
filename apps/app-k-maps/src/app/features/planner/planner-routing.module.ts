import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CalendarPage } from './pages/calendar/calendar.page';
import { CapturePage } from './pages/capture/capture.page';
import { GoalsPage } from './pages/goals/goals.page';
import { PlanDetailPage } from './pages/plan-detail/plan-detail.page';
import { PlansPage } from './pages/plans/plans.page';
import { ReviewQueuePage } from './pages/review-queue/review-queue.page';
import { TaskDetailPage } from './pages/task-detail/task-detail.page';
import { TodayPage } from './pages/today/today.page';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'today' },
  { path: 'today', component: TodayPage },
  { path: 'plans', component: PlansPage },
  { path: 'plans/:id', component: PlanDetailPage },
  { path: 'tasks/:id', component: TaskDetailPage },
  { path: 'calendar', component: CalendarPage },
  { path: 'goals', component: GoalsPage },
  { path: 'review', component: ReviewQueuePage },
  { path: 'capture', component: CapturePage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlannerRoutingModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { PlannerRoutingModule } from './planner-routing.module';
import { PlannerBottomNavComponent } from './components/planner-bottom-nav/planner-bottom-nav.component';
import { CalendarPage } from './pages/calendar/calendar.page';
import { CapturePage } from './pages/capture/capture.page';
import { GoalsPage } from './pages/goals/goals.page';
import { PlanDetailPage } from './pages/plan-detail/plan-detail.page';
import { PlansPage } from './pages/plans/plans.page';
import { ReviewQueuePage } from './pages/review-queue/review-queue.page';
import { TaskDetailPage } from './pages/task-detail/task-detail.page';
import { TodayPage } from './pages/today/today.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    IonicModule,
    PlannerRoutingModule,
    PlannerBottomNavComponent,
  ],
  declarations: [
    TodayPage,
    PlansPage,
    PlanDetailPage,
    TaskDetailPage,
    CalendarPage,
    GoalsPage,
    ReviewQueuePage,
    CapturePage,
  ],
})
export class PlannerModule {}

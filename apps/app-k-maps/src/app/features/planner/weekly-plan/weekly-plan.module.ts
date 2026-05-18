import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PlannerCalendarPage } from '../pages/planner-calendar/planner-calendar.page';
import { PlannerCapturePage } from '../pages/planner-capture/planner-capture.page';
import { PlannerKanbanPage } from '../pages/planner-kanban/planner-kanban.page';
import { PlannerPlanPage } from '../pages/planner-plan/planner-plan.page';
import { PlannerReviewPage } from '../pages/planner-review/planner-review.page';
import { PlannerTimelinePage } from '../pages/planner-timeline/planner-timeline.page';
import { WeeklyPlanPageRoutingModule } from './weekly-plan-routing.module';
import { WeeklyPlanPage } from '../pages/weekly-plan/weekly-plan.page';
import { PlannerTabsPage } from '../pages/planner-tabs/planner-tabs.page';
import { PlannerTabBarComponent } from '../components/planner-tab-bar/planner-tab-bar.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    WeeklyPlanPageRoutingModule,
    PlannerTabBarComponent,
  ],
  declarations: [
    PlannerTabsPage,
    WeeklyPlanPage,
    PlannerCapturePage,
    PlannerPlanPage,
    PlannerKanbanPage,
    PlannerCalendarPage,
    PlannerTimelinePage,
    PlannerReviewPage,
  ],
})
export class WeeklyPlanPageModule {}

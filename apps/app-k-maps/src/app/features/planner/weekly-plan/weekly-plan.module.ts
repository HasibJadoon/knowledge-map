import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PlannerInboxPage } from '../pages/planner-inbox/planner-inbox.page';
import { PlannerKanbanPage } from '../pages/planner-kanban/planner-kanban.page';
import { PlannerLessonsPage } from '../pages/planner-lessons/planner-lessons.page';
import { PlannerPodcastPage } from '../pages/planner-podcast/planner-podcast.page';
import { PlannerReviewPage } from '../pages/planner-review/planner-review.page';
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
    PlannerKanbanPage,
    PlannerInboxPage,
    PlannerLessonsPage,
    PlannerPodcastPage,
    PlannerReviewPage,
  ],
})
export class WeeklyPlanPageModule {}

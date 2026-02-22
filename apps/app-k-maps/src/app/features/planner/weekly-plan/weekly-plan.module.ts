import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PlannerInboxPage } from './planner-inbox.page';
import { PlannerKanbanPage } from './planner-kanban.page';
import { PlannerLessonsPage } from './planner-lessons.page';
import { PlannerPodcastPage } from './planner-podcast.page';
import { PlannerReviewPage } from './planner-review.page';
import { PlannerTabsPage } from '../planner-tabs.page';
import { WeeklyPlanPageRoutingModule } from './weekly-plan-routing.module';
import { WeeklyPlanPage } from './weekly-plan.page';
import { AppIconTabsComponent } from '../../../shared/components/icon-tabs/icon-tabs.component';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, WeeklyPlanPageRoutingModule, AppIconTabsComponent],
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

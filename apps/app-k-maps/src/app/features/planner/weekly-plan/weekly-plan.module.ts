import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { WeeklyPlanPageRoutingModule } from './weekly-plan-routing.module';
import { WeeklyPlanPage } from './weekly-plan.page';

@NgModule({
  imports: [CommonModule, IonicModule, WeeklyPlanPageRoutingModule],
  declarations: [WeeklyPlanPage],
})
export class WeeklyPlanPageModule {}

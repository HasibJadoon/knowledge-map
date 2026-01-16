import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WeeklyPlanPage } from './weekly-plan.page';

const routes: Routes = [
  {
    path: '',
    component: WeeklyPlanPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WeeklyPlanPageRoutingModule {}

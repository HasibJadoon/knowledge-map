import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPage } from './pages/dashboard/dashboard.page';
import { DashboardSectionPage } from './pages/dashboard-section/dashboard-section.page';

const routes: Routes = [
  {
    path: ':section',
    component: DashboardSectionPage,
  },
  {
    path: '',
    component: DashboardPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardPageRoutingModule {}

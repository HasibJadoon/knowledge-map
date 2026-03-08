import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { DashboardPageRoutingModule } from './dashboard-routing.module';
import { DashboardCardGridComponent } from './dashboard-card-grid.component';
import { DashboardPage } from './dashboard.page';
import { DashboardSectionPage } from './dashboard-section.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, DashboardPageRoutingModule],
  declarations: [DashboardCardGridComponent, DashboardPage, DashboardSectionPage],
})
export class DashboardPageModule {}

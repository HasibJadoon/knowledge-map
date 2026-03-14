import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { DashboardPageRoutingModule } from './dashboard-routing.module';
import { DashboardCardGridComponent } from './components/dashboard-card-grid/dashboard-card-grid.component';
import { DashboardPage } from './pages/dashboard/dashboard.page';
import { DashboardSectionPage } from './pages/dashboard-section/dashboard-section.page';
import { NativeSearchbarComponent } from '../../shared/components/native-searchbar/native-searchbar.component';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule, DashboardPageRoutingModule, NativeSearchbarComponent],
  declarations: [DashboardCardGridComponent, DashboardPage, DashboardSectionPage],
})
export class DashboardPageModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { WorldviewLessonsPageRoutingModule } from './worldview-lessons-routing.module';
import { WorldviewLessonsPage } from './worldview-lessons.page';

@NgModule({
  imports: [CommonModule, IonicModule, WorldviewLessonsPageRoutingModule],
  declarations: [WorldviewLessonsPage],
})
export class WorldviewLessonsPageModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { WorldviewLessonsPageRoutingModule } from './worldview-lessons-routing.module';
import { WorldviewLessonsPage } from './worldview-lessons/worldview-lessons.page';
import { WorldviewEntryPage } from './worldview-entry/worldview-entry.page';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [CommonModule, IonicModule, FormsModule, WorldviewLessonsPageRoutingModule, WorldviewEntryPage],
  declarations: [WorldviewLessonsPage],
})
export class WorldviewLessonsPageModule {}

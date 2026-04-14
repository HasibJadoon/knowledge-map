import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ArabicLessonsPageRoutingModule } from './arabic-lessons-routing.module';
import { ArabicLessonsPage } from './arabic-lessons.page';

@NgModule({
  imports: [CommonModule, IonicModule, ArabicLessonsPageRoutingModule],
  declarations: [ArabicLessonsPage],
})
export class ArabicLessonsPageModule {}

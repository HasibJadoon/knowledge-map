import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ArabicMemoryPageRoutingModule } from './arabic-memory-routing.module';
import { ArabicMemoryPage } from './arabic-memory.page';

@NgModule({
  imports: [CommonModule, IonicModule, ArabicMemoryPageRoutingModule],
  declarations: [ArabicMemoryPage],
})
export class ArabicMemoryPageModule {}

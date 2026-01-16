import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ArabicRootsPageRoutingModule } from './arabic-roots-routing.module';
import { ArabicRootsPage } from './arabic-roots.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ArabicRootsPageRoutingModule],
  declarations: [ArabicRootsPage],
})
export class ArabicRootsPageModule {}

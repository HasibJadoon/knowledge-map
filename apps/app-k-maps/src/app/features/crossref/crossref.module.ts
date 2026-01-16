import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { CrossrefPageRoutingModule } from './crossref-routing.module';
import { CrossrefPage } from './crossref.page';

@NgModule({
  imports: [CommonModule, IonicModule, CrossrefPageRoutingModule],
  declarations: [CrossrefPage],
})
export class CrossrefPageModule {}

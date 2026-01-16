import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ArabicLexiconPageRoutingModule } from './arabic-lexicon-routing.module';
import { ArabicLexiconPage } from './arabic-lexicon.page';

@NgModule({
  imports: [CommonModule, IonicModule, ArabicLexiconPageRoutingModule],
  declarations: [ArabicLexiconPage],
})
export class ArabicLexiconPageModule {}

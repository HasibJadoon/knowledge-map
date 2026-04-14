import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ArabicVocabularyPageRoutingModule } from './arabic-vocabulary-routing.module';
import { ArabicVocabularyPage } from './arabic-vocabulary.page';

@NgModule({
  imports: [CommonModule, IonicModule, ArabicVocabularyPageRoutingModule],
  declarations: [ArabicVocabularyPage],
})
export class ArabicVocabularyPageModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ArabicVocabularyPage } from './arabic-vocabulary.page';

const routes: Routes = [
  {
    path: '',
    component: ArabicVocabularyPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ArabicVocabularyPageRoutingModule {}

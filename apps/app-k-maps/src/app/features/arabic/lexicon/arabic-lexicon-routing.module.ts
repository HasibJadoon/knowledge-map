import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ArabicLexiconPage } from './arabic-lexicon.page';

const routes: Routes = [
  {
    path: '',
    component: ArabicLexiconPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ArabicLexiconPageRoutingModule {}

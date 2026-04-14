import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ArabicRootsPage } from './arabic-roots.page';

const routes: Routes = [
  {
    path: '',
    component: ArabicRootsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ArabicRootsPageRoutingModule {}

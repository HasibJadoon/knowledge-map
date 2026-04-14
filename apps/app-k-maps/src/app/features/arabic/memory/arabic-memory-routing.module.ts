import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ArabicMemoryPage } from './arabic-memory.page';

const routes: Routes = [
  {
    path: '',
    component: ArabicMemoryPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ArabicMemoryPageRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorldviewLessonsPage } from './worldview-lessons.page';

const routes: Routes = [
  {
    path: '',
    component: WorldviewLessonsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorldviewLessonsPageRoutingModule {}

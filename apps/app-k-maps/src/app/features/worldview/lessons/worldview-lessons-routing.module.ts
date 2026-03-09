import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorldviewLessonsPage } from './worldview-lessons/worldview-lessons.page';
import { WorldviewEntryPage } from './worldview-entry/worldview-entry.page';

const routes: Routes = [
  {
    path: '',
    component: WorldviewLessonsPage,
  },
  {
    path: 'new',
    component: WorldviewEntryPage,
  },
  {
    path: ':id',
    component: WorldviewEntryPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorldviewLessonsPageRoutingModule {}

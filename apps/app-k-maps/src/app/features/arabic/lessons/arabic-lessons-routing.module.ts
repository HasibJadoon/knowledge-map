import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ArabicLessonsPage } from './arabic-lessons.page';

const routes: Routes = [
  {
    path: '',
    component: ArabicLessonsPage,
  },
  {
    path: ':id/study',
    loadComponent: () =>
      import('./ar-lesson-study/ar-lesson-study.page').then((m) => m.ArLessonStudyPage),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ArabicLessonsPageRoutingModule {}

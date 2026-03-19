import { Routes } from '@angular/router';

export const QURAN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../arabic/quran/quran-landing/quran-landing.component').then(
        (m) => m.QuranLandingComponent
      ),
    title: 'Quran — K-MAPS',
  },
  {
    path: 'lessons/:lessonId/study',
    loadComponent: () =>
      import('../arabic/quran/lessons/study/lesson-study.component').then(
        (m) => m.LessonStudyComponent
      ),
    title: 'Study — K-MAPS',
  },
  {
    path: 'lessons/:lessonId/edit',
    loadComponent: () =>
      import('../arabic/quran/lessons/edit/lesson-edit.component').then(
        (m) => m.LessonEditComponent
      ),
    title: 'Edit Lesson — K-MAPS',
  },
  {
    path: ':surahId/passage/:passageIndex',
    loadComponent: () =>
      import('../arabic/quran/passage/quran-passage.component').then(
        (m) => m.QuranPassageComponent
      ),
    title: 'Passage — K-MAPS',
  },
  {
    path: ':surahId',
    loadComponent: () =>
      import('../arabic/quran/text/quran-text.component').then(
        (m) => m.QuranTextComponent
      ),
    title: 'Quran — K-MAPS',
  },
];

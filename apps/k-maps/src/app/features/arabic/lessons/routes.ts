import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ar-lessons-page/ar-lessons-page.component').then(m => m.ArLessonsPageComponent),
    data: { title: 'Arabic Lessons' }
  },
  {
    path: 'quran',
    loadChildren: () => import('../../quran-lessons/routes').then(m => m.quranLessonRoutes)
  },
  {
    path: 'literature',
    loadChildren: () => import('../../literature-lessons/routes').then(m => m.literatureLessonRoutes)
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./ar-lesson-editor/ar-lesson-editor.component').then(m => m.ArLessonEditorComponent),
    data: { title: 'New Arabic Lesson' }
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./ar-lesson-editor/ar-lesson-editor.component').then(m => m.ArLessonEditorComponent),
    data: { title: 'Edit Arabic Lesson' }
  },
  {
    path: ':id/study',
    loadComponent: () =>
      import('./ar-lesson-study/ar-lesson-study.component').then(m => m.ArLessonStudyComponent),
    data: { title: 'Study Arabic Lesson' }
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./ar-lesson-view/ar-lesson-view.component').then(m => m.ArLessonViewComponent),
    data: { title: 'Arabic Lesson' }
  }
];

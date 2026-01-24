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
    loadChildren: () => import('./quran/routes').then(m => m.quranLessonRoutes)
  },
  {
    path: 'literature',
    loadChildren: () => import('./literature/routes').then(m => m.literatureLessonRoutes)
  }
];

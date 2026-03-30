import { Routes } from '@angular/router';

export const CONTENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./content-page/content.component').then((m) => m.ContentComponent),
    title: 'Content — K-MAPS',
  },
];

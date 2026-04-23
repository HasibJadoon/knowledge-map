import { Routes } from '@angular/router';

export const CONTENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/content/content.page').then(m => m.ContentPage),
    title: 'Content — K-MAPS',
  },
];

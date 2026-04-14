import { Routes } from '@angular/router';

export const CONTENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./content.page').then(m => m.ContentPage),
    title: 'Content — K-MAPS',
  },
];

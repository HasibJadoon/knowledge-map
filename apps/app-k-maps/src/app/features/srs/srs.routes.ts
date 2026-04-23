import { Routes } from '@angular/router';

export const SRS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/srs-home/srs-home.page').then(m => m.SrsHomePage),
    title: 'SRS Review — K-MAPS',
  },
];

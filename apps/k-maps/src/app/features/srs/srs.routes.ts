import { Routes } from '@angular/router';

export const SRS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./srs-home/srs-home.component').then((m) => m.SrsHomeComponent),
    title: 'SRS — K-MAPS',
  },
];

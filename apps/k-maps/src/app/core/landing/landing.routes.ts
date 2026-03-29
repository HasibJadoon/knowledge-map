import { Routes } from '@angular/router';

export const LANDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./landing.component').then((m) => m.LandingComponent),
    title: 'K-MAPS — Knowledge Command Center',
  },
];

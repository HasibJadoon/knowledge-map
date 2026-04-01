import { Routes } from '@angular/router';

export const LANDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../atlas/atlas-landing.component').then((m) => m.AtlasLandingComponent),
    title: 'K-MAPS — Atlas',
  },
];

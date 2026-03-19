import { Routes } from '@angular/router';

export const HUB_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./hub.component').then((m) => m.HubComponent),
    title: 'Hub — K-MAPS',
  },
];

import { Routes } from '@angular/router';

export const HUB_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./hub-home/hub-home.page').then(m => m.HubHomePage),
    title: 'Hub — K-MAPS',
  },
];

import { Routes } from '@angular/router';

export const ARABIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./arabic-home/arabic-home.component').then((m) => m.ArabicHomeComponent),
    title: 'Arabic — K-MAPS',
  },
];

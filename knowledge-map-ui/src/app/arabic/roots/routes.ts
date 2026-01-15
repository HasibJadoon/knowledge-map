import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./roots/roots.component').then(m => m.RootsComponent),
    data: { title: 'All Roots' }
  }
];

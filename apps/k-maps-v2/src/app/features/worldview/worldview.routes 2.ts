import { Routes } from '@angular/router';

export const WORLDVIEW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./worldview.component').then((m) => m.WorldviewComponent),
    title: 'Worldview — K-MAPS',
  },
];

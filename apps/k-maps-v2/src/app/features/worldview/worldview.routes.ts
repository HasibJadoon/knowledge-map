import { Routes } from '@angular/router';

export const WORLDVIEW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./worldview.component').then((m) => m.WorldviewComponent),
    title: 'Worldview — K-MAPS',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./worldview-home.component').then((m) => m.WorldviewHomeComponent),
        title: 'Worldview',
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./worldview-library.component').then((m) => m.WorldviewLibraryComponent),
        title: 'Library — Worldview',
      },
      {
        path: 'compare',
        loadComponent: () =>
          import('./worldview-compare.component').then((m) => m.WorldviewCompareComponent),
        title: 'Comparison — Worldview',
      },
      {
        path: 'brainstorm',
        loadComponent: () =>
          import('./worldview-brainstorm.component').then((m) => m.WorldviewBrainstormComponent),
        title: 'Brainstorm — Worldview',
      },
    ],
  },
];

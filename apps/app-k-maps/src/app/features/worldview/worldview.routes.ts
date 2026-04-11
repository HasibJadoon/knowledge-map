import { Routes } from '@angular/router';

export const WORLDVIEW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./worldview/worldview.page').then((m) => m.WorldviewPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./worldview-home/worldview-home.page').then((m) => m.WorldviewHomePage),
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./worldview-library/worldview-library.page').then((m) => m.WorldviewLibraryPage),
      },
      {
        path: 'library/:id',
        loadComponent: () =>
          import('./worldview-library-units/worldview-library-units.page').then(
            (m) => m.WorldviewLibraryUnitsPage,
          ),
      },
      {
        path: 'compare',
        loadComponent: () =>
          import('./worldview-compare/worldview-compare.page').then((m) => m.WorldviewComparePage),
      },
      {
        path: 'brainstorm',
        loadComponent: () =>
          import('./worldview-brainstorm/worldview-brainstorm.page').then((m) => m.WorldviewBrainstormPage),
      },
    ],
  },
];

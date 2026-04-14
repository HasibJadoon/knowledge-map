import { Routes } from '@angular/router';

export const WORLDVIEW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./worldview.page').then((m) => m.WorldviewPage),
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
        path: 'library/:sourceId/graph/:unitId',
        loadComponent: () =>
          import('./worldview-unit-graph/worldview-unit-graph.page').then(
            (m) => m.WorldviewUnitGraphPage,
          ),
      },
      {
        path: 'library/:id',
        loadComponent: () =>
          import('./worldview-library-units/worldview-library-units.page').then(
            (m) => m.WorldviewLibraryUnitsPage,
          ),
      },
      {
        path: 'library/:sourceId/read/:unitId',
        loadComponent: () =>
          import('./worldview-unit-reader/worldview-unit-reader.page').then(
            (m) => m.WorldviewUnitReaderPage,
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

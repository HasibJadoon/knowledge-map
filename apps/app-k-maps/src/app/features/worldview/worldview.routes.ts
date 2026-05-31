import { Routes } from '@angular/router';

export const WORLDVIEW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/worldview-page/worldview.page').then((m) => m.WorldviewPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/worldview-home/worldview-home.page').then((m) => m.WorldviewHomePage),
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./pages/worldview-library/worldview-library.page').then((m) => m.WorldviewLibraryPage),
      },
      {
        path: 'library/:sourceId/graph/:unitId',
        loadComponent: () =>
          import('./pages/worldview-unit-graph/worldview-unit-graph.page').then(
            (m) => m.WorldviewUnitGraphPage,
          ),
      },
      {
        path: 'library/:id',
        loadComponent: () =>
          import('./pages/worldview-library-units/worldview-library-units.page').then(
            (m) => m.WorldviewLibraryUnitsPage,
          ),
      },
      {
        path: 'library/:sourceId/read/:unitId',
        loadComponent: () =>
          import('./pages/worldview-unit-reader/worldview-unit-reader.page').then(
            (m) => m.WorldviewUnitReaderPage,
          ),
      },
      {
        path: 'library/:sourceId/timeline/:unitId',
        loadComponent: () =>
          import('./pages/worldview-timeline/worldview-timeline.page').then(
            (m) => m.WorldviewTimelinePage,
          ),
      },
      {
        path: 'compare',
        loadComponent: () =>
          import('./pages/worldview-compare/worldview-compare.page').then((m) => m.WorldviewComparePage),
      },
      {
        path: 'brainstorm',
        loadComponent: () =>
          import('./pages/worldview-brainstorm/worldview-brainstorm.page').then((m) => m.WorldviewBrainstormPage),
      },
    ],
  },
];

import { Routes } from '@angular/router';

export const WORLDVIEW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./worldview/worldview.component').then((m) => m.WorldviewComponent),
    title: 'Worldview — K-MAPS',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./worldview-home/worldview-home.component').then((m) => m.WorldviewHomeComponent),
        title: 'Worldview',
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./worldview-library/worldview-library.component').then(
            (m) => m.WorldviewLibraryComponent,
          ),
        title: 'Library — Worldview',
      },
      {
        path: 'library/:sourceId/graph/:unitId',
        loadComponent: () =>
          import('./worldview-unit-graph/worldview-unit-graph.component').then(
            (m) => m.WorldviewUnitGraphComponent,
          ),
        title: 'Graph — Worldview',
      },
      {
        path: 'library/:id',
        loadComponent: () =>
          import('./worldview-library-units/worldview-library-units.component').then(
            (m) => m.WorldviewLibraryUnitsComponent,
          ),
        title: 'Reader — Worldview',
      },
      {
        path: 'compare',
        loadComponent: () =>
          import('./worldview-compare/worldview-compare.component').then(
            (m) => m.WorldviewCompareComponent,
          ),
        title: 'Comparison — Worldview',
      },
      {
        path: 'brainstorm',
        loadComponent: () =>
          import('./worldview-brainstorm/worldview-brainstorm.component').then(
            (m) => m.WorldviewBrainstormComponent,
          ),
        title: 'Brainstorm — Worldview',
      },
    ],
  },
];

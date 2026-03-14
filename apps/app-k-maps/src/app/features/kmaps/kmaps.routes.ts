import { Routes } from '@angular/router';

import { KmapsTabsPage } from './pages/tabs/kmaps-tabs.page';

export const KMAPS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'library',
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./kmaps-library/pages/library-page/library-page').then((m) => m.LibraryPage),
  },
  {
    path: 'sources/new',
    loadComponent: () =>
      import('./kmaps-sources/pages/source-detail-page/source-detail-page').then((m) => m.SourceDetailPage),
  },
  {
    path: 'sources/:sourceId',
    loadComponent: () =>
      import('./kmaps-sources/pages/source-detail-page/source-detail-page').then((m) => m.SourceDetailPage),
  },
  {
    path: 'sources/:sourceId/units/:unitId',
    loadComponent: () =>
      import('./kmaps-sources/pages/source-unit-page/source-unit-page').then((m) => m.SourceUnitPage),
  },
  {
    path: '',
    component: KmapsTabsPage,
    children: [
      {
        path: 'concepts/:conceptId',
        loadComponent: () =>
          import('./kmaps-concepts/pages/concept-detail-page/concept-detail-page').then((m) => m.ConceptDetailPage),
      },
      {
        path: 'claims/new',
        loadComponent: () =>
          import('./kmaps-claims/pages/claim-editor-page/claim-editor-page').then((m) => m.ClaimEditorPage),
      },
      {
        path: 'claims/:claimId',
        loadComponent: () =>
          import('./kmaps-claims/pages/claim-editor-page/claim-editor-page').then((m) => m.ClaimEditorPage),
      },
      {
        path: 'content/new',
        loadComponent: () =>
          import('./kmaps-content/pages/content-builder-page/content-builder-page').then((m) => m.ContentBuilderPage),
      },
      {
        path: 'content/:contentId',
        loadComponent: () =>
          import('./kmaps-content/pages/content-builder-page/content-builder-page').then((m) => m.ContentBuilderPage),
      },
    ],
  },
];

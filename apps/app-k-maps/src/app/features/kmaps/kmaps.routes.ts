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
      import('./kmaps-sources/pages/unit-detail-page/unit-detail-page').then((m) => m.UnitDetailPage),
  },
  {
    path: '',
    component: KmapsTabsPage,
    children: [
      {
        path: 'sources/:sourceId/units/:unitId/read',
        loadComponent: () =>
          import('./kmaps-reader/pages/reader-page/reader-page').then((m) => m.ReaderPage),
      },
      {
        path: 'sources/:sourceId/units/:unitId/capture',
        loadComponent: () =>
          import('./kmaps-notes/pages/quick-capture-note-page/quick-capture-note-page').then((m) => m.QuickCaptureNotePage),
      },
      {
        path: 'sources/:sourceId/notes',
        loadComponent: () =>
          import('./kmaps-notes/pages/notes-list-page/notes-list-page').then((m) => m.NotesListPage),
      },
      {
        path: 'sources/:sourceId/units/:unitId/notes',
        loadComponent: () =>
          import('./kmaps-notes/pages/notes-list-page/notes-list-page').then((m) => m.NotesListPage),
      },
      {
        path: 'sources/:sourceId/distill',
        loadComponent: () =>
          import('./kmaps-distill/pages/distill-page/distill-page').then((m) => m.DistillPage),
      },
      {
        path: 'sources/:sourceId/units/:unitId/distill',
        loadComponent: () =>
          import('./kmaps-distill/pages/distill-page/distill-page').then((m) => m.DistillPage),
      },
      {
        path: 'sources/:sourceId/units/:unitId/claim',
        loadComponent: () =>
          import('./kmaps-claims/pages/claim-editor-page/claim-editor-page').then((m) => m.ClaimEditorPage),
      },
      {
        path: 'sources/:sourceId/units/:unitId/concepts',
        loadComponent: () =>
          import('./kmaps-concepts/pages/concept-detail-page/concept-detail-page').then((m) => m.ConceptDetailPage),
      },
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

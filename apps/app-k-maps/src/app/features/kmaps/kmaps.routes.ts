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
    path: 'source/:sourceId',
    loadComponent: () =>
      import('./kmaps-sources/pages/source-detail-page/source-detail-page').then((m) => m.SourceDetailPage),
  },
  {
    path: 'source/:sourceId/unit/:unitId/workspace',
    loadComponent: () =>
      import('./kmaps-sources/pages/wv-unit-workspace/wv-unit-workspace.page').then((m) => m.WvUnitWorkspacePage),
  },
  {
    path: 'source/:sourceId/unit/:unitId',
    loadComponent: () =>
      import('./kmaps-sources/pages/source-unit-page/source-unit-page').then((m) => m.SourceUnitPage),
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
    path: 'sources/:sourceId/units/:unitId/workspace',
    loadComponent: () =>
      import('./kmaps-sources/pages/wv-unit-workspace/wv-unit-workspace.page').then((m) => m.WvUnitWorkspacePage),
  },
  {
    path: 'sources/:sourceId/units/:unitId',
    loadComponent: () =>
      import('./kmaps-sources/pages/source-unit-page/source-unit-page').then((m) => m.SourceUnitPage),
  },
  {
    path: 'distill/start/:unitId',
    loadComponent: () =>
      import('./kmaps-distill/pages/wv-distill-start/wv-distill-start.page').then((m) => m.WvDistillStartPage),
  },
  {
    path: 'distill/batch/:batchId',
    loadComponent: () =>
      import('./kmaps-distill/pages/wv-distill-builder/wv-distill-builder.page').then((m) => m.WvDistillBuilderPage),
  },
  {
    path: 'suggestions/:batchId',
    loadComponent: () =>
      import('./kmaps-distill/pages/wv-suggestions/wv-suggestions.page').then((m) => m.WvSuggestionsPage),
  },
  {
    path: 'approval/:suggestionId',
    loadComponent: () =>
      import('./kmaps-distill/pages/wv-node-approval/wv-node-approval.page').then((m) => m.WvNodeApprovalPage),
  },
  {
    path: 'document/create',
    loadComponent: () =>
      import('./kmaps-content/pages/wv-document-editor/wv-document-editor.page').then((m) => m.WvDocumentEditorPage),
  },
  {
    path: 'planner/:unitId',
    loadComponent: () =>
      import('./kmaps-planner/pages/wv-planner/wv-planner.page').then((m) => m.WvPlannerPage),
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

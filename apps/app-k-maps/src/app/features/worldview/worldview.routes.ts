import { Routes } from '@angular/router';

import { AdminGuard } from '../../core/auth/admin.guard';
import { KmapsTabsPage } from '../kmaps/pages/tabs/kmaps-tabs.page';

export const WORLDVIEW_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./worldview-home/worldview-home.page').then((m) => m.WorldviewHomePage),
  },
  {
    // Legacy desktop-style deep link.
    path: 'library/:sourceId',
    redirectTo: 'sources/:sourceId',
    pathMatch: 'full',
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./worldview-library/worldview-library.page').then((m) => m.WorldviewLibraryPage),
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
  {
    path: 'source/:sourceId',
    loadComponent: () =>
      import('../kmaps/kmaps-sources/pages/source-detail-page/source-detail-page').then((m) => m.SourceDetailPage),
  },
  {
    path: 'source/:sourceId/content',
    loadComponent: () =>
      import('../kmaps/kmaps-sources/pages/source-content-page/source-content-page').then((m) => m.SourceContentPage),
  },
  {
    path: 'source/:sourceId/unit/:unitId/workspace',
    loadComponent: () =>
      import('../kmaps/kmaps-sources/pages/wv-unit-workspace/wv-unit-workspace.page').then((m) => m.WvUnitWorkspacePage),
  },
  {
    path: 'source/:sourceId/unit/:unitId',
    loadComponent: () =>
      import('../kmaps/kmaps-sources/pages/source-unit-page/source-unit-page').then((m) => m.SourceUnitPage),
  },
  {
    path: 'source/:sourceId/unit/:unitId/content',
    loadComponent: () =>
      import('../kmaps/kmaps-sources/pages/source-content-page/source-content-page').then((m) => m.SourceContentPage),
  },
  {
    path: 'sources/new',
    loadComponent: () =>
      import('../kmaps/kmaps-sources/pages/source-detail-page/source-detail-page').then((m) => m.SourceDetailPage),
  },
  {
    path: 'sources/:sourceId',
    loadComponent: () =>
      import('./worldview-source/worldview-source.page').then((m) => m.WorldviewSourcePage),
  },
  {
    path: 'sources/:sourceId/content',
    loadComponent: () =>
      import('../kmaps/kmaps-sources/pages/source-content-page/source-content-page').then((m) => m.SourceContentPage),
  },
  {
    path: 'sources/:sourceId/units/:unitId/workspace',
    loadComponent: () =>
      import('../kmaps/kmaps-sources/pages/wv-unit-workspace/wv-unit-workspace.page').then((m) => m.WvUnitWorkspacePage),
  },
  {
    path: 'sources/:sourceId/units/:unitId',
    loadComponent: () =>
      import('../kmaps/kmaps-sources/pages/source-unit-page/source-unit-page').then((m) => m.SourceUnitPage),
  },
  {
    path: 'sources/:sourceId/units/:unitId/content',
    loadComponent: () =>
      import('../kmaps/kmaps-sources/pages/source-content-page/source-content-page').then((m) => m.SourceContentPage),
  },
  {
    path: 'distill/start/:unitId',
    canActivate: [AdminGuard],
    loadComponent: () =>
      import('../kmaps/kmaps-distill/pages/wv-distill-start/wv-distill-start.page').then((m) => m.WvDistillStartPage),
  },
  {
    path: 'distill/batch/:batchId',
    canActivate: [AdminGuard],
    loadComponent: () =>
      import('../kmaps/kmaps-distill/pages/wv-distill-builder/wv-distill-builder.page').then((m) => m.WvDistillBuilderPage),
  },
  {
    path: 'suggestions/:batchId',
    canActivate: [AdminGuard],
    loadComponent: () =>
      import('../kmaps/kmaps-distill/pages/wv-suggestions/wv-suggestions.page').then((m) => m.WvSuggestionsPage),
  },
  {
    path: 'approval/:suggestionId',
    canActivate: [AdminGuard],
    loadComponent: () =>
      import('../kmaps/kmaps-distill/pages/wv-node-approval/wv-node-approval.page').then((m) => m.WvNodeApprovalPage),
  },
  {
    path: 'document/create',
    loadComponent: () =>
      import('../kmaps/kmaps-content/pages/wv-document-editor/wv-document-editor.page').then((m) => m.WvDocumentEditorPage),
  },
  {
    path: 'planner/:unitId',
    loadComponent: () =>
      import('../kmaps/kmaps-planner/pages/wv-planner/wv-planner.page').then((m) => m.WvPlannerPage),
  },
  {
    path: '',
    component: KmapsTabsPage,
    children: [
      {
        path: 'concepts/:conceptId',
        loadComponent: () =>
          import('../kmaps/kmaps-concepts/pages/concept-detail-page/concept-detail-page').then((m) => m.ConceptDetailPage),
      },
      {
        path: 'claims/new',
        loadComponent: () =>
          import('../kmaps/kmaps-claims/pages/claim-editor-page/claim-editor-page').then((m) => m.ClaimEditorPage),
      },
      {
        path: 'claims/:claimId',
        loadComponent: () =>
          import('../kmaps/kmaps-claims/pages/claim-editor-page/claim-editor-page').then((m) => m.ClaimEditorPage),
      },
      {
        path: 'content/new',
        loadComponent: () =>
          import('../kmaps/kmaps-content/pages/content-builder-page/content-builder-page').then((m) => m.ContentBuilderPage),
      },
      {
        path: 'content/:contentId',
        loadComponent: () =>
          import('../kmaps/kmaps-content/pages/content-builder-page/content-builder-page').then((m) => m.ContentBuilderPage),
      },
    ],
  },
];

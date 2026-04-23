import { Routes } from '@angular/router';

export const DOCS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/docs-list/docs-list.page').then(m => m.DocsListPage),
  },
  {
    path: ':docId',
    loadComponent: () =>
      import('./pages/doc-editor/doc-editor.page').then(m => m.DocEditorPage),
  }
];

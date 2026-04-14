import { Routes } from '@angular/router';

export const DOCS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./docs-list/docs-list.page').then(m => m.DocsListPage),
  },
  {
    path: ':docId',
    loadComponent: () =>
      import('./doc-editor/doc-editor.page').then(m => m.DocEditorPage),
  }
];

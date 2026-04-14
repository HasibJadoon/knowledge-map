import { Routes } from '@angular/router';

export const DOCS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./docs-shell/docs-shell.component').then(m => m.DocsShellComponent),
    children: [
      {
        path: ':docId',
        loadComponent: () =>
          import('./doc-editor/doc-editor.component').then(m => m.DocEditorComponent)
      }
    ]
  }
];

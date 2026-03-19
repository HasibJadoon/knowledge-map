import { Routes } from '@angular/router';

export const WORKSPACE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./workspace.component').then((m) => m.WorkspaceComponent),
    title: 'Workspace — K-MAPS',
  },
];

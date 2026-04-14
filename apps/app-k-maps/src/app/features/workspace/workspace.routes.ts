import { Routes } from '@angular/router';

export const WORKSPACE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./workspace-home/workspace-home.page').then(m => m.WorkspaceHomePage),
    title: 'Workspace — K-MAPS',
  },
];

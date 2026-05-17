import { Routes } from '@angular/router';

export const WORKSPACE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/workspace-home/workspace-home.page').then(m => m.WorkspaceHomePage),
    title: 'Workspace — K-MAPS',
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/workspace-admin/workspace-admin.page').then(m => m.WorkspaceAdminPage),
    title: 'Administration — K-MAPS',
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/workspace-detail/workspace-detail.component').then(m => m.WorkspaceDetailComponent),
    title: 'Workspace Detail — K-MAPS',
  },
];
